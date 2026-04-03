begin;

alter table public.card_prints
  drop constraint if exists uq_card_prints_identity;

commit;
