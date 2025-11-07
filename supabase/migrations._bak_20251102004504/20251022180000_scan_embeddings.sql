create extension if not exists vector;

alter table if exists public.card_prints
  add column if not exists image_embedding vector(768);

create index if not exists card_prints_image_embedding_ivfflat
  on public.card_prints using ivfflat (image_embedding vector_cosine_ops) with (lists = 100);

create or replace function public.cardprints_search_by_embedding(
  query vector, top_k integer default 10
) returns table (
  card_print_id uuid,
  set_code text,
  number text,
  lang text,
  score float
) language sql stable as $$
  select id, set_code, number, lang,
         1 - (image_embedding <=> query) as score
  from public.card_prints
  where image_embedding is not null
  order by image_embedding <=> query
  limit top_k;
$$;

