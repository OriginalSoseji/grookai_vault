-- External cache and provider stats (gateway support)
create extension if not exists pgcrypto;

create table if not exists public.external_cache (
  cache_key  text primary key,
  provider   text not null,
  endpoint   text not null,
  query_hash text not null,
  payload    jsonb not null,
  status     int not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists idx_external_cache_exp on public.external_cache (expires_at);

create table if not exists public.external_provider_stats (
  id bigserial primary key,
  provider   text not null,
  metric     text not null,
  value      numeric not null,
  window     text not null default '1d',
  observed_at timestamptz not null default now()
);
create index if not exists idx_provider_stats_time on public.external_provider_stats (provider, observed_at desc);
