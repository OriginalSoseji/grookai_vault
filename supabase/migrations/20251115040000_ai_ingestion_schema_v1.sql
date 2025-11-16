-- AI-ready ingestion schema v1 (additive, non-breaking)

-- 2.1 Extend card_prints with AI/identity fields
-- 1) Add AI/identity columns to card_prints (all nullable, additive)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'card_prints'
      AND column_name  = 'print_identity_key'
  ) THEN
    ALTER TABLE public.card_prints
      ADD COLUMN print_identity_key text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'card_prints'
      AND column_name  = 'ai_metadata'
  ) THEN
    ALTER TABLE public.card_prints
      ADD COLUMN ai_metadata jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'card_prints'
      AND column_name  = 'image_hash'
  ) THEN
    ALTER TABLE public.card_prints
      ADD COLUMN image_hash text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'card_prints'
      AND column_name  = 'data_quality_flags'
  ) THEN
    ALTER TABLE public.card_prints
      ADD COLUMN data_quality_flags jsonb;
  END IF;
END $$;

-- 2) Unique index on print_identity_key (if we set it in the future)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class
    WHERE relname = 'card_prints_print_identity_key_uq'
      AND relkind = 'i'
  ) THEN
    CREATE UNIQUE INDEX card_prints_print_identity_key_uq
      ON public.card_prints (print_identity_key)
      WHERE print_identity_key IS NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.card_prints.print_identity_key IS
  'Stable identity string for a print (e.g. set_code-number_plain-variant). Ideal for AI models to target.';
COMMENT ON COLUMN public.card_prints.ai_metadata IS
  'JSON metadata for AI classification, OCR output, model hints, etc.';
COMMENT ON COLUMN public.card_prints.image_hash IS
  'Optional perceptual hash for card image (duplicate detection, visual matching).';
COMMENT ON COLUMN public.card_prints.data_quality_flags IS
  'JSON object with data quality flags (missing_image, suspect_mapping, ai_low_confidence, needs_review, etc.).';

-- 2.2 Create raw_imports table (raw payloads)
-- 3) raw_imports: store raw external/AI payloads before processing

CREATE TABLE IF NOT EXISTS public.raw_imports (
  id            bigserial PRIMARY KEY,
  payload       jsonb       NOT NULL,
  source        text        NOT NULL, -- e.g. 'justtcg', 'ai_scan', 'csv', 'manual'
  status        text        NOT NULL DEFAULT 'pending', -- 'pending', 'processed', 'failed', 'ai_review'
  ingested_at   timestamptz NOT NULL DEFAULT now(),
  processed_at  timestamptz,
  notes         text
);

COMMENT ON TABLE public.raw_imports IS
  'Raw import payloads from external sources or AI scans before normalization.';
COMMENT ON COLUMN public.raw_imports.source IS
  'Origin of the payload: justtcg, ai_scan, csv, manual, etc.';
COMMENT ON COLUMN public.raw_imports.status IS
  'Lifecycle status: pending, processed, failed, ai_review.';

CREATE INDEX IF NOT EXISTS raw_imports_status_idx
  ON public.raw_imports (status);
CREATE INDEX IF NOT EXISTS raw_imports_ingested_at_idx
  ON public.raw_imports (ingested_at);

-- 2.3 Create mapping_conflicts table (unresolved matches)
-- 4) mapping_conflicts: unresolved / ambiguous matches for human or later AI review

CREATE TABLE IF NOT EXISTS public.mapping_conflicts (
  id                  bigserial PRIMARY KEY,
  raw_import_id       bigint REFERENCES public.raw_imports(id) ON DELETE CASCADE,
  candidate_print_ids bigint[],
  ai_confidence       numeric,
  reason              text,
  requires_human      boolean     NOT NULL DEFAULT true,
  resolved_by         text,
  resolved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.mapping_conflicts IS
  'Records unresolved/ambiguous mappings between raw imports and card_prints for review.';
COMMENT ON COLUMN public.mapping_conflicts.candidate_print_ids IS
  'Array of candidate card_print IDs that might match this raw import.';
COMMENT ON COLUMN public.mapping_conflicts.requires_human IS
  'True if this conflict currently requires human review.';

-- 2.4 Create external_mappings table (unified external IDs)
-- 5) external_mappings: canonical mapping from card_prints to any external catalog IDs

CREATE TABLE IF NOT EXISTS public.external_mappings (
  id             bigserial PRIMARY KEY,
  card_print_id  uuid NOT NULL REFERENCES public.card_prints(id) ON DELETE CASCADE,
  source         text   NOT NULL, -- 'tcgplayer', 'justtcg', 'ebay', 'manual', etc.
  external_id    text   NOT NULL,
  meta           jsonb,
  synced_at      timestamptz NOT NULL DEFAULT now(),
  active         boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE public.external_mappings IS
  'Canonical mapping table for all external IDs (tcgplayer, justtcg, ebay, etc.) per card_print.';
COMMENT ON COLUMN public.external_mappings.source IS
  'External system name: tcgplayer, justtcg, ebay, manual, etc.';

-- Unique per print/source/external_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.external_mappings'::regclass
      AND contype = 'u'
      AND conname = 'external_mappings_unique_per_source'
  ) THEN
    ALTER TABLE public.external_mappings
      ADD CONSTRAINT external_mappings_unique_per_source
        UNIQUE (card_print_id, source, external_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS external_mappings_source_external_id_idx
  ON public.external_mappings (source, external_id);
CREATE INDEX IF NOT EXISTS external_mappings_card_print_id_idx
  ON public.external_mappings (card_print_id);

-- 2.5 Create ingestion_jobs table (generic job queue)
-- 6) ingestion_jobs: generic job queue for imports / backfills

CREATE TABLE IF NOT EXISTS public.ingestion_jobs (
  id              bigserial PRIMARY KEY,
  job_type        text      NOT NULL, -- 'import_sets', 'import_prices', 'backfill_mappings', etc.
  payload         jsonb,
  status          text      NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'succeeded', 'failed'
  attempts        integer   NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz,
  locked_by       text,
  locked_at       timestamptz
);

COMMENT ON TABLE public.ingestion_jobs IS
  'Generic ingestion job queue for backend workers (sets, prices, backfills, etc.).';
COMMENT ON COLUMN public.ingestion_jobs.job_type IS
  'Logical job type (import_sets, import_prices, etc.).';
COMMENT ON COLUMN public.ingestion_jobs.status IS
  'Job status: pending, running, succeeded, failed.';

CREATE INDEX IF NOT EXISTS ingestion_jobs_status_idx
  ON public.ingestion_jobs (status);
CREATE INDEX IF NOT EXISTS ingestion_jobs_job_type_idx
  ON public.ingestion_jobs (job_type);
CREATE INDEX IF NOT EXISTS ingestion_jobs_created_at_idx
  ON public.ingestion_jobs (created_at);

-- 2.6 Create ai_decision_logs table (explainable AI decisions)
-- 7) ai_decision_logs: detailed logs of AI decisions for explainability

CREATE TABLE IF NOT EXISTS public.ai_decision_logs (
  id             bigserial PRIMARY KEY,
  raw_import_id  bigint REFERENCES public.raw_imports(id) ON DELETE SET NULL,
  card_print_id  uuid REFERENCES public.card_prints(id) ON DELETE SET NULL,
  model          text,
  input          jsonb,
  output         jsonb,
  confidence     numeric,
  explain        text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_decision_logs IS
  'Detailed AI decision logs for mapping/import decisions (inputs, outputs, confidence, explanation).';
COMMENT ON COLUMN public.ai_decision_logs.model IS
  'Name or identifier of the AI model used.';
COMMENT ON COLUMN public.ai_decision_logs.input IS
  'Input payload provided to the model.';
COMMENT ON COLUMN public.ai_decision_logs.output IS
  'Raw output from the model.';
COMMENT ON COLUMN public.ai_decision_logs.explain IS
  'Human-readable explanation of why the decision was made, if available.';

CREATE INDEX IF NOT EXISTS ai_decision_logs_card_print_id_idx
  ON public.ai_decision_logs (card_print_id);
CREATE INDEX IF NOT EXISTS ai_decision_logs_raw_import_id_idx
  ON public.ai_decision_logs (raw_import_id);
CREATE INDEX IF NOT EXISTS ai_decision_logs_created_at_idx
  ON public.ai_decision_logs (created_at);

-- 2.7 Create card_embeddings table (per-print embeddings)
-- 8) card_embeddings: store numeric embeddings per card_print for AI search/matching

CREATE TABLE IF NOT EXISTS public.card_embeddings (
  card_print_id  uuid PRIMARY KEY REFERENCES public.card_prints(id) ON DELETE CASCADE,
  embedding      double precision[],
  model          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.card_embeddings IS
  'Numeric embedding vectors per card_print, for AI search/matching.';
COMMENT ON COLUMN public.card_embeddings.embedding IS
  'Array of float values representing the embedding vector (model-specific).';
COMMENT ON COLUMN public.card_embeddings.model IS
  'Name/identifier of the embedding model used.';

CREATE INDEX IF NOT EXISTS card_embeddings_model_idx
  ON public.card_embeddings (model);

