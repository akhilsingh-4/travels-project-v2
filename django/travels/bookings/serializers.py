import logging
from rest_framework import serializers
from .models import Bus, Seat, Booking, Payment, Profile
from django.contrib.auth.models import User


logger = logging.getLogger(__name__)


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
    avatar = serializers.ImageField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "avatar"]
        read_only_fields = ["id", "username"]

    def update(self, instance, validated_data):
        avatar = validated_data.pop("avatar", serializers.empty)

        instance.first_name = validated_data.get("first_name", instance.first_name)
        instance.last_name = validated_data.get("last_name", instance.last_name)
        instance.email = validated_data.get("email", instance.email)
        instance.save()

        if avatar is not serializers.empty:
            try:
                profile, _ = Profile.objects.get_or_create(user=instance)
                profile.avatar = avatar
                profile.save()
            except Exception:
                logger.exception("Failed to save avatar for user_id=%s", instance.id)

        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)

        request = self.context.get("request")
        avatar = None

        try:
            profile = Profile.objects.filter(user=instance).first()
            avatar = getattr(profile, "avatar", None)
            if avatar:
                avatar_url = avatar.url
                data["avatar"] = request.build_absolute_uri(avatar_url) if request else avatar_url
            else:
                data["avatar"] = None
        except Exception:
            logger.exception("Failed to serialize avatar for user_id=%s", instance.id)
            data["avatar"] = None

        return data


class SeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seat
        fields = ["id", "seat_number", "is_booked"]


class BusSerializers(serializers.ModelSerializer):
    seats = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Bus
        fields = "__all__"

    def get_image(self, obj):
        image = getattr(obj, "image", None)

        if not image:
            return None

        try:
            image_url = image.url
        except Exception:
            return None

        request = self.context.get("request")
        return request.build_absolute_uri(image_url) if request else image_url

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
    image = serializers.SerializerMethodField()

    class Meta:
        model = Bus
        fields = "__all__"

    def get_image(self, obj):
        image = getattr(obj, "image", None)

        if not image:
            return None

        try:
            image_url = image.url
        except Exception:
            return None

        request = self.context.get("request")
        return request.build_absolute_uri(image_url) if request else image_url


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
