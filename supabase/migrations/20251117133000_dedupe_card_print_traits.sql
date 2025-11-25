-- Deduplicate card_print_traits to ensure one row per card_print_id and enforce uniqueness.
-- Idempotent: guarded constraint addition; merge before delete to keep best data.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'card_print_traits'
  ) THEN

    -- Merge aggregated values into the keeper row (latest by created_at, then id)
    WITH ranked AS (
      SELECT
        id,
        card_print_id,
        hp,
        national_dex,
        types,
        rarity,
        supertype,
        card_category,
        legacy_rarity,
        created_at,
        row_number() OVER (PARTITION BY card_print_id ORDER BY created_at DESC, id DESC) AS rn
      FROM card_print_traits
    ),
    agg AS (
      SELECT
        card_print_id,
        max(hp) AS hp,
        max(national_dex) AS national_dex,
        (
          SELECT t.types
          FROM card_print_traits t
          WHERE t.card_print_id = a.card_print_id
          ORDER BY (t.types IS NOT NULL) DESC, coalesce(array_length(t.types, 1), 0) DESC, t.id DESC
          LIMIT 1
        ) AS types,
        max(rarity) AS rarity,
        max(supertype) AS supertype,
        max(card_category) AS card_category,
        max(legacy_rarity) AS legacy_rarity
      FROM card_print_traits a
      GROUP BY card_print_id
    ),
    keepers AS (
      SELECT * FROM ranked WHERE rn = 1
    )
    UPDATE card_print_traits t
    SET
      hp = COALESCE(a.hp, t.hp),
      national_dex = COALESCE(a.national_dex, t.national_dex),
      types = COALESCE(a.types, t.types),
      rarity = COALESCE(a.rarity, t.rarity),
      supertype = COALESCE(a.supertype, t.supertype),
      card_category = COALESCE(a.card_category, t.card_category),
      legacy_rarity = COALESCE(a.legacy_rarity, t.legacy_rarity)
    FROM agg a
    WHERE t.card_print_id = a.card_print_id
      AND t.id = (
        SELECT k.id FROM keepers k WHERE k.card_print_id = t.card_print_id
      );

    -- Delete duplicate rows (rn > 1)
    DELETE FROM card_print_traits
    WHERE id IN (
      SELECT id FROM (
        SELECT id, row_number() OVER (PARTITION BY card_print_id ORDER BY created_at DESC, id DESC) AS rn
        FROM card_print_traits
      ) d
      WHERE rn > 1
    );

    -- Add unique constraint on card_print_id if missing
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'card_print_traits_card_print_id_key'
        AND connamespace = 'public'::regnamespace
    ) THEN
      ALTER TABLE public.card_print_traits
        ADD CONSTRAINT card_print_traits_card_print_id_key
        UNIQUE (card_print_id);
    END IF;
  END IF;
END;
$$;
