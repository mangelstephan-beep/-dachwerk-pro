CREATE TABLE IF NOT EXISTS dwp_access_events (
 id bigserial PRIMARY KEY, tenant_id text NOT NULL, actor text NOT NULL,
 actor_name text NOT NULL DEFAULT '', event_type text NOT NULL, module_id text,
 project_id text, outcome text NOT NULL DEFAULT 'ok', user_agent text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dwp_access_events_tenant_date ON dwp_access_events(tenant_id,created_at);
CREATE TABLE IF NOT EXISTS dwp_device_pairings (
 token_hash text PRIMARY KEY, tenant_id text NOT NULL, actor text NOT NULL,
 slot text NOT NULL CHECK(slot IN ('iphone','hp-laptop')), expires_at timestamptz NOT NULL,
 consumed_at timestamptz
);
CREATE TABLE IF NOT EXISTS dwp_trusted_devices (
 tenant_id text NOT NULL, actor text NOT NULL, slot text NOT NULL CHECK(slot IN ('iphone','hp-laptop')),
 token_hash text NOT NULL UNIQUE, paired_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,actor,slot)
);
CREATE TABLE IF NOT EXISTS dwp_file_views (
 tenant_id text NOT NULL, actor text NOT NULL, file_id text NOT NULL, viewed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,actor,file_id)
);
REVOKE UPDATE, DELETE ON dwp_access_events FROM PUBLIC;
