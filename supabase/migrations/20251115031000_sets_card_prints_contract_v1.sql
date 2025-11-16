-- sets/card_prints contract v1

-- 2.1 Ensure sets has metadata + unique key
-- 1) Ensure created_at / updated_at / last_synced_at exist on sets
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'sets'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sets'
        AND column_name = 'created_at'
    ) THEN
      ALTER TABLE public.sets
        ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sets'
        AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE public.sets
        ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sets'
        AND column_name = 'last_synced_at'
    ) THEN
      ALTER TABLE public.sets
        ADD COLUMN last_synced_at timestamptz;
    END IF;
  END IF;
END $$;

-- 2) Enforce uniqueness on (game, code) as natural key for sets
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'sets'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.sets'::regclass
        AND contype = 'u'
        AND conname = 'sets_game_code_key'
    ) THEN
      ALTER TABLE public.sets
        ADD CONSTRAINT sets_game_code_key UNIQUE (game, code);
    END IF;
  END IF;
END $$;

-- 2.2 Tighten card_prints (FK, uniqueness, metadata)
-- 3) Ensure created_at and last_synced_at exist on card_prints
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
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'card_prints'
        AND column_name = 'created_at'
    ) THEN
      ALTER TABLE public.card_prints
        ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'card_prints'
        AND column_name = 'last_synced_at'
    ) THEN
      ALTER TABLE public.card_prints
        ADD COLUMN last_synced_at timestamptz;
    END IF;
  END IF;
END $$;

-- 4) Make sure set_id is NOT NULL
DO $$
DECLARE
  v_nulls bigint;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'card_prints'
  ) THEN
    SELECT COUNT(*) INTO v_nulls
    FROM public.card_prints
    WHERE set_id IS NULL;

    IF v_nulls = 0 THEN
      ALTER TABLE public.card_prints
        ALTER COLUMN set_id SET NOT NULL;
    ELSE
      RAISE NOTICE 'Skipping NOT NULL on card_prints.set_id: % rows still NULL', v_nulls;
    END IF;
  END IF;
END $$;

-- 5) Add or ensure foreign key from card_prints.set_id to sets.id
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
      FROM pg_constraint
      WHERE conrelid = 'public.card_prints'::regclass
        AND contype = 'f'
        AND conname = 'card_prints_set_id_fkey'
    ) THEN
      ALTER TABLE public.card_prints
        ADD CONSTRAINT card_prints_set_id_fkey
          FOREIGN KEY (set_id)
          REFERENCES public.sets (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT;
    END IF;
  END IF;
END $$;

-- 6) Unique identity per print: (set_id, number_plain, COALESCE(variant_key, ''))
-- Use a unique index on this combination.
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
      FROM pg_class
      WHERE relname = 'card_prints_uq_set_num_variant'
        AND relkind = 'i'
    ) THEN
      CREATE UNIQUE INDEX card_prints_uq_set_num_variant
        ON public.card_prints (
          set_id,
          number_plain,
          COALESCE(variant_key, '')
        );
    END IF;
  END IF;
END $$;

-- 2.3 Mark cards as legacy
-- 7) Mark cards as legacy for documentation purposes
COMMENT ON TABLE public.cards IS
  'LEGACY TABLE: superseded by card_prints. Do not build new features on this.';

-- 2.4 Add indexes that match how you’ll use card_prints
-- 8) Indexes to support lookups and joins

-- Index on set_id for fast joins/filtering
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
      FROM pg_class
      WHERE relname = 'card_prints_set_id_idx'
        AND relkind = 'i'
    ) THEN
      CREATE INDEX card_prints_set_id_idx
        ON public.card_prints (set_id);
    END IF;
  END IF;
END $$;

-- Index on (set_code, number_plain) for lookups by visible identifiers
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
      FROM pg_class
      WHERE relname = 'card_prints_set_code_number_plain_idx'
        AND relkind = 'i'
    ) THEN
      CREATE INDEX card_prints_set_code_number_plain_idx
        ON public.card_prints (set_code, number_plain);
    END IF;
  END IF;
END $$;

-- Index on tcgplayer_id (nullable) so optional TCG mappings are still fast
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
      FROM pg_class
      WHERE relname = 'card_prints_tcgplayer_id_idx'
        AND relkind = 'i'
    ) THEN
      CREATE INDEX card_prints_tcgplayer_id_idx
        ON public.card_prints (tcgplayer_id);
    END IF;
  END IF;
END $$;
