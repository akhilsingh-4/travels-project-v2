from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework.views import APIView
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
from .models import Bus, Seat, Booking, Payment, Ticket
from .serializers import (
    UserRegisterSerializer,
    BusSearializers,
    BookingSerializer,
    UserProfileSerializer,
    PaymentSerializer
)
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from django.http import HttpResponse
import qrcode
from django.shortcuts import render


class BookingTicketView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, booking_id):
        booking = Booking.objects.select_related("bus", "seat", "user").get(id=booking_id, user=request.user)

        ticket, _ = Ticket.objects.get_or_create(
            booking=booking,
            defaults={"user": request.user}
        )

        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="ticket_{ticket.id}.pdf"'

        p = canvas.Canvas(response, pagesize=A4)
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

        field("Passenger", booking.user.username)
        field("Bus", booking.bus.bus_name)
        field("Route", f"{booking.bus.origin} → {booking.bus.destination}")
        field("Seat", booking.seat.seat_number)
        field("Start Time", booking.bus.start_time)
        field("Reach Time", booking.bus.reach_time)
        field("Price", f"₹ {booking.bus.price}")
        field("Booked At", booking.booking_time.strftime("%d %b %Y, %I:%M %p"))

        verify_url = f"http://localhost:8000/api/tickets/verify/{ticket.id}/"
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

        return Response({
            "valid": True,
            "ticket_id": ticket.id,
            "passenger": ticket.user.username,
            "bus": ticket.booking.bus.bus_name,
            "route": f"{ticket.booking.bus.origin} → {ticket.booking.bus.destination}",
            "seat": ticket.booking.seat.seat_number,
            "start_time": str(ticket.booking.bus.start_time),
            "reach_time": str(ticket.booking.bus.reach_time),
        })
    

class RefundTicketView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, booking_id):
        try:
            booking = Booking.objects.get(id=booking_id, user=request.user)
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
            client.payment.refund(payment.razorpay_payment_id)
        except:
            return Response({"error": "Refund failed"}, status=400)

        ticket.status = "REFUNDED"
        ticket.save()

        payment.status = "REFUNDED"
        payment.save()

        seat = booking.seat
        seat.is_booked = False
        seat.save()

        booking.delete()

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
                            "link": "http://localhost:5173/login",
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
                "user_id": user.id
            },
            status=status.HTTP_200_OK
        )


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
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
        reset_link = f"http://localhost:5173/reset-password/{uid}/{token}/"

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

        if not seat_id:
            return Response({"error": "seat_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            seat = Seat.objects.select_related("bus").get(id=seat_id)
        except Seat.DoesNotExist:
            return Response({"error": "Invalid seat"}, status=status.HTTP_400_BAD_REQUEST)

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

        if not payment_id or not order_id or not signature or not seat_id:
            return Response({"error": "Missing payment details"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            client.utility.verify_payment_signature({
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature,
            })
        except:
            return Response({"error": "Payment verification failed"}, status=status.HTTP_400_BAD_REQUEST)

        payment = Payment.objects.get(razorpay_order_id=order_id, user=request.user)
        payment.razorpay_payment_id = payment_id
        payment.razorpay_signature = signature
        payment.status = "SUCCESS"
        payment.save()

        return Response({"message": "Payment verified successfully"}, status=status.HTTP_200_OK)


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
    serializer_class = BusSearializers

    def get_queryset(self):
        queryset = Bus.objects.all()
        origin = self.request.query_params.get("origin")
        destination = self.request.query_params.get("destination")

        if origin:
            queryset = queryset.filter(origin__icontains=origin)
        if destination:
            queryset = queryset.filter(destination__icontains=destination)

        return queryset


class BusDetailView(generics.RetrieveAPIView):
    queryset = Bus.objects.all()
    serializer_class = BusSearializers


class BookingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        seat_id = request.data.get("seat")
        if not seat_id:
            return Response({"error": "Seat ID is required"}, status=400)

        with transaction.atomic():
            seat = Seat.objects.select_for_update().select_related("bus").get(id=seat_id)

            if seat.is_booked:
                return Response({"error": "Seat already booked"}, status=400)

            booking = Booking.objects.create(user=request.user, bus=seat.bus, seat=seat)
            seat.is_booked = True
            seat.save()

        payment = Payment.objects.filter(
            user=request.user,
            status="SUCCESS",
            booking__isnull=True
        ).order_by("-created_at").first()

        if payment:
            payment.booking = booking
            payment.save()

        if request.user.email:
            Util.send_templated_email(
                subject="Booking Confirmed - Travels App",
                template_name="emails/booking_confirmed.html",
                context={
                    "username": request.user.username,
                    "bus_name": seat.bus.bus_name,
                    "origin": seat.bus.origin,
                    "destination": seat.bus.destination,
                    "seat_number": seat.seat_number,
                    "price": seat.bus.price,
                    "link": "http://localhost:5173/my-bookings",
                },
                to_email=request.user.email
            )

        return Response(BookingSerializer(booking).data, status=201)


class CancelBookingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        booking_id = request.data.get("booking_id")

        if not booking_id:
            return Response({"error": "Booking id is required"}, status=status.HTTP_400_BAD_REQUEST)

        booking = Booking.objects.select_related("seat", "bus").get(id=booking_id, user=request.user)
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
        bookings = Booking.objects.filter(user=request.user)
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
