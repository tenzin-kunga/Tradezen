from __future__ import annotations

import logging
from typing import Any

import jwt

from ..models.principal import Principal

logger = logging.getLogger("ai_service.auth")


class AuthService:
    """Validates requests from NestJS via internal API key or JWT."""

    def __init__(self, secret: str = "", nestjs_key: str = ""):
        self.secret = secret
        self.nestjs_key = nestjs_key

    async def verify(self, headers: dict, body: dict | None = None) -> dict | None:
        """
        Verify request is from NestJS or a valid user.
        Returns user dict if valid, None if not.
        """
        # Check internal API key (NestJS → ai-service)
        api_key = headers.get("x-internal-api-key") or headers.get(
            "x-api-key", ""
        )
        if self.nestjs_key and api_key == self.nestjs_key:
            # Internal request from NestJS — user_id comes in body
            if body and "user_id" in body:
                return {"id": body["user_id"], "source": "nestjs"}
            return {"id": "unknown", "source": "nestjs"}

        # Check Bearer token
        auth_header = headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            principal = self._verify_jwt(token)
            if principal:
                return {"id": principal.user_id, "source": "jwt"}

        return None

    def _verify_jwt(self, token: str) -> Principal | None:
        """
        Verify JWT token using PyJWT.
        Returns Principal on success, None on failure.
        """
        if not self.secret:
            # No secret configured — allow all (dev mode)
            return Principal(user_id="dev-user", source="dev")

        try:
            payload: dict[str, Any] = jwt.decode(
                token,
                self.secret,
                algorithms=["HS256"],
            )
        except jwt.ExpiredSignatureError:
            logger.debug("JWT expired")
            return None
        except jwt.InvalidSignatureError:
            logger.warning("JWT invalid signature")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"JWT invalid: {e}")
            return None

        # sub is required
        sub = payload.get("sub")
        if not sub or not isinstance(sub, str):
            logger.debug("JWT missing or invalid sub")
            return None

        return Principal(
            user_id=sub,
            email=payload.get("email"),
            username=payload.get("username"),
            source="jwt",
        )
