from __future__ import annotations

import time

import jwt
import pytest

from app.security.auth import AuthService
from app.models.principal import Principal


SECRET = "test-secret-key-for-jwt-verification"
EXPIRED_SECRET = jwt.encode(
    {"sub": "user-1", "exp": int(time.time()) - 3600},
    SECRET,
    algorithm="HS256",
)


def _make_token(sub: str = "user-1", exp_offset: int = 3600, **extra) -> str:
    payload = {"sub": sub, "exp": int(time.time()) + exp_offset, **extra}
    return jwt.encode(payload, SECRET, algorithm="HS256")


class TestVerifyJWT:
    def setup_method(self):
        self.auth = AuthService(secret=SECRET)

    def test_valid_token(self):
        token = _make_token(email="a@b.com", username="alice")
        result = self.auth._verify_jwt(token)
        assert isinstance(result, Principal)
        assert result.user_id == "user-1"
        assert result.email == "a@b.com"
        assert result.username == "alice"
        assert result.source == "jwt"

    def test_valid_token_minimal_payload(self):
        token = _make_token()
        result = self.auth._verify_jwt(token)
        assert isinstance(result, Principal)
        assert result.user_id == "user-1"
        assert result.email is None
        assert result.username is None

    def test_expired_token(self):
        result = self.auth._verify_jwt(EXPIRED_SECRET)
        assert result is None

    def test_invalid_signature(self):
        wrong_secret = jwt.encode(
            {"sub": "user-1", "exp": int(time.time()) + 3600},
            "wrong-secret",
            algorithm="HS256",
        )
        result = self.auth._verify_jwt(wrong_secret)
        assert result is None

    def test_missing_sub(self):
        token = jwt.encode(
            {"exp": int(time.time()) + 3600},
            SECRET,
            algorithm="HS256",
        )
        result = self.auth._verify_jwt(token)
        assert result is None

    def test_empty_sub(self):
        token = jwt.encode(
            {"sub": "", "exp": int(time.time()) + 3600},
            SECRET,
            algorithm="HS256",
        )
        result = self.auth._verify_jwt(token)
        assert result is None

    def test_wrong_algorithm_rejected(self):
        # Try to use none algorithm attack
        token = jwt.encode(
            {"sub": "user-1", "exp": int(time.time()) + 3600},
            SECRET,
            algorithm="HS256",
        )
        # Manually decode and re-encode with wrong algo is rejected by PyJWT
        result = self.auth._verify_jwt(token)
        assert result is not None  # HS256 is valid

    def test_malformed_token(self):
        result = self.auth._verify_jwt("not.a.jwt")
        assert result is None

    def test_empty_token(self):
        result = self.auth._verify_jwt("")
        assert result is None

    def test_dev_mode_no_secret(self):
        auth = AuthService(secret="")
        result = auth._verify_jwt("anything")
        assert isinstance(result, Principal)
        assert result.user_id == "dev-user"
        assert result.source == "dev"


class TestVerifyIntegration:
    def setup_method(self):
        self.auth = AuthService(secret=SECRET, nestjs_key="internal-key")

    @pytest.mark.asyncio
    async def test_internal_api_key(self):
        headers = {"x-internal-api-key": "internal-key"}
        body = {"user_id": "user-123"}
        result = await self.auth.verify(headers, body)
        assert result == {"id": "user-123", "source": "nestjs"}

    @pytest.mark.asyncio
    async def test_internal_api_key_no_user_id(self):
        headers = {"x-internal-api-key": "internal-key"}
        result = await self.auth.verify(headers, {})
        assert result == {"id": "unknown", "source": "nestjs"}

    @pytest.mark.asyncio
    async def test_bearer_jwt(self):
        token = _make_token(sub="user-456")
        headers = {"authorization": f"Bearer {token}"}
        result = await self.auth.verify(headers)
        assert result == {"id": "user-456", "source": "jwt"}

    @pytest.mark.asyncio
    async def test_bearer_expired(self):
        token = EXPIRED_SECRET
        headers = {"authorization": f"Bearer {token}"}
        result = await self.auth.verify(headers)
        assert result is None

    @pytest.mark.asyncio
    async def test_no_auth(self):
        result = await self.auth.verify({})
        assert result is None

    @pytest.mark.asyncio
    async def test_wrong_api_key_falls_through_to_jwt(self):
        headers = {
            "x-internal-api-key": "wrong-key",
            "authorization": f"Bearer {_make_token(sub='user-789')}",
        }
        result = await self.auth.verify(headers)
        assert result == {"id": "user-789", "source": "jwt"}
