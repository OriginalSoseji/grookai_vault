-- CHILD_PRINTING_PUBLIC_IDENTITY_V1
-- Nullable child printing public identity layer.
-- This migration does not assign values and does not modify parent card_prints.gv_id.

alter table public.card_printings
  add column if not exists printing_gv_id text;

comment on column public.card_printings.printing_gv_id is
  'Finish-specific public Grookai identity for child printings. Parent card_prints.gv_id remains the parent print identity. Nullable during governed rollout.';

create unique index if not exists card_printings_printing_gv_id_key
  on public.card_printings (printing_gv_id)
  where printing_gv_id is not null;
