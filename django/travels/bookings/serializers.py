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
    avatar = serializers.ImageField(source="profile.avatar", required=False, allow_null=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "avatar"]
        read_only_fields = ["id", "username"]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})

        instance.first_name = validated_data.get("first_name", instance.first_name)
        instance.last_name = validated_data.get("last_name", instance.last_name)
        instance.email = validated_data.get("email", instance.email)
        instance.save()

        profile, _ = Profile.objects.get_or_create(user=instance)

        if "avatar" in profile_data:
            profile.avatar = profile_data["avatar"]
            profile.save()

        return instance


class SeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seat
        fields = ["id", "seat_number", "is_booked"]


class BusSerializers(serializers.ModelSerializer):
    seats = serializers.SerializerMethodField()
    image = serializers.ImageField(read_only=True)

    class Meta:
        model = Bus
        fields = "__all__"

    def get_seats(self, obj):
        request = self.context.get("request")
        params = getattr(request, "query_params", None) or getattr(request, "GET", None)
        date = params.get("date") if params else None

        seats = Seat.objects.filter(bus=obj)
        result = []

        for seat in seats:
            is_booked = False

            if date:
                is_booked = Booking.objects.filter(
                    seat=seat,
                    journey_date=date
                ).exists()

            result.append({
                "id": seat.id,
                "seat_number": seat.seat_number,
                "is_booked": is_booked,
            })

        return result


class BookingSerializer(serializers.ModelSerializer):
    bus = serializers.StringRelatedField()
    seat = serializers.StringRelatedField()
    user = serializers.StringRelatedField()

    bus_id = serializers.IntegerField(source="bus.id", read_only=True)
    seat_id = serializers.IntegerField(source="seat.id", read_only=True)
    seat_number = serializers.CharField(source="seat.seat_number", read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "user",
            "bus",
            "bus_id",
            "seat",
            "seat_id",
            "seat_number",
            "journey_date",
            "status",
            "booking_time",
        ]
        read_only_fields = ["user", "booking_time", "bus", "seat", "status"]


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = "__all__"


class AdminBusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bus
        fields = "__all__"


class AdminRecentBookingSerializer(serializers.ModelSerializer):
    bus_name = serializers.CharField(source="bus.bus_name")
    origin = serializers.CharField(source="bus.origin")
    destination = serializers.CharField(source="bus.destination")
    seat_number = serializers.CharField(source="seat.seat_number")
    username = serializers.CharField(source="user.username")

    class Meta:
        model = Booking
        fields = [
            "id",
            "username",
            "bus_name",
            "origin",
            "destination",
            "seat_number",
            "journey_date",
            "booking_time",
        ]
