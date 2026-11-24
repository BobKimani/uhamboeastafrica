-- Local administrator authentication (replaces AWS Cognito).
-- Additive only: creates new tables; does not touch hotels, vehicles,
-- bookings, inquiries or payments. Safe to re-run.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Administrator accounts. Passwords are stored only as Argon2id hashes.
-- Accounts are provisioned with the CLI (python -m app.admin_cli); there is
-- no public registration and no default account.
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_users_email_lowercase CHECK (email = lower(email) AND length(email) BETWEEN 3 AND 320),
  CONSTRAINT admin_users_password_hash_argon2id CHECK (password_hash LIKE '$argon2id$%')
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_key ON admin_users (email);

-- Server-side sessions. Only a SHA-256 hash of the random session token is
-- stored; the raw token exists solely in the admin's HttpOnly cookie.
CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  ip_address text,
  user_agent text,
  CONSTRAINT admin_sessions_token_hash_sha256 CHECK (token_hash ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_sessions_token_hash_key ON admin_sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_user_id ON admin_sessions (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions (expires_at);

-- Login attempts, used for rate limiting (persistent across restarts and
-- shared between worker processes).
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id bigserial PRIMARY KEY,
  email text NOT NULL,
  ip_address text,
  succeeded boolean NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_email_time
  ON admin_login_attempts (email, attempted_at);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip_time
  ON admin_login_attempts (ip_address, attempted_at);
