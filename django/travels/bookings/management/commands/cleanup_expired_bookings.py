from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from bookings.models import Booking


class Command(BaseCommand):
    help = "Delete bookings whose journey date is older than 24 hours (before yesterday)."

    def handle(self, *args, **options):
        cutoff_date = timezone.localdate() - timedelta(days=1)
        deleted_count, _ = Booking.objects.filter(journey_date__lt=cutoff_date).delete()
        self.stdout.write(
            self.style.SUCCESS(
                f"Deleted {deleted_count} stale booking record(s) with journey_date < {cutoff_date}."
            )
        )
