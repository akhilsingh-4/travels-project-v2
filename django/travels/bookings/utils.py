from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings

class Util:
    @staticmethod
    def send_templated_email(subject, to_email, template_name, context, attachments=None):
        html_message = render_to_string(template_name, context)

        email = EmailMultiAlternatives(
            subject=subject,
            body="This email requires HTML support.",
            from_email=settings.EMAIL_HOST_USER,
            to=[to_email],
        )

        email.attach_alternative(html_message, "text/html")

        if attachments:
            for file in attachments:
                email.attach(
                    file["filename"],
                    file["content"],
                    file["mimetype"]
                )

        email.send()
