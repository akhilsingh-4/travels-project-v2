from rest_framework import serializers
from .models import Bus, Seat, Booking
from django.contrib.auth.models import User


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"]
        )
        return user



class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name"]
        read_only_fields = ["id", "username"] 

class SeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seat
        fields = ["id", "seat_number", "is_booked"]


class BusSearializers(serializers.ModelSerializer):
    seats = SeatSerializer(many=True, read_only=True)

    class Meta:
        model = Bus
        fields = "__all__"


class BookingSerializer(serializers.ModelSerializer):
    bus = serializers.StringRelatedField()
    seat = serializers.StringRelatedField()  
    user = serializers.StringRelatedField()

    class Meta:
        model = Booking
        fields = "__all__"
        read_only_fields = ["user", "booking_time", "bus", "seat"]
