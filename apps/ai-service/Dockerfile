FROM python:3.12-slim

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY apps/ai-service/pyproject.toml apps/ai-service/uv.lock ./
RUN uv pip install --system --no-cache .

COPY apps/ai-service/app ./app
COPY apps/ai-service/prompts ./prompts
COPY apps/ai-service/scripts ./scripts
COPY apps/ai-service/migration.sql ./

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]