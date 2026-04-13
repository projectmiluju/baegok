"""AES-256-GCM 복호화 — Node.js API의 lib/crypto.ts와 동일 로직.

저장 형식: iv:authTag:ciphertext (모두 hex).
"""

from __future__ import annotations

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .config import settings

AUTH_TAG_LENGTH = 16


def decrypt_token(payload: str) -> str:
    """Node.js encryptToken으로 암호화된 토큰을 복호화한다."""
    parts = payload.split(":")
    if len(parts) != 3:
        raise ValueError("암호문 형식이 올바르지 않습니다")

    iv_hex, tag_hex, data_hex = parts
    iv = bytes.fromhex(iv_hex)
    auth_tag = bytes.fromhex(tag_hex)
    ciphertext = bytes.fromhex(data_hex)

    if len(auth_tag) != AUTH_TAG_LENGTH:
        raise ValueError("암호문 메타데이터가 손상되었습니다")

    key = bytes.fromhex(settings.token_encryption_key)
    aesgcm = AESGCM(key)

    # GCM은 ciphertext + authTag를 합쳐서 넘겨야 함
    decrypted = aesgcm.decrypt(iv, ciphertext + auth_tag, None)
    return decrypted.decode("utf-8")
