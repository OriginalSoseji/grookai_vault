-- ?? Grookai Vault Baseline Seed (deterministic only)
-- Seed only gate/config rows required for workers and contracts.
-- Idempotent by design.

insert into public.set_code_classification (set_code, is_canon, canon_source, notes, pokemonapi_set_id, tcgdex_set_id)
values
  ('rc', true, 'unknown', null, null, null),
  ('swsh12.5', true, 'unknown', null, null, null)
on conflict (set_code) do nothing;
