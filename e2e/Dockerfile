# Image exposes on port 8000, where playwright can test 

FROM docker.io/library/node:22-bookworm AS frontend-builder
WORKDIR /app/expense_tracker_frontend
COPY expense_tracker_frontend/package*.json ./
RUN npm ci
COPY expense_tracker_frontend/ ./
RUN npm run build

FROM docker.io/library/python:3.13-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN pip install --no-cache-dir uv
COPY pyproject.toml uv.lock ./
RUN uv export --frozen --no-dev --no-hashes -o requirements.txt && pip install --no-cache-dir -r requirements.txt
COPY manage.py ./
COPY expense_tracker/ ./expense_tracker/
COPY expenses/ ./expenses/
COPY templates/ ./templates/
COPY --from=frontend-builder /app/expense_tracker_frontend/dist ./expense_tracker_frontend/dist
RUN python manage.py collectstatic --noinput
EXPOSE 8000
CMD ["sh", "-c", "python manage.py migrate --noinput && \
    python manage.py synthetic_data_generator -u user1 -p pass -s 1 -d 50 -a 3 -t 3 -r 3 -c user2 -e 6 && \
    python manage.py synthetic_data_generator -u user2 -p pass -s 2 -d 50 -a 3 -t 3 -r 3 -c user1 -e 6 && \
    gunicorn --bind 0.0.0.0:8000 --workers 3 expense_tracker.wsgi:application"]
