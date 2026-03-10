UPDATE public.sets
SET printed_set_abbrev = source -> 'pokemonapi' ->> 'ptcgoCode'
WHERE game = 'pokemon'
  AND printed_set_abbrev IS NULL
  AND source -> 'pokemonapi' ->> 'ptcgoCode' IS NOT NULL;
