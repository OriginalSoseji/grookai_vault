begin;

create unique index if not exists uq_card_print_identity_active_card_print_id
  on public.card_print_identity (card_print_id)
  where is_active = true;

create index if not exists idx_card_print_identity_card_print_id
  on public.card_print_identity (card_print_id);

create index if not exists idx_card_print_identity_identity_domain
  on public.card_print_identity (identity_domain);

create unique index if not exists uq_card_print_identity_active_domain_hash
  on public.card_print_identity (identity_domain, identity_key_version, identity_key_hash)
  where is_active = true;

create index if not exists idx_card_print_identity_domain_set_code_number
  on public.card_print_identity (identity_domain, set_code_identity, printed_number);

create index if not exists idx_card_print_identity_domain_normalized_name_not_null
  on public.card_print_identity (identity_domain, normalized_printed_name)
  where normalized_printed_name is not null;

commit;
