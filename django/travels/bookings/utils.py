import os
import requests
from django.template.loader import render_to_string


class Util:
    @staticmethod
    def send_templated_email(subject, to_email, template_name, context, attachments=None):
        api_key = os.getenv("RESEND_API_KEY")

        html_content = render_to_string(template_name, context)

        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": os.getenv("DEFAULT_FROM_EMAIL", "onboarding@resend.dev"),
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            },
        )

        if response.status_code not in [200, 201]:
            print("Resend error:", response.text)

        return response.status_code