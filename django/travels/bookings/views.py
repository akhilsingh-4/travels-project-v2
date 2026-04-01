import logging
import secrets
from urllib.parse import quote

import requests
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from .payments import client
from django.conf import settings
from .utils import Util
from .models import Bus, Seat, Booking, Payment, Ticket, Profile
from .redis_service import LocalRedisOTPService
from .rate_limit_service import allow_otp_request
from .serializers import (
    UserRegisterSerializer,
    BusSerializers,
    BookingSerializer,
    UserProfileSerializer,
    PaymentSerializer,
    AdminBusSerializer,
    AdminRecentBookingSerializer,
    RequestOTPSerializer,
    VerifyOTPSerializer,
)
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from django.http import HttpResponse
import qrcode
from django.shortcuts import render

from django.utils import timezone
from datetime import timedelta

from io import BytesIO

from .permissions import IsAdmin


from rest_framework.parsers import MultiPartParser, FormParser

from django.db.models import Sum
from datetime import date as date

logger = logging.getLogger(__name__)


def _tomtom_key_configured():
    return bool(getattr(settings, "TOMTOM_API_KEY", ""))


def _build_location_queries(place_name):
    normalized = place_name.strip()
    queries = []

    if "," not in normalized:
        queries.append(f"{normalized}, India")
    queries.append(normalized)

    seen = set()
    unique_queries = []
    for query in queries:
        key = query.lower()
        if key not in seen:
            seen.add(key)
            unique_queries.append(query)

    return unique_queries


def _geocode_location(place_name):
    for query in _build_location_queries(place_name):
        response = requests.get(
            f"https://api.tomtom.com/search/2/geocode/{quote(query)}.json",
            params={
                "key": settings.TOMTOM_API_KEY,
                "limit": 1,
                "countrySet": "IN",
                "view": "IN",
                "language": "en-GB",
            },
            timeout=10,
        )
        response.raise_for_status()

        results = response.json().get("results", [])
        if not results:
            continue

        top_match = results[0]
        position = top_match.get("position") or {}
        if "lat" not in position or "lon" not in position:
            continue

        return {
            "label": top_match.get("address", {}).get("freeformAddress") or query,
            "position": {
                "lat": position["lat"],
                "lon": position["lon"],
            },
        }

    raise ValueError(f"No geocoding result found for '{place_name}'")


def _fetch_route_points(origin, destination):
    route_response = requests.get(
        "https://api.tomtom.com/routing/1/calculateRoute/"
        f"{origin['position']['lat']},{origin['position']['lon']}:"
        f"{destination['position']['lat']},{destination['position']['lon']}/json",
        params={
            "key": settings.TOMTOM_API_KEY,
            "traffic": "true",
            "routeType": "fastest",
            "travelMode": "car",
        },
        timeout=10,
    )
    route_response.raise_for_status()

    routes = route_response.json().get("routes", [])
    if not routes:
        raise ValueError("TomTom did not return a route")

    route = routes[0]
    leg = (route.get("legs") or [{}])[0]
    points = leg.get("points") or []
    if len(points) < 2:
        raise ValueError("TomTom returned an incomplete route geometry")

    summary = route.get("summary") or {}
    return {
        "origin": origin,
        "destination": destination,
        "distance_meters": summary.get("lengthInMeters"),
        "points": [
            {
                "lat": point["latitude"],
                "lon": point["longitude"],
            }
            for point in points
            if "latitude" in point and "longitude" in point
        ],
    }


def _route_bbox(points, padding_ratio=0.12):
    lats = [point["lat"] for point in points]
    lons = [point["lon"] for point in points]

    min_lat = min(lats)
    max_lat = max(lats)
    min_lon = min(lons)
    max_lon = max(lons)

    lat_padding = max((max_lat - min_lat) * padding_ratio, 0.05)
    lon_padding = max((max_lon - min_lon) * padding_ratio, 0.05)

    return {
        "min_lat": max(min_lat - lat_padding, -85),
        "max_lat": min(max_lat + lat_padding, 85),
        "min_lon": max(min_lon - lon_padding, -180),
        "max_lon": min(max_lon + lon_padding, 180),
    }


def _route_center_and_zoom(route_bbox):
    center_lon = (route_bbox["min_lon"] + route_bbox["max_lon"]) / 2
    center_lat = (route_bbox["min_lat"] + route_bbox["max_lat"]) / 2
    lon_span = max(route_bbox["max_lon"] - route_bbox["min_lon"], 0.01)

    if lon_span > 12:
        zoom = 5
    elif lon_span > 6:
        zoom = 6
    elif lon_span > 3:
        zoom = 7
    elif lon_span > 1.5:
        zoom = 8
    elif lon_span > 0.75:
        zoom = 9
    elif lon_span > 0.35:
        zoom = 10
    else:
        zoom = 11

    return {
        "center": f"{center_lon},{center_lat}",
        "zoom": zoom,
    }


def _request_static_map(params, timeout=15):
    response = requests.get(
        "https://api.tomtom.com/map/1/staticimage",
        params=params,
        timeout=timeout,
        headers={"User-Agent": "TravelsApp/1.0"},
    )
    response.raise_for_status()
    return response.content, response.headers.get("Content-Type", "image/jpeg")


def _fetch_route_map_image(route_bbox, width=900, height=360):
    center_config = _route_center_and_zoom(route_bbox)

    base_params = {
        "key": settings.TOMTOM_API_KEY,
        "width": width,
        "height": height,
        "layer": "basic",
        "style": "main",
        "view": "Unified",
        "language": "en-GB",
        "format": "jpg",
    }

    bbox_params = {
        **base_params,
        "zoom": center_config["zoom"],
        "bbox": ",".join(
            [
                str(route_bbox["min_lon"]),
                str(route_bbox["min_lat"]),
                str(route_bbox["max_lon"]),
                str(route_bbox["max_lat"]),
            ]
        ),
    }

    try:
        return _request_static_map(bbox_params)
    except requests.RequestException as exc:
        response = getattr(exc, "response", None)
        if response is not None:
            logger.warning(
                "Static map bbox request failed: status=%s body=%s",
                response.status_code,
                response.text[:500],
            )

        center_params = {
            **base_params,
            "center": center_config["center"],
            "zoom": center_config["zoom"],
        }

        try:
            return _request_static_map(center_params)
        except requests.RequestException as center_exc:
            center_response = getattr(center_exc, "response", None)
            if center_response is not None:
                logger.warning(
                    "Static map center request failed: status=%s body=%s",
                    center_response.status_code,
                    center_response.text[:500],
                )
            raise


def generate_ticket_pdf_bytes(ticket):
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    card_x = 40
    card_y = 120
    card_w = width - 80
    card_h = height - 200

    p.setFillColorRGB(0.05, 0.1, 0.15)
    p.roundRect(card_x, card_y, card_w, card_h, 20, fill=1)

    p.setFillColor(colors.white)
    p.setFont("Helvetica-Bold", 20)
    p.drawString(card_x + 30, height - 100, "Travels App - Bus Ticket")

    p.setFont("Helvetica", 11)
    p.setFillColor(colors.lightgrey)
    p.drawString(card_x + 30, height - 125, f"Ticket ID: #{ticket.id}")

    p.setStrokeColor(colors.grey)
    p.line(card_x + 20, height - 145, card_x + card_w - 20, height - 145)

    y = height - 180
    gap = 28

    def field(label, value):
        nonlocal y
        p.setFillColor(colors.cyan)
        p.setFont("Helvetica-Bold", 11)
        p.drawString(card_x + 30, y, label)
        p.setFillColor(colors.white)
        p.setFont("Helvetica", 12)
        p.drawString(card_x + 180, y, str(value))
        y -= gap

    booking = ticket.booking

    field("Passenger", booking.user.username)
    field("Bus", booking.bus.bus_name)
    field("Route", f"{booking.bus.origin} → {booking.bus.destination}")
    field("Seat", booking.seat.seat_number)
    field("Journey Date", booking.journey_date)
    field("Start Time", booking.bus.start_time)
    field("Reach Time", booking.bus.reach_time)
    field("Price", f"₹ {booking.bus.price}")
    field("Booked At", booking.booking_time.strftime("%d %b %Y, %I:%M %p"))

    verify_url = f"https://travels-backend-ge3s.onrender.com/api/tickets/verify/{ticket.id}/"
    qr_img = qrcode.make(verify_url).convert("RGB")
    p.drawInlineImage(qr_img, card_x + card_w - 150, card_y + 50, 110, 110)

    p.setFillColor(colors.lightgrey)
    p.setFont("Helvetica", 9)
    p.drawString(card_x + card_w - 155, card_y + 40, "Scan to verify ticket")

    p.setFillColor(colors.lightgrey)
    p.setFont("Helvetica-Oblique", 10)
    p.drawString(card_x + 30, card_y + 30, "Show this ticket while boarding. Have a safe journey!")

    p.showPage()
    p.save()

    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


class BookingTicketView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, booking_id):
        booking = Booking.objects.select_related(
            "bus", "seat", "user"
        ).get(id=booking_id, user=request.user)

        ticket, _ = Ticket.objects.get_or_create(
            booking=booking,
            defaults={"user": request.user}
        )

        pdf_bytes = generate_ticket_pdf_bytes(ticket)

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="ticket_{ticket.id}.pdf"'

        return response


class TicketVerifyView(APIView):
    permission_classes = []

    def get(self, request, ticket_id):
        try:
            ticket = Ticket.objects.select_related("booking", "booking__bus", "booking__seat", "user").get(id=ticket_id)
        except Ticket.DoesNotExist:
            return Response({"valid": False, "message": "Ticket not found"}, status=404)

        if ticket.status == "REFUNDED":
            return Response({"valid": False, "message": "Ticket refunded"}, status=400)

        if ticket.status == "USED":
            return Response({"valid": False, "message": "Ticket already used"}, status=400)

      
        today = timezone.localdate()
        journey_date = ticket.booking.journey_date
        start_time = ticket.booking.bus.start_time

        now = timezone.localtime().time()

        if journey_date < today:
            return Response({"valid": False, "message": "Ticket expired (past date)"}, status=400)

        if journey_date == today and start_time < now:
            return Response({"valid": False, "message": "Ticket expired (bus already departed)"}, status=400)
       

        return Response({
            "valid": True,
            "ticket_id": ticket.id,
            "status": ticket.status,     
            "passenger": ticket.user.username,
            "bus": ticket.booking.bus.bus_name,
            "route": f"{ticket.booking.bus.origin} → {ticket.booking.bus.destination}",
            "seat": ticket.booking.seat.seat_number,
            "journey_date": str(ticket.booking.journey_date),
            "start_time": str(ticket.booking.bus.start_time),
            "reach_time": str(ticket.booking.bus.reach_time),
        })

class MarkTicketUsedView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, ticket_id):
        try:
            ticket = Ticket.objects.get(id=ticket_id)
        except Ticket.DoesNotExist:
            return Response({"error": "Ticket not found"}, status=404)

        if ticket.status == "USED":
            return Response({"message": "Ticket already marked as USED"}, status=400)

        ticket.status = "USED"
        ticket.save()

        return Response({"message": "Ticket marked as USED"})



class RefundTicketView(APIView):
    permission_classes = [IsAuthenticated]
    

    def post(self, request, booking_id):
        try:
            booking = Booking.objects.select_related("bus", "seat").get(
                id=booking_id,
                user=request.user
            )
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found"}, status=404)

        ticket, _ = Ticket.objects.get_or_create(
            booking=booking,
            defaults={"user": request.user}
        )

        if ticket.status == "REFUNDED":
            return Response({"error": "Ticket already refunded"}, status=400)

        payment = Payment.objects.filter(
            user=request.user,
            booking=booking,
            status="SUCCESS"
        ).first()

        if not payment:
            return Response({"error": "No successful payment found"}, status=400)

        try:

            refund = client.payment.refund(
                payment.razorpay_payment_id,
                {
                    "amount": payment.amount 
                }
            )
            print("Refund success:", refund)
        except Exception as e:
            print("Refund error:", str(e))
            return Response({"error": f"Refund failed: {str(e)}"}, status=400)

        with transaction.atomic():
            ticket.status = "REFUNDED"
            ticket.save()

            payment.status = "REFUNDED"
            payment.save()

            seat = booking.seat
            seat.is_booked = False
            seat.save()

            refund_amount = payment.amount / 100

            booking.delete()

     
        if request.user.email:
            try:
                Util.send_templated_email(
                    subject="Refund Successful – Travels App",
                    template_name="emails/refund_email.html",
                    context={
                        "username": request.user.username,
                        "bus_name": booking.bus.bus_name,
                        "origin": booking.bus.origin,
                        "destination": booking.bus.destination,
                        "seat_number": seat.seat_number,
                        "amount": refund_amount,
                        "booking_id": booking_id,
                    },
                    to_email=request.user.email,
                )
            except Exception as e:
                print("Refund email failed:", e)

        return Response({"message": "Refund processed successfully"})





class RegisterApiView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

            if user.email:
                try:
                    Util.send_templated_email(
                        subject="Welcome to Travels App",
                        template_name="emails/register.html",
                        context={
                            "username": user.username,
                            "link": "https://travels-project-v2.vercel.app/login",
                        },
                        to_email=user.email
                    )
                except Exception as e:
                    print("Email failed:", e)

            return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = []

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        user = authenticate(username=username, password=password)

        if not user:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user_id": user.id,
                "is_admin": user.is_staff,
            },
            status=status.HTTP_200_OK
        )


class RequestOTPView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = RequestOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not settings.ENABLE_LOCAL_REDIS:
            return Response(
                {"error": "OTP is not available in this environment"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if not LocalRedisOTPService.is_available():
            return Response(
                {"error": "Redis is not available"},  
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        email = serializer.validated_data["email"].strip().lower()
        if not allow_otp_request(email):
            return Response(
                {"error": "Too many OTP requests. Please try again later."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(
                {"message": "If this email exists, an OTP has been sent"},
                status=status.HTTP_200_OK,
            )

        otp = f"{secrets.randbelow(1000000):06d}"
        ttl_seconds = settings.OTP_TTL_SECONDS

        otp_stored = LocalRedisOTPService.set_otp(
            email=email,
            otp=otp,
            ttl_seconds=ttl_seconds,
        )
        if not otp_stored:
            logger.error("Failed to persist OTP in Redis for email=%s", email)
            return Response(
                {"error": "Redis is not available"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            Util.send_templated_email(
                subject="Your Travels App OTP",
                template_name="emails/otp_email.html",
                context={
                    "username": user.username,
                    "otp": otp,
                    "expiry_minutes": ttl_seconds // 60,
                },
                to_email=user.email,
            )
        except Exception:
            LocalRedisOTPService.delete_otp(email)
            logger.exception("Failed to send OTP email to user_id=%s", user.id)
            return Response(
                {"error": "Unable to send OTP email"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {"message": "If this email exists, an OTP has been sent"},
            status=status.HTTP_200_OK,
        )


class VerifyOTPView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not settings.ENABLE_LOCAL_REDIS:
            return Response(
                {"error": "OTP is not available in this environment"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if not LocalRedisOTPService.is_available():
            return Response(
                {"error": "Redis is not available"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        email = serializer.validated_data["email"].strip().lower()
        otp = serializer.validated_data["otp"]
                  
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(
                {"error": "Invalid OTP request"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stored_otp = LocalRedisOTPService.get_otp(email)
        if stored_otp is None:
            return Response(
                {"error": "OTP expired or not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if stored_otp != otp:
            return Response(
                {"error": "Invalid OTP"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile, _ = Profile.objects.get_or_create(user=user)
        profile.is_email_verified = True
        profile.save(update_fields=["is_email_verified"])
        LocalRedisOTPService.delete_otp(email)  

        return Response(
            {"message": "OTP verified successfully"},
            status=status.HTTP_200_OK,
        )


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            cached_data = LocalRedisOTPService.get_user_profile_cache(request.user.id)
            if cached_data:
                return Response(cached_data, status=status.HTTP_200_OK)

            Profile.objects.get_or_create(user=request.user)
            serializer = UserProfileSerializer(
                request.user,
                context={"request": request}
            )
            LocalRedisOTPService.set_user_profile_cache(
                user_id=request.user.id,
                data=serializer.data,
                ttl_seconds=settings.USER_CACHE_TTL_SECONDS,
            )
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception:
            logger.exception("Failed to load profile for user_id=%s", request.user.id)
            return Response(
                {"error": "Unable to load profile"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def put(self, request):
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            LocalRedisOTPService.delete_user_profile_cache(request.user.id)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class RequestPasswordResetView(APIView):
    permission_classes = []

    def post(self, request):
        email = request.data.get("email")

        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"message": "If this email exists, a reset link will be sent"}, status=status.HTTP_200_OK)

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = PasswordResetTokenGenerator().make_token(user)
        reset_link = f"https://trave ls-project-v2.vercel.app/reset-password/{uid}/{token}/"
        try:
            Util.send_templated_email(
                subject="Reset Your Password - Travels App",
                template_name="emails/reset_password.html",
                context={
                    "username": user.username,
                    "reset_link": reset_link,
                },
                to_email=user.email
            )
        except Exception as e:
            print("Password reset email failed:", e)

        return Response({"message": "If this email exists, a reset link will be sent"}, status=status.HTTP_200_OK)


class ConfirmPasswordResetView(APIView):
    permission_classes = []

    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")
        password = request.data.get("password")

        if not uid or not token or not password:
            return Response({"error": "uid, token and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(id=user_id)
        except Exception:
            return Response({"error": "Invalid reset link"}, status=status.HTTP_400_BAD_REQUEST)

        if not PasswordResetTokenGenerator().check_token(user, token):
            return Response({"error": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save()

        return Response({"message": "Password reset successful"}, status=status.HTTP_200_OK)


class CreatePaymentOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        seat_id = request.data.get("seat_id")
        journey_date = request.data.get("journey_date")

        if not seat_id:
            return Response({"error": "seat_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            try:
                seat = (
                    Seat.objects
                    .select_for_update()
                    .select_related("bus")
                    .get(id=seat_id)
                )
            except Seat.DoesNotExist:
                return Response({"error": "Invalid seat"}, status=status.HTTP_400_BAD_REQUEST)

  
            if journey_date and Booking.objects.filter(
                bus=seat.bus,
                seat=seat,
                journey_date=journey_date
            ).exists():
                return Response({"error": "Seat already booked for this date"}, status=400)

            if seat.is_held and seat.hold_expires_at:
                if seat.hold_expires_at > timezone.now():
                    return Response(
                        {"error": "Seat is temporarily held. Try again later."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                else:
     
                    seat.is_held = False
                    seat.hold_expires_at = None
                    seat.save()

            seat.is_held = True
            seat.hold_expires_at = timezone.now() + timedelta(minutes=5)
            seat.save()

        amount = int(seat.bus.price * 100)

        order = client.order.create({
            "amount": amount,
            "currency": "INR",
            "payment_capture": 1,
        })

        Payment.objects.create(
            user=request.user,
            razorpay_order_id=order["id"],
            amount=amount,
            status="CREATED"
        )

        return Response({
            "order_id": order["id"],
            "amount": amount,
            "currency": "INR",
            "key": settings.RAZORPAY_KEY_ID,
        })


class VerifyPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        payment_id = request.data.get("razorpay_payment_id")
        order_id = request.data.get("razorpay_order_id")
        signature = request.data.get("razorpay_signature")
        seat_id = request.data.get("seat_id")
        journey_date = request.data.get("journey_date")   

        if not journey_date:
            return Response({"error": "Journey date is required"}, status=400)

        if date.fromisoformat(journey_date) < timezone.localdate():
            return Response({"error": "Cannot book ticket for past date"}, status=400)
           


        try:
            client.utility.verify_payment_signature({
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature,
            })
        except Exception:
            return Response({"error": "Invalid payment signature"}, status=400)

        with transaction.atomic():
            try:
                payment = Payment.objects.select_for_update().get(
                    razorpay_order_id=order_id,
                    user=request.user
                )
            except Payment.DoesNotExist:
                return Response({"error": "Payment record not found"}, status=404)

            try:
                seat = (
                    Seat.objects
                    .select_for_update()
                    .select_related("bus")
                    .get(id=seat_id)
                )
            except Seat.DoesNotExist:
                return Response({"error": "Seat not found"}, status=404)

        
            if Booking.objects.filter(
                bus=seat.bus,
                seat=seat,
                journey_date=journey_date
            ).exists():
                return Response(  {"error": "Seat already booked for this date"}, status=400)



            if seat.hold_expires_at and seat.hold_expires_at < timezone.now():
                seat.is_held = False
                seat.hold_expires_at = None
                seat.save()
                return Response({"error": "Seat hold expired"}, status=400)

     
            booking = Booking.objects.create(
                user=request.user,
                bus=seat.bus,
                seat=seat,
                journey_date=journey_date
            )

            seat.is_held = False
            seat.hold_expires_at = None
            seat.save()


            payment.razorpay_payment_id = payment_id
            payment.razorpay_signature = signature
            payment.status = "SUCCESS"
            payment.booking = booking
            payment.save()

   
        ticket, _ = Ticket.objects.get_or_create(
            booking=booking,
            defaults={"user": request.user}
        )

        pdf_bytes = generate_ticket_pdf_bytes(ticket)

        if request.user.email:
            try:
                Util.send_templated_email(
                    subject="Your Bus Ticket – Travels App",
                    template_name="emails/ticket_email.html",
                    context={
                        "username": request.user.username,
                        "ticket_id": ticket.id,
                        "bus_name": booking.bus.bus_name,
                        "origin": booking.bus.origin,
                        "destination": booking.bus.destination, 
                        "seat_number": booking.seat.seat_number,
                        "start_time": booking.bus.start_time,
                        "reach_time": booking.bus.reach_time,
                    },
                    to_email=request.user.email,
                    attachments=[{
                        "filename": f"ticket_{ticket.id}.pdf",
                        "content": pdf_bytes,
                        "mimetype": "application/pdf",
                    }]
                )
            except Exception as e:
                print("Ticket email failed:", str(e)) 

        return Response({
            "message": "Payment verified and booking confirmed",
            "booking_id": booking.id
        })



class MyPaymentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payments = Payment.objects.filter(user=request.user).order_by("-created_at")
        serializer = PaymentSerializer(payments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PaymentStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        try:
            payment = Payment.objects.get(razorpay_order_id=order_id, user=request.user)
        except Payment.DoesNotExist:
            return Response({"error": "Payment not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = PaymentSerializer(payment)
        return Response(serializer.data, status=status.HTTP_200_OK)


class BusListCreateApiView(generics.ListAPIView):
    serializer_class = BusSerializers

    def get_queryset(self):
        queryset = Bus.objects.filter(is_active=True)
        origin = self.request.query_params.get("origin")
        destination = self.request.query_params.get("destination")

        if origin:
            queryset = queryset.filter(origin__icontains=origin)
        if destination:
            queryset = queryset.filter(destination__icontains=destination)

        return queryset

    def get_serializer_context(self):
        return {"request": self.request}


class BusDetailView(generics.RetrieveAPIView):
    queryset = Bus.objects.all()
    serializer_class = BusSerializers

    def get_serializer_context(self):
        return {"request": self.request}


class BusRouteMapView(APIView):
    permission_classes = []

    def get(self, request, pk):
        try:
            bus = Bus.objects.get(pk=pk, is_active=True)
        except Bus.DoesNotExist:
            return Response({"error": "Bus not found"}, status=status.HTTP_404_NOT_FOUND)

        if not _tomtom_key_configured():
            return Response(
                {"error": "Map API key is not configured"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            origin = _geocode_location(bus.origin)
            destination = _geocode_location(bus.destination)
            route_data = _fetch_route_points(origin, destination)
            route_bbox = _route_bbox(route_data["points"])
            image_bytes, content_type = _fetch_route_map_image(route_bbox)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except requests.RequestException as exc:
            logger.exception("Route map lookup failed for bus_id=%s", bus.id)
            upstream_response = getattr(exc, "response", None)
            error_message = "Unable to load map right now"
            if upstream_response is not None and upstream_response.text:
                error_message = upstream_response.text[:500]
            return Response(
                {"error": error_message},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return HttpResponse(image_bytes, content_type=content_type)
 




class CancelBookingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        booking_id = request.data.get("booking_id")

        if not booking_id:
            return Response({"error": "Booking id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            booking = Booking.objects.select_related("seat", "bus").get(
                id=booking_id,
                user=request.user
            )
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found"}, status=404)
        seat = booking.seat
        seat.is_booked = False
        seat.save()

        if request.user.email:
            try:
                Util.send_templated_email(
                    subject="Booking Cancelled - Travels App",
                    template_name="emails/booking_cancelled.html",
                    context={
                        "username": request.user.username,
                        "bus_name": booking.bus.bus_name,
                        "origin": booking.bus.origin,
                        "destination": booking.bus.destination,
                        "seat_number": seat.seat_number,
                        "start_time": booking.bus.start_time,
                        "reach_time": booking.bus.reach_time,
                    },
                    to_email=request.user.email
                )
            except Exception as e:
                print("Cancel email failed:", e)

        booking.delete()
        return Response({"message": "Booking cancelled successfully"}, status=status.HTTP_200_OK)


class MyBookingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        Booking.objects.filter(
            user=request.user,
            journey_date__lt=today,
            status=Booking.STATUS_CONFIRMED
        ).update(status=Booking.STATUS_EXPIRED)

        bookings = Booking.objects.filter(user=request.user)
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminBusListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        buses = Bus.objects.all().order_by("-id")
        serializer = AdminBusSerializer(buses, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = AdminBusSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminBusDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def put(self, request, pk):
        try:
            bus = Bus.objects.get(pk=pk)
        except Bus.DoesNotExist:
            return Response({"error": "Bus not found"}, status=404)

        serializer = AdminBusSerializer(bus, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        try:
            bus = Bus.objects.get(pk=pk)
        except Bus.DoesNotExist:
            return Response({"error": "Bus not found"}, status=404)

        bus.delete()
        return Response({"message": "Bus deleted successfully"})
    

class AdminTotalBookingsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        total_bookigs = Booking.objects.count()
        return Response({
            "total_bookings":total_bookigs
        }, status=status.HTTP_200_OK)


class AdminTotalRevenueView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        total_revenue = Payment.objects.filter(status ="SUCCESS").aggregate(total=Sum("amount"))["total"] or 0

        return Response({
            "total_revenue":total_revenue/100
        }, status=status.HTTP_200_OK)
    


class AdminActiveBusesView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        
        active_buses = Bus.objects.filter(is_active=True).count()

        return Response({
            "active_buses":active_buses},
            status=status.HTTP_200_OK
            )


class AdminRecentBookingsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        recent_bookings = (
            Booking.objects
            .select_related("bus", "seat", "user")
            .order_by("-booking_time")[:10]
        )

        serializer = AdminRecentBookingSerializer(recent_bookings, many=True)
        return Response(serializer.data)


class EditBookingRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, booking_id):
        new_seat_id = request.data.get("seat_id")
        new_bus_id = request.data.get("bus_id")
        new_date = request.data.get("journey_date")

        try:
            booking = Booking.objects.select_related("bus", "seat").get(
                id=booking_id,
                user=request.user
            )
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found"}, status=404)

        today = timezone.localdate()
        if booking.journey_date and booking.journey_date < today:
            return Response(
                {"error": "Cannot edit booking for past journeys"},
                status=400
            )

        if new_date:
            try:
                parsed_new_date = date.fromisoformat(str(new_date))
            except ValueError:
                return Response({"error": "Invalid journey date format"}, status=400)

            if parsed_new_date < today:
                return Response(
                    {"error": "Journey date cannot be in the past"},
                    status=400
                )

        extra_amount = 0
        edit_fee = 0

        new_bus = booking.bus
        new_seat = booking.seat
        new_journey_date = booking.journey_date

   
        if new_bus_id:
            try:
                new_bus = Bus.objects.get(id=new_bus_id)
            except Bus.DoesNotExist:
                return Response({"error": "Invalid bus"}, status=400)

            price_difference = new_bus.price - booking.bus.price
            if price_difference > 0:
                extra_amount += price_difference

      
        if new_seat_id:
            try:
                new_seat_id = int(new_seat_id)
            except (TypeError, ValueError):
                return Response({"error": "seat_id must be a valid integer"}, status=400)

        if new_seat_id and new_seat_id != booking.seat.id:
            try:
                new_seat = Seat.objects.get(id=new_seat_id, bus=new_bus)
            except Seat.DoesNotExist:
                return Response({"error": "Invalid seat"}, status=400)

            edit_fee += 50  

      
        if new_date and str(new_date) != str(booking.journey_date):
            edit_fee += 100  
            new_journey_date = new_date

        total_extra = extra_amount + edit_fee

        if total_extra <= 0:
            with transaction.atomic():
                if new_bus_id:
                    booking.bus = new_bus
                if new_seat_id and new_seat.id != booking.seat.id:
                    booking.seat = new_seat
                if new_date and str(new_date) != str(booking.journey_date):
                    booking.journey_date = new_date
                booking.save()

            return Response({"message": "No extra payment required"})

        amount = int(total_extra * 100)

        order = client.order.create({
            "amount": amount,
            "currency": "INR",
            "payment_capture": 1,
        })

        Payment.objects.create(
            user=request.user,
            razorpay_order_id=order["id"],
            amount=amount,
            status="EDIT_PENDING",
        )

        return Response({
            "order_id": order["id"],
            "amount": amount,
            "key": settings.RAZORPAY_KEY_ID,
            "extra_amount": total_extra
        })
    


class VerifyEditPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request): 
        order_id = request.data.get("razorpay_order_id")
        payment_id = request.data.get("razorpay_payment_id")
        signature = request.data.get("razorpay_signature")
        booking_id = request.data.get("booking_id")
        new_seat_id = request.data.get("seat_id")
        new_bus_id = request.data.get("bus_id")
        new_date = request.data.get("journey_date")

        try:
            client.utility.verify_payment_signature({
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature,
            })
        except:
            return Response({"error": "Invalid signature"}, status=400)

        with transaction.atomic():
            payment = Payment.objects.select_for_update().get(
                razorpay_order_id=order_id,
                user=request.user
            )

            booking = Booking.objects.select_for_update().get(
                id=booking_id,
                user=request.user
            )

            today = timezone.localdate()
            if booking.journey_date and booking.journey_date < today:
                return Response(
                    {"error": "Cannot edit booking for past journeys"},
                    status=400
                )

            if new_date:
                try:
                    parsed_new_date = date.fromisoformat(str(new_date))
                except ValueError:
                    return Response({"error": "Invalid journey date format"}, status=400)

                if parsed_new_date < today:
                    return Response(
                        {"error": "Journey date cannot be in the past"},
                        status=400
                    )

        
            booking.seat.is_booked = False
            booking.seat.save()

            if new_bus_id:
                booking.bus = Bus.objects.get(id=new_bus_id)

            if new_seat_id:
                new_seat = Seat.objects.get(id=new_seat_id)
                new_seat.is_booked = True
                new_seat.save()
                booking.seat = new_seat

            if new_date:
                booking.journey_date = new_date
 
            booking.save()

            payment.status = "SUCCESS"
            payment.razorpay_payment_id = payment_id
            payment.save()

        return Response({"message": "Booking updated successfully"})
