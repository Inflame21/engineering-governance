# Real migration check output

The saved text of real migration checks, captured on 2026-11-23 from two throwaway projects built for this purpose (a one-model Django 6.1.3 app on in-memory SQLite, and a one-model SQLAlchemy app under Alembic 1.20.1 on a SQLite file). Both streams (stdout and stderr) are kept, as `cmd > file 2>&1` would save them. Nothing was edited. Replayed by `migration-check.test.ts`.

| File | Command | State of the project |
| --- | --- | --- |
| `django-clean.txt` | `manage.py makemigrations --check --dry-run` | models and migrations agree |
| `django-pending.txt` | same | two model fields added with no migration (exit 1) |
| `django-conflict.txt` | same | two migrations both depend on `0001` (exit 1) |
| `alembic-clean.txt` | `alembic check` | database at head, models agree |
| `alembic-pending.txt` | `alembic check` | a model column added with no migration (exit 255) |
| `alembic-not-current.txt` | `alembic check` | database not at the latest revision: the check could not run |
| `alembic-one-head.txt` | `alembic heads` | one head |
| `alembic-two-heads.txt` | `alembic heads` | two heads |

`alembic check` does not report two heads (it printed the "new upgrade operations" result for the first), so a fork is read from `alembic heads`. Only Django and Alembic are read; Prisma, Flyway, Liquibase, Rails, Atlas and others are not (DEBT-GOV-032).
