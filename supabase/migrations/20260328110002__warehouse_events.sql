set search_path = public;

create table public.canon_warehouse_candidate_events (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,
  staging_id uuid,

  event_type text not null,
  action text not null,
  previous_state text,
  next_state text,

  actor_user_id uuid,
  actor_type text not null,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.canon_warehouse_candidate_events is
'Append-only audit/event log for warehouse candidates, including state changes, founder actions, staging, and promotion events.';
