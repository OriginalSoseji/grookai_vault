DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sets'
      AND column_name = 'printed_set_abbrev'
  ) THEN

    UPDATE public.sets
    SET printed_set_abbrev = source -> 'pokemonapi' ->> 'ptcgoCode'
    WHERE game = 'pokemon'
      AND printed_set_abbrev IS NULL
      AND source -> 'pokemonapi' ->> 'ptcgoCode' IS NOT NULL;

  END IF;
END $$;