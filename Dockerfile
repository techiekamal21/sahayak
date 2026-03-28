# SAHAYAK — Cloud Run container definition
# Optimised for minimal image size and fast cold starts

FROM python:3.11-slim

# Security: run as non-root user
RUN groupadd --gid 1000 sahayak && \
    useradd --uid 1000 --gid sahayak --no-create-home sahayak

WORKDIR /app

# Install dependencies in a separate layer for Docker cache efficiency
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/
COPY frontend/ ./frontend/

# Switch to non-root user
USER sahayak

# Cloud Run sets PORT environment variable
ENV PORT=8080
EXPOSE 8080

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')"

CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8080", \
     "--workers", "1", \
     "--loop", "uvloop", \
     "--access-log", \
     "--log-level", "info"]
