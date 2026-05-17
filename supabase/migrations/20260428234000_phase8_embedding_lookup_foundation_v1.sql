-- Phase 8 Embedding Fast Path foundation.
-- This migration keeps the existing public.card_embeddings table shape and adds
-- a small cosine lookup RPC for local/experimental validation.

create table if not exists public.card_embeddings (
  card_print_id uuid primary key references public.card_prints(id) on delete cascade,
  embedding double precision[],
  model text,
  created_at timestamptz not null default now()
);

comment on table public.card_embeddings is
  'Numeric embedding vectors per card_print, for AI search/matching.';

comment on column public.card_embeddings.embedding is
  'Array of float values representing the embedding vector (model-specific).';

comment on column public.card_embeddings.model is
  'Name/identifier of the embedding model used.';

create index if not exists card_embeddings_model_idx
  on public.card_embeddings (model);

create or replace function public.embedding_lookup_v1(
  query_embedding double precision[],
  model_filter text default null,
  limit_n integer default 10
)
returns table (
  card_print_id uuid,
  model text,
  distance double precision,
  similarity double precision
)
language sql
stable
security definer
set search_path = public
as $$
  with input_norm as (
    select
      query_embedding as embedding,
      array_length(query_embedding, 1) as dims,
      sqrt(sum(value * value)) as norm
    from unnest(query_embedding) as value
  ),
  scored as (
    select
      ce.card_print_id,
      ce.model,
      sum(q.value * e.value) as dot_product,
      sqrt(sum(e.value * e.value)) as candidate_norm,
      input_norm.norm as query_norm,
      count(*) as compared_dims,
      input_norm.dims as expected_dims,
      array_length(ce.embedding, 1) as candidate_dims
    from public.card_embeddings ce
    cross join input_norm
    join unnest(input_norm.embedding) with ordinality as q(value, ord)
      on true
    join unnest(ce.embedding) with ordinality as e(value, ord)
      on e.ord = q.ord
    where ce.embedding is not null
      and input_norm.embedding is not null
      and input_norm.dims is not null
      and input_norm.norm > 0
      and (model_filter is null or ce.model = model_filter)
    group by
      ce.card_print_id,
      ce.model,
      input_norm.norm,
      input_norm.dims,
      ce.embedding
  )
  select
    scored.card_print_id,
    scored.model,
    1.0 - (scored.dot_product / nullif(scored.query_norm * scored.candidate_norm, 0)) as distance,
    scored.dot_product / nullif(scored.query_norm * scored.candidate_norm, 0) as similarity
  from scored
  where scored.compared_dims = scored.expected_dims
    and scored.candidate_dims = scored.expected_dims
    and scored.candidate_norm > 0
  order by distance asc, scored.card_print_id asc
  limit greatest(1, least(coalesce(limit_n, 10), 50));
$$;

grant execute on function public.embedding_lookup_v1(double precision[], text, integer) to authenticated;

grant execute on function public.embedding_lookup_v1(double precision[], text, integer) to service_role;
