-- DRIFT_RESOLUTION_REMOTE_TABLES_V1
-- Source of truth for admin_change_checkpoints DDL:
-- .tmp/remote_public_schema.sql (remote pg_dump extract)

CREATE TABLE IF NOT EXISTS public.admin_change_checkpoints (
  id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  label text NOT NULL,
  db text DEFAULT current_database() NOT NULL,
  db_user text DEFAULT CURRENT_USER NOT NULL,
  server_ip text,
  server_port integer,
  meta jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS public.admin_change_checkpoints_id_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

ALTER SEQUENCE public.admin_change_checkpoints_id_seq
  OWNED BY public.admin_change_checkpoints.id;

ALTER TABLE ONLY public.admin_change_checkpoints
  ALTER COLUMN id SET DEFAULT nextval('public.admin_change_checkpoints_id_seq'::regclass);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_change_checkpoints_pkey'
      AND conrelid = 'public.admin_change_checkpoints'::regclass
  ) THEN
    ALTER TABLE ONLY public.admin_change_checkpoints
      ADD CONSTRAINT admin_change_checkpoints_pkey PRIMARY KEY (id);
  END IF;
END
$$;

ALTER TABLE public.admin_change_checkpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_only ON public.admin_change_checkpoints;
CREATE POLICY service_role_only
ON public.admin_change_checkpoints
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP TABLE IF EXISTS public.ingestion_queue;
DROP TABLE IF EXISTS public.backup_card_printings_me025_20260226;
DROP TABLE IF EXISTS public.backup_card_prints_image_url_tcgdex_norm_v1;
DROP TABLE IF EXISTS public.backup_card_prints_sma_noncanon_44;
