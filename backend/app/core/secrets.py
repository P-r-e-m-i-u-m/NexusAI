import os
import base64
import hashlib
from typing import Optional
from cryptography.fernet import Fernet
from app.core.config import settings
from app.core.logging import logger


def _derive_key(secret: str) -> bytes:
    key = hashlib.sha256(secret.encode()).digest()
    return base64.urlsafe_b64encode(key)


class SecretsManager:
    def __init__(self):
        self._fernet = Fernet(_derive_key(settings.APP_SECRET_KEY))
        self._cache: dict = {}

    def encrypt(self, plaintext: str) -> str:
        return self._fernet.encrypt(plaintext.encode()).decode()

    def decrypt(self, ciphertext: str) -> str:
        return self._fernet.decrypt(ciphertext.encode()).decode()

    def get_secret(self, key: str) -> Optional[str]:
        if key in self._cache:
            return self._cache[key]
        value = os.environ.get(key)
        if value:
            self._cache[key] = value
            return value
        logger.warning("secret_not_found", key=key)
        return None

    def rotate_secret(self, key: str, new_value: str) -> None:
        os.environ[key] = new_value
        self._cache[key] = new_value
        logger.info("secret_rotated", key=key)

    def revoke_secret(self, key: str) -> None:
        self._cache.pop(key, None)
        os.environ.pop(key, None)
        logger.warning("secret_revoked", key=key)


secrets_manager = SecretsManager()
