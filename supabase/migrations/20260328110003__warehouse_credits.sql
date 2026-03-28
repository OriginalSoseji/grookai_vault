set search_path = public;

create table public.canon_warehouse_candidate_credits (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,
  user_id uuid not null,

  credit_type text not null,
  credit_status text not null,

  canonical_target_type text,
  canonical_target_id uuid,

  notes text,
  created_at timestamptz not null default now()
);

comment on table public.canon_warehouse_candidate_credits is
'Contributor credit ledger for warehouse candidates. Credits survive rejection, archive, approval, and promotion.';
