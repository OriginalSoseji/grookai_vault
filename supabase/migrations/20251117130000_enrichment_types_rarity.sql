-- Enrichment v1.1: add types/rarity/supertype/card_category/legacy_rarity to card_print_traits
-- Idempotent and additive; no drops or renames.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'card_print_traits'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'card_print_traits'
        AND column_name = 'types'
    ) THEN
      ALTER TABLE public.card_print_traits
        ADD COLUMN types text[];
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'card_print_traits'
        AND column_name = 'rarity'
    ) THEN
      ALTER TABLE public.card_print_traits
        ADD COLUMN rarity text;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'card_print_traits'
        AND column_name = 'supertype'
    ) THEN
      ALTER TABLE public.card_print_traits
        ADD COLUMN supertype text;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'card_print_traits'
        AND column_name = 'card_category'
    ) THEN
      ALTER TABLE public.card_print_traits
        ADD COLUMN card_category text;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'card_print_traits'
        AND column_name = 'legacy_rarity'
    ) THEN
      ALTER TABLE public.card_print_traits
        ADD COLUMN legacy_rarity text;
    END IF;
  END IF;
END;
$$;

COMMENT ON COLUMN public.card_print_traits.types IS
  'Pokemon types (array) standardized from PokemonAPI.';
COMMENT ON COLUMN public.card_print_traits.rarity IS
  'Standardized rarity from PokemonAPI.';
COMMENT ON COLUMN public.card_print_traits.supertype IS
  'PokemonAPI supertype (Pokemon, Trainer, Energy).';
COMMENT ON COLUMN public.card_print_traits.card_category IS
  'Derived category/subtype (Basic, Stage 1, Item, Supporter, etc.).';
COMMENT ON COLUMN public.card_print_traits.legacy_rarity IS
  'Previous rarity value preserved when standardizing to PokemonAPI rarity.';
