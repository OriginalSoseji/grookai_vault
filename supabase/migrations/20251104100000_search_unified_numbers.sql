-- Grookai Vault — Unified search for numbers: "49", "049", "049/203", and mixed queries with names.

-- Ensure extensions (idempotent)
create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- Name normalizer: lowercase + unaccent + strip non [a-z0-9 space]
create or replace function public.gv_norm_name(txt text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(unaccent(coalesce(txt,''))), '[^a-z0-9 ]', '', 'g')
$$;

-- Number int extractor:
-- accepts "49", "049", "#049", "049/203", "49a", returns 49
create or replace function public.gv_num_int(txt text)
returns int
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(txt,''), '^\D*?(\d+)(?:\/\d+)?\D*$', '\1'), '')::int
$$;

-- Total int extractor (for x/y like 049/203), returns 203 or null if missing
create or replace function public.gv_total_int(txt text)
returns int
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(txt,''), '^\D*\d+\/(\d+)\D*$', '\1'), '')::int
$$;

-- Normalized search surface (parallel, non-breaking)
drop view if exists public.v_cards_search_v2 cascade;
do $$
begin
  -- First ensure the base table exists at all
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='card_prints'
  ) then
    -- Now tailor columns if supertype/subtypes are present
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='card_prints' and column_name='supertype'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='card_prints' and column_name='subtypes'
    ) then
      create or replace view public.v_cards_search_v2 as
      select
        cp.id,
        cp.name,
        cp.number,
        cp.set_code,
        cp.rarity,
        cp.supertype,
        cp.subtypes,
        public.gv_norm_name(cp.name) as name_norm,
        public.gv_num_int(cp.number) as number_int,
        public.gv_total_int(cp.number) as total_int
      from public.card_prints cp;
    else
      create or replace view public.v_cards_search_v2 as
      select
        cp.id,
        cp.name,
        cp.number,
        cp.set_code,
        cp.rarity,
        null::text as supertype,
        null::text[] as subtypes,
        public.gv_norm_name(cp.name) as name_norm,
        public.gv_num_int(cp.number) as number_int,
        public.gv_total_int(cp.number) as total_int
      from public.card_prints cp;
    end if;
  else
    -- Provide an empty shim when card_prints is absent, to keep callers stable
    create or replace view public.v_cards_search_v2 as
    select
      null::uuid as id,
      null::text as name,
      null::text as number,
      null::text as set_code,
      null::text as rarity,
      null::text as supertype,
      null::text[] as subtypes,
      null::text as name_norm,
      null::int as number_int,
      null::int as total_int
    where false;
  end if;
end $$;

-- Helpful indexes


-- RPC: unified search that parses the raw query once on the server
-- Call via PostgREST: POST /rest/v1/rpc/search_cards with {"q":"Pikachu 049/203","limit":50}
create or replace function public.search_cards(q text, "limit" int default 50)
returns table(
  id uuid,
  name text,
  number text,
  set_code text,
  rarity text,
  supertype text,
  subtypes text[],
  score numeric
)
language sql
stable
as $$
  with
  cleaned as (
    select
      public.gv_norm_name(q) as q_name_norm,
      public.gv_num_int(q)   as q_num,
      public.gv_total_int(q) as q_total
  ),
  ranked as (
    select
      v.id, v.name, v.number, v.set_code, v.rarity, v.supertype, v.subtypes,
      v.number_int, v.total_int,
      -- scoring:
      --  +4 exact number match
      --  +2 total match (if provided)
      --  + trigram similarity to normalized name (0..1)
      (case when c.q_num is not null and v.number_int = c.q_num then 4 else 0 end
       + case when c.q_total is not null and v.total_int = c.q_total then 2 else 0 end
       + greatest(similarity(v.name_norm, c.q_name_norm), 0)
      )::numeric as score
    from public.v_cards_search_v2 v
    cross join cleaned c
    where
      -- at least one of these should engage:
      (c.q_num is not null and v.number_int = c.q_num)
      or (c.q_name_norm <> '' and v.name_norm % c.q_name_norm)
      or (c.q_total is not null and v.total_int = c.q_total)
  )
  select id, name, number, set_code, rarity, supertype, subtypes, score from ranked
  order by score desc, number_int asc nulls last
  limit greatest("limit", 1)
$$;

-- Optional convenience RPC with set filter (kept separate to avoid changing first RPC)
create or replace function public.search_cards_in_set(q text, set_code text, "limit" int default 50)
returns setof public.v_cards_search_v2
language sql
stable
as $$
  with c as (
    select public.gv_num_int(q) as q_num, public.gv_norm_name(q) as q_name_norm
  )
  select v.*
  from public.v_cards_search_v2 v, c
  where v.set_code = set_code
    and (
      (c.q_num is not null and v.number_int = c.q_num)
      or (c.q_name_norm <> '' and v.name_norm % c.q_name_norm)
    )
  limit greatest("limit", 1)
$$;
