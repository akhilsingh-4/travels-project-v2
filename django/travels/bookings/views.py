from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Bus, Seat, Booking
from .serializers import (
    UserRegisterSerializer,
    BusSearializers,
    BookingSerializer
)


class RegisterApiView(APIView):
    permission_classes = []  # AllowAny

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "User registered successfully"},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



class LoginView(APIView):
    permission_classes = []  # AllowAny

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        user = authenticate(username=username, password=password)

        if not user:
            return Response(
                {"error": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user_id": user.id
            },
            status=status.HTTP_200_OK
        )





class BusListCreateApiView(generics.ListAPIView):
    serializer_class = BusSearializers

    def get_queryset(self):
        queryset = Bus.objects.all()

        origin = self.request.query_params.get('origin')
        destination = self.request.query_params.get('destination')

        if origin:
            queryset = queryset.filter(origin__icontains=origin)

        if destination:
            queryset = queryset.filter(destination__icontains = destination)

        return queryset


class BusDetailView(generics.RetrieveAPIView):
    queryset = Bus.objects.all()
    serializer_class = BusSearializers


class BookingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        seat_id = request.data.get("seat")

        if not seat_id:
            return Response(
                {"error": "Seat ID is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            seat = Seat.objects.select_related("bus").get(id=seat_id)
        except Seat.DoesNotExist:
            return Response(
                {"error": "Invalid Seat ID"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if seat.is_booked:
            return Response(
                {"error": "Seat already booked"},
                status=status.HTTP_400_BAD_REQUEST
            )

        booking = Booking.objects.create(
            user=request.user,
            bus=seat.bus,
            seat=seat
        )

        seat.is_booked = True
        seat.save()

        serializer = BookingSerializer(booking)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class CancelBookingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        
        booking_id = request.data.get("booking_id")

        if not booking_id:
            return Response({"error":"Booking id is required"},
                            status=status.HTTP_400_BAD_REQUEST)
        
        try:
            booking = Booking.objects.select_related("seat").get(id=booking_id, user = request.user)
        except Booking.DoesNotExist:
            return Response({"error":"Booking not found"},
                            status=status.HTTP_400_BAD_REQUEST)
        
        seat = booking.seat
        seat.is_booked = False
        seat.save()

        booking.delete()

        return Response({"message":"Booking cancelled successfully"},
                        status=status.HTTP_200_OK)


class UserBookingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        if request.user.id != user_id:
            return Response(
                  {"error": "Forbidden"},
                status=status.HTTP_403_FORBIDDEN
            )

        bookings = Booking.objects.filter(user=request.user)
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)
