from django.core.mail import send_mail
from django.conf import settings

class Util:
    @staticmethod
    def send_email(data):
        send_mail(
            subject=data["subject"],
            message=data["message"],
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[data["to_email"]],
            fail_silently=False,
        )
