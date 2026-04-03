import logging

from django.conf import settings

from .redis_service import LocalRedisOTPService


logger = logging.getLogger(__name__)


def allow_otp_request(email):
    client = LocalRedisOTPService.get_client()
    if client is None:
        return True

    key = f"otp_rate:{email.strip().lower()}"
    max_requests = getattr(settings, "OTP_RATE_LIMIT_MAX_REQUESTS", 3)
    window_seconds = getattr(settings, "OTP_RATE_LIMIT_WINDOW_SECONDS", 300)

    try:
        count = client.get(key)
        count = int(count) if count else 0
        if count >= max_requests:
            return False
        count = client.incr(key)
        if count == 1:
            client.expire(key, window_seconds)
        return True
    except Exception:
        logger.exception("OTP rate limit failed for email=%s", email)
        return True
