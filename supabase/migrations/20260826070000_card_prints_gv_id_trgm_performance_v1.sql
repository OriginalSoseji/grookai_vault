-- CARD_PRINTS_GV_ID_TRGM_PERFORMANCE_V1
-- Bounds case-insensitive exact, prefix, and contains lookups used by image
-- routing and collector search without blocking canonical writes.

create index concurrently if not exists card_prints_gv_id_trgm_idx
  on public.card_prints using gin (gv_id gin_trgm_ops)
  where gv_id is not null;

comment on index public.card_prints_gv_id_trgm_idx is
'Bounds PostgREST gv_id ILIKE lookups used by canonical image routing and collector search.';
