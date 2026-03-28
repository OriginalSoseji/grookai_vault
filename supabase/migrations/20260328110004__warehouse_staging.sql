set search_path = public;

create table public.canon_warehouse_promotion_staging (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,

  approved_action_type text not null,
  frozen_payload jsonb not null,

  founder_approved_by_user_id uuid,
  founder_approved_at timestamptz,

  staged_by_user_id uuid not null,
  staged_at timestamptz not null default now(),

  execution_status text not null,
  execution_attempts int not null default 0,

  last_error text,
  last_attempted_at timestamptz,
  executed_at timestamptz
);

comment on table public.canon_warehouse_promotion_staging is
'Frozen execution boundary for founder-approved warehouse promotions. Source of truth for promotion execution and idempotency.';
