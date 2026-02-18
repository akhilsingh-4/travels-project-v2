from django.db import models
from django.contrib.auth.models import User

class Bus(models.Model):
    bus_name = models.CharField(max_length=100)
    number = models.CharField(max_length=20,unique=True)
    origin = models.CharField(max_length=50)
    destination = models.CharField(max_length=50)
    features = models.TextField()
    start_time = models.TimeField()
    reach_time = models.TimeField()
    no_of_seats = models.PositiveBigIntegerField()
    price = models.DecimalField(max_digits=8, decimal_places=2)

    is_active = models.BooleanField(default=True)   
    image = models.ImageField(upload_to="buses/", null=True, blank=True)  

    def __str__(self):
        return f"{self.bus_name} {self.origin} → {self.destination}"


class Seat(models.Model):
    bus = models.ForeignKey('Bus', on_delete=models.CASCADE, related_name='seats')
    seat_number = models.CharField(max_length=10)
    is_booked = models.BooleanField(default=False)
    is_held = models.BooleanField(default=False)
    hold_expires_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.bus} {self.seat_number} "


class Booking(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    bus = models.ForeignKey(Bus, on_delete=models.CASCADE)
    seat = models.ForeignKey(Seat, on_delete=models.CASCADE)
    journey_date = models.DateField(null=True, blank=True)
    booking_time = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username}-{self.bus.bus_name}-{self.bus.start_time}-{self.bus.reach_time}-{self.seat.seat_number}"
    

class Payment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="payments")
    booking = models.ForeignKey(Booking, on_delete=models.SET_NULL, null=True, blank=True)
    razorpay_order_id = models.CharField(max_length=100, unique=True)
    razorpay_payment_id = models.CharField(max_length=100, null=True, blank=True)
    razorpay_signature = models.CharField(max_length=255, null=True, blank=True)
    amount = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20,
        choices=[
            ("CREATED", "CREATED"),
            ("SUCCESS", "SUCCESS"),
            ("FAILED", "FAILED"),
            ("REFUNDED", "REFUNDED"),
        ],
        default="CREATED"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.razorpay_order_id} - {self.status}"
    

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)

    def __str__(self):
        return self.user.username



class Ticket(models.Model):
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name="ticket")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    status = models.CharField(
        max_length=20,
        choices=[
            ("ACTIVE", "ACTIVE"),
            ("USED", "USED"),
            ("REFUNDED", "REFUNDED"),
        ],
        default="ACTIVE"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__ (self):
        return f"Ticket #{self.id} - {self.user.username} - {self.status}"
