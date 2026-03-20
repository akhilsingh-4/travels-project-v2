from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0010_booking_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="is_email_verified",
            field=models.BooleanField(default=False),
        ),
    ]
