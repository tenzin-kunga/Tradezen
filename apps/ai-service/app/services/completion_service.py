from __future__ import annotations

import asyncio
import logging

import httpx

logger = logging.getLogger("ai_service.completion")


class AuthenticationError(Exception):
    """Raised when provider returns 401."""
    pass


class RateLimitError(Exception):
    """Raised when provider returns 429."""
    pass


class ProviderError(Exception):
    """Raised on provider 5xx or network errors."""
    pass


class CompletionService:
    """Handles LLM calls with streaming and retry."""

    def __init__(self, config, retry_policy=None, circuit_breaker=None):
        self.config = config
        self.retry = retry_policy
        self.circuit = circuit_breaker

    async def complete(self, session, messages: list) -> dict:
        provider = session.provider
        if not provider:
            raise ValueError("No provider set on session")

        dict_msgs = [
            {"role": m.role if hasattr(m, "role") else m.get("role", "user"),
             "content": m.content if hasattr(m, "content") else m.get("content", "")}
            for m in messages
        ]
        temp = session.temperature or 0.4

        result = await provider.chat(
            dict_msgs,
            model=session.model,
            temperature=temp,
            stream=False,
        )
        return {
            "content": result.get("content", ""),
            "model": result.get("model", session.model),
            "usage": result.get("usage", {}),
        }

    async def stream(self, session, messages: list, api_key: str | None = None, base_url: str | None = None):
        """True streaming — yields tokens, sets up streaming response in session."""
        provider = session.provider
        if not provider:
            raise ValueError("No provider set on session")

        dict_msgs = [
            {"role": m.role if hasattr(m, "role") else m.get("role", "user"),
             "content": m.content if hasattr(m, "content") else m.get("content", "")}
            for m in messages
        ]
        temp = session.temperature or 0.4
        provider_name = getattr(provider, "name", "unknown")

        # Check circuit breaker
        if self.circuit and not self.circuit.is_available(provider_name):
            raise ProviderError(f"Circuit breaker open for {provider_name}")

        last_error = None
        max_attempts = (self.retry.max_retries + 1) if self.retry else 1

        for attempt in range(max_attempts):
            try:
                full_response = []
                async for token in provider.stream(dict_msgs, model=session.model, temperature=temp, api_key=api_key, base_url=base_url, provider_name=getattr(session, "provider_name", None)):
                    full_response.append(token)
                    yield token

                session._full_response = "".join(full_response)

                # Record success
                if self.circuit:
                    self.circuit.record_success(provider_name)
                return

            except httpx.HTTPStatusError as e:
                status = e.response.status_code
                if status == 401:
                    raise AuthenticationError(f"Invalid API key for {provider_name}")
                if status == 429:
                    raise RateLimitError(f"Rate limited by {provider_name}")
                last_error = ProviderError(f"{provider_name} error: {status}")

            except (httpx.TimeoutException, httpx.ConnectError) as e:
                last_error = ProviderError(f"{provider_name} connection error: {e}")

            except (AuthenticationError, RateLimitError):
                raise

            except Exception as e:
                last_error = ProviderError(f"{provider_name} error: {e}")

            # Record failure and retry
            if self.circuit:
                self.circuit.record_failure(provider_name)

            if attempt < max_attempts - 1 and self.retry:
                import random
                delay = min(self.retry.base_delay * (2 ** attempt), self.retry.max_delay)
                delay *= random.uniform(0.5, 1.5)
                logger.warning(f"Retry {attempt + 1}/{self.retry.max_retries} for {provider_name} in {delay:.2f}s")
                await asyncio.sleep(delay)

        raise last_error
