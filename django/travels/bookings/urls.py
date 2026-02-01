from django.urls import path
from .views import RegisterApiView,LoginView, BusDetailView, BusListCreateApiView, BookingView, UserBookingView,CancelBookingView

urlpatterns = [
    path('buses/', BusListCreateApiView.as_view(), name='buslist'),
    path('buses/<int:pk>/', BusDetailView.as_view(), name='bus-details'),
    path('register/', RegisterApiView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('user/<int:user_id>/bookings/', UserBookingView.as_view(), name='user-bookings'),
    path('bookings/cancel/', CancelBookingView.as_view(), name='cancel-booking'),
    path('booking/', BookingView.as_view(), name='bookings'),


]