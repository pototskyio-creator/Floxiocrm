-- Creates the low-privilege role used by the running application.
-- Runs once at container first-start (docker-entrypoint-initdb.d).
-- Migrations and admin scripts still connect as POSTGRES_USER=floxio (superuser),
-- the API connects as floxio_app so RLS is enforced.

CREATE ROLE floxio_app
  WITH LOGIN
       PASSWORD 'floxio_app_dev_password'
       NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;

GRANT USAGE ON SCHEMA public TO floxio_app;

-- Tables created later by floxio will auto-grant CRUD to floxio_app.
ALTER DEFAULT PRIVILEGES FOR ROLE floxio IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON TABLES TO floxio_app;

ALTER DEFAULT PRIVILEGES FOR ROLE floxio IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO floxio_app;

-- For tables that already exist at this moment (none yet on a fresh volume, but safe).
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public TO floxio_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO floxio_app;
