-- Adds uuid-based candidate array to mapping_conflicts while keeping the legacy bigint column.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'mapping_conflicts'
  ) THEN
    ALTER TABLE public.mapping_conflicts
      ADD COLUMN IF NOT EXISTS candidate_print_uuids uuid[];

    COMMENT ON COLUMN public.mapping_conflicts.candidate_print_uuids IS
      'Canonical candidate print IDs (uuid[]) for conflicts; new code should use this instead of candidate_print_ids (bigint[]).';

    COMMENT ON COLUMN public.mapping_conflicts.candidate_print_ids IS
      'LEGACY: historical candidate IDs stored as bigint[] for older schemas; kept for backward compatibility. New code should use candidate_print_uuids.';

    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = 'mapping_conflicts_candidate_print_uuids_gin_idx'
        AND n.nspname = 'public'
    ) THEN
      CREATE INDEX mapping_conflicts_candidate_print_uuids_gin_idx
        ON public.mapping_conflicts
        USING GIN (candidate_print_uuids);
    END IF;
  END IF;
END;
$$;
