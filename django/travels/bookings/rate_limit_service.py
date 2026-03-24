import logging

from .redis_service import LocalRedisOTPService


logger = logging.getLogger(__name__)


def allow_otp_request(email):
    client = LocalRedisOTPService.get_client()
    if client is None:
        return True

    key = f"otp_rate:{email.strip().lower()}"

    try:
        count = client.get(key)
        count = int(count) if count else 0
        if count >= 3:
            return False
        count = client.incr(key)
        if count == 1:
            client.expire(key, 300)
        return True
    except Exception:
        logger.exception("OTP rate limit failed for email=%s", email)
        return True
