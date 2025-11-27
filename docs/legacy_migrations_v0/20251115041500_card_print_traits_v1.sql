-- card_print_traits: generic traits/attributes for card_prints
-- Examples:
--   trait_type: 'stamp', trait_value: 'pre-release'
--   trait_type: 'stamp', trait_value: 'staff'
--   trait_type: 'holo_pattern', trait_value: 'reverse-holo'
--   trait_type: 'promo_tag', trait_value: 'league'
--   trait_type: 'language', trait_value: 'english'
--   trait_type: 'border', trait_value: 'silver'

CREATE TABLE IF NOT EXISTS public.card_print_traits (
  id            bigserial PRIMARY KEY,
  card_print_id uuid NOT NULL,
  trait_type    text   NOT NULL, -- 'stamp', 'holo_pattern', 'foil', 'promo_tag', 'language', 'border', etc.
  trait_value   text   NOT NULL, -- 'pre-release', 'staff', 'reverse-holo', 'cosmos', 'full-art', 'english', etc.
  source        text   NOT NULL DEFAULT 'manual', -- 'manual', 'ai', 'import'
  confidence    numeric,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.card_print_traits IS
  'Generic traits for card_prints (stamp, holo pattern, promo tag, language, border, etc.), AI- and import-friendly.';
COMMENT ON COLUMN public.card_print_traits.trait_type IS
  'Trait category (e.g. stamp, holo_pattern, promo_tag, language, border, misprint).';
COMMENT ON COLUMN public.card_print_traits.trait_value IS
  'Trait value (e.g. pre-release, staff, reverse-holo, cosmos, english, etc.).';
COMMENT ON COLUMN public.card_print_traits.source IS
  'Origin of the trait: manual, ai, import.';
COMMENT ON COLUMN public.card_print_traits.confidence IS
  'Optional confidence score for AI- or import-derived traits.';

-- Indexes for fast lookups by card_print and traits
CREATE INDEX IF NOT EXISTS card_print_traits_card_print_id_idx
  ON public.card_print_traits (card_print_id);

CREATE INDEX IF NOT EXISTS card_print_traits_trait_type_value_idx
  ON public.card_print_traits (trait_type, trait_value);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'card_prints'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.constraint_schema = kcu.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = 'card_print_traits'
        AND kcu.column_name = 'card_print_id'
    ) THEN
      ALTER TABLE public.card_print_traits
        ADD CONSTRAINT card_print_traits_card_print_id_fkey
        FOREIGN KEY (card_print_id)
        REFERENCES public.card_prints(id)
        ON DELETE CASCADE;
    END IF;
  END IF;
END $$;
