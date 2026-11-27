CREATE TABLE IF NOT EXISTS dwp_project_state (
  tenant_id text PRIMARY KEY,
  revision bigint NOT NULL DEFAULT 0,
  data jsonb NOT NULL,
  audit_hash text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dwp_project_audit (
  tenant_id text NOT NULL,
  revision bigint NOT NULL,
  actor text NOT NULL,
  method text NOT NULL,
  previous_hash text NOT NULL,
  event_hash text NOT NULL,
  events jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,revision)
);
REVOKE UPDATE, DELETE ON dwp_project_audit FROM PUBLIC;
