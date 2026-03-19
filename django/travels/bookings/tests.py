from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from .serializers import UserProfileSerializer
from .views import UserProfileView


class UserProfileTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="demo",
            email="demo@example.com",
            password="strong-password-123",
        )

    @patch("bookings.serializers.Profile.objects.filter", side_effect=Exception("profile lookup failed"))
    def test_serializer_returns_null_avatar_when_profile_lookup_fails(self, _mock_filter):
        serializer = UserProfileSerializer(self.user)

        self.assertEqual(serializer.data["avatar"], None)
        self.assertEqual(serializer.data["username"], "demo")

    @patch("bookings.serializers.Profile.objects.filter", side_effect=Exception("profile lookup failed"))
    def test_profile_view_returns_200_when_profile_lookup_fails(self, _mock_filter):
        factory = APIRequestFactory()
        request = factory.get("/api/profile/")
        force_authenticate(request, user=self.user)

        response = UserProfileView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["avatar"], None)
        self.assertEqual(response.data["email"], "demo@example.com")
