-- Add PRINTING_MODEL_V2 metadata columns to public.card_printings.
-- Minimal additive migration: preserves existing rows, uniqueness, and child classification.

BEGIN;

ALTER TABLE public.card_printings
  ADD COLUMN IF NOT EXISTS is_provisional boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS provenance_source text NULL,
  ADD COLUMN IF NOT EXISTS provenance_ref text NULL,
  ADD COLUMN IF NOT EXISTS created_by text NULL;

COMMENT ON COLUMN public.card_printings.is_provisional IS
  'Explicit provisional flag for canon-sensitive child printings. Stable bounded finish ingestion writes false.';

COMMENT ON COLUMN public.card_printings.provenance_source IS
  'Creation authority for the child-printing row, such as a controlled ingestion lane or audited transformation path.';

COMMENT ON COLUMN public.card_printings.provenance_ref IS
  'Optional upstream identifier or audit reference used to trace the child-printing row to its creation evidence.';

COMMENT ON COLUMN public.card_printings.created_by IS
  'Process identity that wrote the child-printing row, such as an ingestion worker, audit process, or migration.';

COMMIT;
