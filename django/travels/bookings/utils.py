import os
import base64
import json
import logging

import requests
from celery import current_app
from django.db import transaction
from django.core.serializers.json import DjangoJSONEncoder
from django.template.loader import render_to_string


logger = logging.getLogger(__name__)


class Util:
    @staticmethod
    def is_celery_worker_available(timeout=1):
        try:
            inspector = current_app.control.inspect(timeout=timeout)
            response = inspector.ping() if inspector else None
            return bool(response)
        except Exception:
            logger.exception("Failed to inspect Celery worker availability")
            return False

    @staticmethod
    def _normalize_context(context):
        return json.loads(json.dumps(context, cls=DjangoJSONEncoder))

    @staticmethod
    def _normalize_attachments(attachments=None):
        normalized_attachments = []
        for attachment in attachments or []:
            content = attachment.get("content")
            if isinstance(content, bytes):
                content = base64.b64encode(content).decode("utf-8")

            normalized_attachment = {
                "filename": attachment["filename"],
            }

            if content:
                normalized_attachment["content"] = content

            if attachment.get("path"):
                normalized_attachment["path"] = attachment["path"]

            if attachment.get("content_id"):
                normalized_attachment["content_id"] = attachment["content_id"]

            normalized_attachments.append(normalized_attachment)

        return normalized_attachments

    @staticmethod
    def send_templated_email(subject, to_email, template_name, context, attachments=None):
        api_key = os.getenv("RESEND_API_KEY")
        if not api_key:
            raise ValueError("RESEND_API_KEY is not configured")

        html_content = render_to_string(template_name, context)
        payload = {
            "from": os.getenv("DEFAULT_FROM_EMAIL", "onboarding@resend.dev"),
            "to": [to_email],
            "subject": subject,
            "html": html_content,
            "text": "",
        }

        normalized_attachments = Util._normalize_attachments(attachments)
        if normalized_attachments:
            payload["attachments"] = normalized_attachments

        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15,
        )
        if response.status_code not in [200, 201]:
            logger.error("Resend error: status=%s body=%s", response.status_code, response.text)

        response.raise_for_status()
        return response.json()

    @staticmethod
    def queue_templated_email(
        subject,
        to_email,
        template_name,
        context,
        attachments=None,
        fail_silently=True,
        use_on_commit=True,
        require_worker=False,
    ):
        from .tasks import send_templated_email_task

        if require_worker and not Util.is_celery_worker_available():
            logger.error("No Celery worker is available to process email for %s", to_email)
            if not fail_silently:
                raise RuntimeError("No Celery worker is available")
            return False
  
        payload = {
            "subject": subject,
            "to_email": to_email,
            "template_name": template_name,
            "context": Util._normalize_context(context),
            "attachments": Util._normalize_attachments(attachments),
        }

        def enqueue_email():
            try:
                send_templated_email_task.delay(**payload)
                return True  
            except Exception:
                logger.exception("Failed to enqueue email task for %s", to_email)
                if not fail_silently:
                    raise
                return False

        if use_on_commit and transaction.get_connection().in_atomic_block:
            transaction.on_commit(enqueue_email)
            return True

        return enqueue_email()
  