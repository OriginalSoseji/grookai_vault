-- CHILD_PRINTING_IMAGE_STORAGE_V1
-- Adds nullable finish-specific image fields to child printings.
-- Parent card_prints image fields remain canonical for parent routes and are never
-- overwritten by this lane.

alter table public.card_printings
  add column if not exists image_source text null,
  add column if not exists image_path text null,
  add column if not exists image_url text null,
  add column if not exists image_alt_url text null,
  add column if not exists image_status text null,
  add column if not exists image_note text null;

comment on column public.card_printings.image_source is
  'Finish-specific image source for a child printing. Nullable during rollout; does not replace card_prints image fields.';
comment on column public.card_printings.image_path is
  'Reviewed storage path for a finish-specific child printing image.';
comment on column public.card_printings.image_url is
  'Reviewed external/public URL for a finish-specific child printing image.';
comment on column public.card_printings.image_alt_url is
  'Reviewed alternate external/public URL for a finish-specific child printing image.';
comment on column public.card_printings.image_status is
  'Finish-specific image status. Null means fall back to parent/base image behavior.';
comment on column public.card_printings.image_note is
  'Reviewer note for finish-specific child printing image provenance or caveats.';

alter table public.canon_warehouse_candidates
  drop constraint if exists chk_candidates_proposed_action_type;

alter table public.canon_warehouse_candidates
  add constraint chk_candidates_proposed_action_type
  check (
    proposed_action_type is null
    or proposed_action_type in (
      'CREATE_CARD_PRINT',
      'CREATE_CARD_PRINTING',
      'ENRICH_CANON_IMAGE',
      'ENRICH_CARD_PRINTING_IMAGE',
      'BLOCKED_NO_PROMOTION',
      'REVIEW_REQUIRED'
    )
  );

alter table public.canon_warehouse_promotion_staging
  drop constraint if exists chk_staging_approved_action;

alter table public.canon_warehouse_promotion_staging
  add constraint chk_staging_approved_action
  check (
    approved_action_type in (
      'CREATE_CARD_PRINT',
      'CREATE_CARD_PRINTING',
      'ENRICH_CANON_IMAGE',
      'ENRICH_CARD_PRINTING_IMAGE'
    )
  );
