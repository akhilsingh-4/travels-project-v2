import logging
import requests
from celery import shared_task

from .utils import Util

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    name="send_email_task",
    autoretry_for=(requests.RequestException, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    retry_kwargs={"max_retries": 3},
    soft_time_limit=30,
    time_limit=60,
)
def send_templated_email_task(
    self,
    subject,
    to_email,
    template_name,
    context,
    attachments=None,
):
    logger.info(
        "Email task started template=%s recipient=%s task_id=%s",
        template_name,
        to_email,
        self.request.id,
    )

    try:
        Util.send_templated_email(
            subject=subject,
            to_email=to_email,
            template_name=template_name,
            context=context,
            attachments=attachments,
        )

        logger.info(
            "Email sent successfully template=%s recipient=%s task_id=%s",
            template_name,
            to_email,
            self.request.id,
        )

    except requests.RequestException:
        logger.warning(
            "Retrying email for template=%s recipient=%s task_id=%s",
            template_name,
            to_email,
            self.request.id,
        )
        raise

    except Exception:
        logger.exception(
            "Email task failed permanently template=%s recipient=%s task_id=%s",
            template_name,
            to_email,
            self.request.id,
        )
        raise