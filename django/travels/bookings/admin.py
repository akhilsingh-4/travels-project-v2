from django.contrib import admin
from .models import Bus,Seat,Booking,Ticket,Payment
# Register your models here.

class PaymentAdmin(admin.ModelAdmin):
    list_display = ('user', 'booking', 'status')
class TicketAdmin(admin.ModelAdmin):
    list_display = ('booking', 'user', 'status', 'created_at')

class BusAdmin(admin.ModelAdmin):
    list_display = ('bus_name', 'number', 'origin', 'destination')

class SeatAdmin(admin.ModelAdmin):
    list_display = ('seat_number', 'bus', 'is_booked')

class BookingAdmin(admin.ModelAdmin):
    list_display = ('user', 'bus', 'seat', 'booking_time')

admin.site.register(Bus, BusAdmin)
admin.site.register(Seat, SeatAdmin)
admin.site.register(Booking, BookingAdmin)
admin.site.register(Ticket, TicketAdmin)
admin.site.register(Payment, PaymentAdmin)