from django.urls import path
from .views import AdminActiveBusesView, AdminRecentBookingsView, AdminTotalBookingsView, AdminTotalRevenueView,RegisterApiView,AdminBusListCreateView, AdminBusDetailView, RefundTicketView, TicketVerifyView, BookingTicketView, LoginView,PaymentStatusView, MyPaymentsView, BusDetailView, BusListCreateApiView,VerifyPaymentView, CreatePaymentOrderView, RequestPasswordResetView, ConfirmPasswordResetView, UserProfileView,MyBookingsView,CancelBookingView

urlpatterns = [
    path('buses/', BusListCreateApiView.as_view(), name='buslist'),
    path('buses/<int:pk>/', BusDetailView.as_view(), name='bus-details'),
    path('register/', RegisterApiView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path("my/bookings/", MyBookingsView.as_view()),
    path("profile/", UserProfileView.as_view()),
    path('bookings/cancel/', CancelBookingView.as_view(), name='cancel-booking'),
    # path('booking/', BookingView.as_view(), name='bookings'),
    path("password-reset/request/", RequestPasswordResetView.as_view()),
    path("password-reset/confirm/", ConfirmPasswordResetView.as_view()),
    path("payments/create-order/", CreatePaymentOrderView.as_view()),
    path("payments/verify/", VerifyPaymentView.as_view()),
    path("payments/my/", MyPaymentsView.as_view()),
    path("payments/status/<str:order_id>/", PaymentStatusView.as_view()),
    path("bookings/<int:booking_id>/ticket/", BookingTicketView.as_view()),
    path("tickets/verify/<int:ticket_id>/", TicketVerifyView.as_view()),
    path("bookings/<int:booking_id>/refund/", RefundTicketView.as_view()),

    path('admin/buses/', AdminBusListCreateView.as_view(), name='admin-bus-list-create'),
    path('admin/buses/<int:pk>/', AdminBusDetailView.as_view(), name='admin-bus-detail'),
    path("admin/dashboard/total-bookings/", AdminTotalBookingsView.as_view()),
    path("admin/dashboard/total-revenue/", AdminTotalRevenueView.as_view()),
    path("admin/dashboard/active-buses/", AdminActiveBusesView.as_view()),
    path("admin/dashboard/recent-bookings/", AdminRecentBookingsView.as_view()),


]