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
from .models import Bus, Seat, Booking, Payment
from .serializers import (
    UserRegisterSerializer,
    BusSearializers,
    BookingSerializer,
    UserProfileSerializer,
    PaymentSerializer
)


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
            return Response({"error": "Seat ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            seat = Seat.objects.select_for_update().select_related("bus").get(id=seat_id)
            if seat.is_booked:
                return Response({"error": "Seat already booked"}, status=status.HTTP_400_BAD_REQUEST)

            booking = Booking.objects.create(user=request.user, bus=seat.bus, seat=seat)
            seat.is_booked = True
            seat.save()

        if request.user.email:
            try:
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
            except Exception as e:
                print("Booking email failed:", e)

        serializer = BookingSerializer(booking)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


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
