from django.urls import path
from .views import RegisterApiView,LoginView, BusDetailView, BusListCreateApiView, BookingView, RequestPasswordResetView, ConfirmPasswordResetView, UserProfileView,MyBookingsView,CancelBookingView

urlpatterns = [
    path('buses/', BusListCreateApiView.as_view(), name='buslist'),
    path('buses/<int:pk>/', BusDetailView.as_view(), name='bus-details'),
    path('register/', RegisterApiView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path("my/bookings/", MyBookingsView.as_view()),
    path("profile/", UserProfileView.as_view()),
    path('bookings/cancel/', CancelBookingView.as_view(), name='cancel-booking'),
    path('booking/', BookingView.as_view(), name='bookings'),
    path("password-reset/request/", RequestPasswordResetView.as_view()),
    path("password-reset/confirm/", ConfirmPasswordResetView.as_view()),


]