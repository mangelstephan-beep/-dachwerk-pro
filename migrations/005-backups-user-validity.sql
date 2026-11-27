-- Wird von lib/backup-store.cjs und lib/user-admin.cjs beim ersten Zugriff automatisch angelegt.
-- Diese Datei dokumentiert das Schema für npm run db:setup.
CREATE TABLE IF NOT EXISTS dwp_backups (
 id bigserial PRIMARY KEY, tenant_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 created_by text NOT NULL DEFAULT '', created_by_name text NOT NULL DEFAULT '', kind text NOT NULL,
 source_created_at timestamptz, revision integer NOT NULL DEFAULT 0, projects integer NOT NULL DEFAULT 0,
 records integer NOT NULL DEFAULT 0, bytes integer NOT NULL DEFAULT 0, sha256 text NOT NULL DEFAULT '', data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS dwp_backups_tenant_date ON dwp_backups(tenant_id,created_at DESC);
