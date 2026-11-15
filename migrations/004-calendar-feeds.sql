CREATE TABLE IF NOT EXISTS dwp_calendar_feeds (
 user_id text PRIMARY KEY, tenant_id text NOT NULL, token_hash text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(), last_used_at timestamptz
);
