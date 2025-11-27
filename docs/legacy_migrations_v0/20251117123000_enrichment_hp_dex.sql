-- Enrichment v1: add hp and national_dex to card_print_traits (idempotent, additive).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'card_print_traits'
  ) THEN
    -- Add hp column if missing
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'card_print_traits'
        AND column_name = 'hp'
    ) THEN
      ALTER TABLE public.card_print_traits
        ADD COLUMN hp integer;
    END IF;

    -- Add national_dex column if missing
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'card_print_traits'
        AND column_name = 'national_dex'
    ) THEN
      ALTER TABLE public.card_print_traits
        ADD COLUMN national_dex integer;
    END IF;
  END IF;
END;
$$;

COMMENT ON COLUMN public.card_print_traits.hp IS
  'Numeric HP for the card_print (Pokemon enrichment v1).';
COMMENT ON COLUMN public.card_print_traits.national_dex IS
  'National Pokédex number for the card_print (Pokemon enrichment v1).';
