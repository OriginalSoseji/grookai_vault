-- Phase 8 embedding lookup RPC.
-- Adds pgvector-backed cosine nearest-neighbor lookup over the existing
-- public.card_embeddings.embedding double precision[] column.

create schema if not exists extensions;

create extension if not exists vector
  with schema extensions;

drop function if exists public.embedding_lookup_v1(double precision[], text, integer);

create or replace function public.embedding_lookup_v1(
  query_embedding double precision[],
  model_filter text default null,
  limit_n integer default 10
)
returns table (
  card_print_id uuid,
  model text,
  distance double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with input as (
    select
      query_embedding as embedding_array,
      query_embedding::extensions.vector as embedding_vector,
      array_length(query_embedding, 1) as dims
  )
  select
    ce.card_print_id,
    ce.model,
    (ce.embedding::extensions.vector <=> input.embedding_vector)::double precision as distance
  from public.card_embeddings ce
  cross join input
  where ce.embedding is not null
    and input.embedding_array is not null
    and input.dims is not null
    and input.dims > 0
    and array_length(ce.embedding, 1) = input.dims
    and (model_filter is null or ce.model = model_filter)
  order by ce.embedding::extensions.vector <=> input.embedding_vector asc,
           ce.card_print_id asc
  limit greatest(1, least(coalesce(limit_n, 10), 50));
$$;

grant execute on function public.embedding_lookup_v1(double precision[], text, integer) to authenticated;

grant execute on function public.embedding_lookup_v1(double precision[], text, integer) to service_role;
