set search_path = public;

create table public.canon_warehouse_candidate_evidence (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,

  evidence_kind text not null,
  evidence_slot text,

  identity_snapshot_id uuid,
  condition_snapshot_id uuid,
  identity_scan_event_id uuid,

  storage_path text,
  metadata_payload jsonb not null default '{}'::jsonb,

  created_by_user_id uuid not null,
  created_at timestamptz not null default now()
);

comment on table public.canon_warehouse_candidate_evidence is
'Append-only evidence attachment table for canon warehouse candidates.';
