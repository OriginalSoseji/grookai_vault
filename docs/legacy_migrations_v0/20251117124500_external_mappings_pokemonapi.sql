-- Ensure external_mappings supports pokemonapi mappings with unique (source, external_id)
-- Idempotent and additive.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'external_mappings'
  ) THEN
    -- Add index on card_print_id if missing
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = 'external_mappings_card_print_id_idx'
        AND n.nspname = 'public'
    ) THEN
      CREATE INDEX external_mappings_card_print_id_idx
        ON public.external_mappings (card_print_id);
    END IF;

    -- Add index on source if missing
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = 'external_mappings_source_idx'
        AND n.nspname = 'public'
    ) THEN
      CREATE INDEX external_mappings_source_idx
        ON public.external_mappings (source);
    END IF;

    -- Add uniqueness on (source, external_id) if missing
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'external_mappings_source_external_id_key'
        AND connamespace = 'public'::regnamespace
    ) THEN
      ALTER TABLE public.external_mappings
        ADD CONSTRAINT external_mappings_source_external_id_key
        UNIQUE (source, external_id);
    END IF;
  END IF;
END;
$$;
