# Stage 1: Build React frontend
FROM docker.io/library/node:18-bookworm AS frontend-builder

WORKDIR /app/frontend

COPY expense_tracker_frontend/package*.json ./
COPY expense_tracker_frontend/tsconfig.json ./
COPY expense_tracker_frontend/vite.config.ts ./
COPY expense_tracker_frontend/.prettierrc ./

RUN npm ci

COPY expense_tracker_frontend/src ./src
COPY expense_tracker_frontend/public ./public
COPY expense_tracker_frontend/index.html ./

RUN npm run build

# Stage 2: Django backend
FROM docker.io/library/python:3.12-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY manage.py .
COPY expense_tracker/ ./expense_tracker/
COPY expenses/ ./expenses/
COPY templates/ ./templates/

COPY --from=frontend-builder /app/frontend/dist ./expense_tracker_frontend/dist

RUN mkdir -p /app/media

RUN python manage.py collectstatic --noinput

# Create non-root user
RUN groupadd -r user && useradd -r -g user user
RUN chown -R user:user /app
USER user

EXPOSE 8000

# Default command
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "expense_tracker.wsgi:application"]
