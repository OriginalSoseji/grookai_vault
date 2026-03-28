set search_path = public;

create extension if not exists pgcrypto;

create table public.canon_warehouse_candidates (
  id uuid primary key default gen_random_uuid(),

  submitted_by_user_id uuid not null,
  intake_channel text not null,
  submission_type text not null,

  notes text not null,
  tcgplayer_id text,
  submission_intent text not null,

  state text not null,

  claimed_identity_payload jsonb not null default '{}'::jsonb,
  reference_hints_payload jsonb not null default '{}'::jsonb,

  current_review_hold_reason text,
  current_staging_id uuid,

  interpreter_decision text,
  interpreter_reason_code text,
  interpreter_explanation text,
  interpreter_resolved_finish_key text,
  needs_promotion_review boolean not null default false,
  proposed_action_type text,

  founder_approved_by_user_id uuid,
  founder_approved_at timestamptz,
  founder_approval_notes text,

  rejected_by_user_id uuid,
  rejected_at timestamptz,
  rejection_notes text,

  archived_by_user_id uuid,
  archived_at timestamptz,
  archive_notes text,

  promotion_result_type text,
  promoted_card_print_id uuid,
  promoted_card_printing_id uuid,
  promoted_image_target_type text,
  promoted_image_target_id uuid,
  promoted_by_user_id uuid,
  promoted_at timestamptz,
  promotion_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.canon_warehouse_candidates is
'Warehouse core lifecycle record. Owns candidate state, interpreter summary, founder approval summary, staging pointer, and promotion summary.';
