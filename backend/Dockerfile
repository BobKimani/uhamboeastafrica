# syntax=docker/dockerfile:1

FROM python:3.12-slim

# Prevent Python from writing .pyc files
ENV PYTHONDONTWRITEBYTECODE=1

# Send logs directly to the container output
ENV PYTHONUNBUFFERED=1

# Default application port
ENV PORT=8000

WORKDIR /app

# Create a non-root user with a fixed UID/GID so the host media directory
# (/srv/uhambo/uploads) can be chowned to match: chown -R 10001:10001
ARG APP_UID=10001
ARG APP_GID=10001
RUN groupadd --system --gid ${APP_GID} appgroup \
    && useradd --system \
       --uid ${APP_UID} \
       --gid appgroup \
       --create-home \
       --home-dir /home/appuser \
       appuser

# Copy dependency list first to improve Docker layer caching
COPY requirements.txt constraints.txt ./

# Install Python dependencies at the exact versions verified by the tests
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt -c constraints.txt

# Copy the backend application
COPY app ./app

# Copy database migration and schema files
COPY db ./db

# Local media storage (bind-mounted from /srv/uhambo/uploads on the VPS)
ENV MEDIA_ROOT=/app/uploads
RUN mkdir -p /app/uploads && chmod 755 /app/uploads

# Give the application user ownership
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

# Docker health monitoring via the existing /health endpoint (returns 503 when
# the database is unreachable). Uses Python since slim images have no curl.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\", \"8000\")}/health', timeout=5)" || exit 1

# --proxy-headers: honour X-Forwarded-Proto/For from the Nginx reverse proxy.
# Trusted proxy IPs come from FORWARDED_ALLOW_IPS (uvicorn default: 127.0.0.1).
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers"]