-- Align canonical card_prints.variant_key with the Variant Key Null Contract.
-- Base identity is represented by NULL, not the empty-string sentinel.
alter table public.card_prints
alter column variant_key drop default;

alter table public.card_prints
alter column variant_key drop not null;
