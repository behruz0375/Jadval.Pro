FROM python:3.12-slim

WORKDIR /app

# build-essential for bcrypt/psycopg2 compile; libpq-dev for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY run.py .

# Render passes PORT as env var; default to 8000 for local use
ENV PORT=8000
EXPOSE 8000

# Shell form so $PORT expands at runtime
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
