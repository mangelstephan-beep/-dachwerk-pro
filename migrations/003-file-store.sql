CREATE TABLE IF NOT EXISTS dwp_files (
 id text PRIMARY KEY, tenant_id text NOT NULL, actor text NOT NULL,
 record_id text NOT NULL, project_id text NOT NULL, name text NOT NULL,
 mime text NOT NULL, size integer NOT NULL CHECK(size>0 AND size<=67108864),
 sha256 text NOT NULL, ready boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dwp_files_tenant ON dwp_files(tenant_id,record_id);
CREATE TABLE IF NOT EXISTS dwp_file_chunks (
 file_id text NOT NULL REFERENCES dwp_files(id) ON DELETE CASCADE,
 part integer NOT NULL CHECK(part>=0), data bytea NOT NULL,
 PRIMARY KEY(file_id,part)
);
