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

from .utils import Util
from .models import Bus, Seat, Booking
from .serializers import (
    UserRegisterSerializer,
    BusSearializers,
    BookingSerializer,
    UserProfileSerializer
)


class RegisterApiView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

            if user.email:
                data = {
                    "subject": "Welcome to Travels App",
                    "message": (
                        f"Hi {user.username},\n\n"
                        "Welcome to Travels App! 🎉\n"
                        "Your account has been created successfully.\n\n"
                        "You can now login and start booking buses.\n\n"
                        "Happy travels!"
                    ),
                    "to_email": user.email,
                }

                try:
                    Util.send_email(data)
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

        data = {
            "subject": "Reset Your Password - Travels App",
            "message": (
                f"Hi {user.username},\n\n"
                "You requested to reset your password.\n\n"
                f"Click the link below to reset it:\n{reset_link}\n\n"
                "If you didn’t request this, ignore this email."
            ),
            "to_email": user.email,
        }

        try:
            Util.send_email(data)
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
            return Response(
                {"error": "uid, token and password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(id=user_id)
        except Exception:
            return Response(
                {"error": "Invalid reset link"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not PasswordResetTokenGenerator().check_token(user, token):
            return Response(
                {"error": "Invalid or expired token"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(password)
        user.save()

        return Response(
            {"message": "Password reset successful"},
            status=status.HTTP_200_OK
        )

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
            try:
                seat = Seat.objects.select_for_update().select_related("bus").get(id=seat_id)
            except Seat.DoesNotExist:
                return Response({"error": "Invalid Seat ID"}, status=status.HTTP_400_BAD_REQUEST)

            if seat.is_booked:
                return Response({"error": "Seat already booked"}, status=status.HTTP_400_BAD_REQUEST)

            booking = Booking.objects.create(user=request.user, bus=seat.bus, seat=seat)

            seat.is_booked = True
            seat.save()

        if request.user.email:  
            data = {
                "subject": "Booking Confirmed - Travels App",
                "message": (
                    f"Hi {request.user.username},\n\n"
                    "Your seat has been booked successfully! 🎉\n\n"
                    f"Bus: {seat.bus.bus_name}\n"
                    f"Route: {seat.bus.origin} → {seat.bus.destination}\n"
                    f"Start: {seat.bus.start_time}\n"
                    f"Reach: {seat.bus.reach_time}\n"
                    f"Seat: {seat.seat_number}\n"
                    f"Price: ₹{seat.bus.price}\n\n"
                    "Thank you for booking with Travels App. Have a safe journey!"
                ),
                "to_email": request.user.email,
            }

            try:
                Util.send_email(data)
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

        try:
            booking = Booking.objects.select_related("seat", "bus").get(id=booking_id, user=request.user)
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        seat = booking.seat
        seat.is_booked = False
        seat.save()

        if request.user.email:
            data = {
                "subject": "Booking Cancelled - Travels App",
                "message": (
                    f"Hi {request.user.username},\n\n"
                    "Your booking has been cancelled.\n\n"
                    f"Bus: {booking.bus.bus_name}\n"
                    f"Seat: {seat.seat_number}\n\n"
                    "Hope to see you again!"
                ),
                "to_email": request.user.email,
            }

            try:
                Util.send_email(data)
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
