# syntax=docker/dockerfile:1

FROM python:3.12-slim

# Prevent Python from writing .pyc files
ENV PYTHONDONTWRITEBYTECODE=1

# Send logs directly to the container output
ENV PYTHONUNBUFFERED=1

# Default application port
ENV PORT=8000

WORKDIR /app

# Create a non-root user
RUN groupadd --system appgroup \
    && useradd --system \
       --gid appgroup \
       --create-home \
       --home-dir /home/appuser \
       appuser

# Copy dependency list first to improve Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy the backend application
COPY app ./app

# Copy database migration and schema files
COPY db ./db

# Give the application user ownership
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]