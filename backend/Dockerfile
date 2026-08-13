ARG PYTHON_IMAGE=python:3.12-slim
FROM ${PYTHON_IMAGE}

ARG PIP_INDEX_URL=https://pypi.org/simple
ARG PIP_TRUSTED_HOST=

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY backend/requirements.txt /app/requirements.txt
RUN if [ -n "$PIP_TRUSTED_HOST" ]; then \
      pip install --index-url "$PIP_INDEX_URL" --trusted-host "$PIP_TRUSTED_HOST" -r /app/requirements.txt; \
    else \
      pip install --index-url "$PIP_INDEX_URL" -r /app/requirements.txt; \
    fi

COPY alembic.ini /app/alembic.ini
COPY backend/app /app/app
COPY backend/migrations /app/backend/migrations

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
