# Database Migrations

SetadInfo uses Alembic for schema migrations. The initial public migration
describes the schema currently used by the FastAPI app.

## Fresh Database

```bash
alembic -c alembic.ini upgrade head
```

Then start the API:

```bash
PYTHONPATH=backend uvicorn app.main:app --host 127.0.0.1 --port 8765
```

`init_db()` still creates the default admin user and keeps the app compatible
with local development.

## Existing Database

For a database that already has the current SetadInfo schema, do not run the
initial migration as a create script. Instead:

1. Back up the database.
2. Verify the schema matches the current models.
3. Stamp the database:

```bash
alembic -c alembic.ini stamp head
```

After that, future migrations can be applied with:

```bash
alembic -c alembic.ini upgrade head
```

## Creating A New Migration

```bash
alembic -c alembic.ini revision --autogenerate -m "Describe change"
```

Review generated migrations before committing. Autogenerate is a starting
point, not proof that the migration is safe.

## Environment

Alembic reads the same `DATABASE_URL` setting as the app. You can set it through
`.env` or the process environment.

Never commit production `.env` files, database dumps, or credentials.

