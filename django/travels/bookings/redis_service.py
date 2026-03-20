import logging

from django.conf import settings

try:
    import redis
except ImportError:  # pragma: no cover
    redis = None


logger = logging.getLogger(__name__)


class LocalRedisOTPService:
    _client = None

    @classmethod
    def enabled(cls):
        return bool(getattr(settings, "ENABLE_LOCAL_REDIS", False))

    @classmethod
    def get_client(cls):
        if not cls.enabled():
            logger.info("Local Redis OTP flow is disabled by settings")
            return None

        if redis is None:
            logger.error("redis package is not installed in the current environment")
            return None

        if cls._client is None:
            try:
                cls._client = redis.Redis(
                    host=settings.REDIS_HOST,
                    port=settings.REDIS_PORT,
                    db=0,
                    decode_responses=True,
                    socket_connect_timeout=3,
                    socket_timeout=3,
                )
            except Exception:
                logger.exception(
                    "Failed to initialize Redis client for host=%s port=%s",
                    settings.REDIS_HOST,
                    settings.REDIS_PORT,
                )
                cls._client = None

        return cls._client

    @classmethod
    def is_available(cls):
        client = cls.get_client()
        if client is None:
            return False

        try:
            client.ping()
            return True
        except Exception:
            logger.exception("Redis is unavailable for local OTP flow")
            return False

    @staticmethod
    def _key(email):
        return f"otp:{email.strip().lower()}"

    @classmethod
    def set_otp(cls, email, otp, ttl_seconds):
        client = cls.get_client()
        if client is None:
            return False

        try:
            return bool(client.setex(cls._key(email), ttl_seconds, otp))
        except Exception:
            logger.exception("Failed to store OTP in Redis for email=%s", email)
            return False

    @classmethod
    def get_otp(cls, email):
        client = cls.get_client()
        if client is None:
            return None

        try:
            return client.get(cls._key(email))
        except Exception:
            logger.exception("Failed to read OTP from Redis for email=%s", email)
            return None

    @classmethod
    def delete_otp(cls, email):
        client = cls.get_client()
        if client is None:
            return 0

        try:
            return client.delete(cls._key(email))
        except Exception:
            logger.exception("Failed to delete OTP from Redis for email=%s", email)
            return 0
