create table if not exists public.web_events (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_name text not null,
  user_id uuid null,
  anonymous_id text null,
  path text null,
  gv_id text null,
  set_code text null,
  search_query text null,
  metadata jsonb not null default '{}'::jsonb,
  constraint web_events_pkey primary key (id)
);

create index if not exists web_events_created_at_idx
  on public.web_events (created_at desc);

create index if not exists web_events_event_name_created_at_idx
  on public.web_events (event_name, created_at desc);

create index if not exists web_events_user_id_created_at_idx
  on public.web_events (user_id, created_at desc);

create index if not exists web_events_gv_id_created_at_idx
  on public.web_events (gv_id, created_at desc)
  where gv_id is not null;

create index if not exists web_events_set_code_created_at_idx
  on public.web_events (set_code, created_at desc)
  where set_code is not null;

alter table public.web_events enable row level security;
