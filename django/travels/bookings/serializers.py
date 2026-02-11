from rest_framework import serializers
from .models import Bus, Seat, Booking, Payment, Profile
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
    avatar = serializers.ImageField(source="profile.avatar", required=False)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "avatar"]
        read_only_fields = ["id", "username"]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})

        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Ensure profile exists (fix for old users)
        profile, _ = Profile.objects.get_or_create(user=instance)

        # Update avatar if provided
        if "avatar" in profile_data:
            profile.avatar = profile_data["avatar"]
            profile.save()

        return instance

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

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = "__all__"