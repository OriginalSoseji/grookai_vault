set search_path = public;

alter table public.external_discovery_candidates
  add column if not exists resolved_set_code text null,
  add column if not exists card_print_id uuid null;

comment on column public.external_discovery_candidates.resolved_set_code is
'Resolved canonical set_code for deterministic non-canon staging rows once a governed resolver has assigned a single target deck/set.';

comment on column public.external_discovery_candidates.card_print_id is
'Resolved canonical card_prints.id for non-canon staging rows after deterministic staging resolution. Null until staging review resolves uniquely.';

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'external_discovery_candidates'
      and constraint_name = 'external_discovery_candidates_card_print_id_fkey'
  ) then
    alter table public.external_discovery_candidates
      add constraint external_discovery_candidates_card_print_id_fkey
      foreign key (card_print_id)
      references public.card_prints(id)
      on delete set null;
  end if;
end $$;

alter table public.external_discovery_candidates
  drop constraint if exists external_discovery_candidates_match_status_check;

alter table public.external_discovery_candidates
  add constraint external_discovery_candidates_match_status_check
  check (match_status in ('UNMATCHED', 'AMBIGUOUS', 'RESOLVED'));

alter table public.external_discovery_candidates
  drop constraint if exists external_discovery_candidates_resolution_shape_check;

alter table public.external_discovery_candidates
  add constraint external_discovery_candidates_resolution_shape_check
  check (
    (
      match_status = 'RESOLVED'
      and resolved_set_code is not null
      and card_print_id is not null
    )
    or (
      match_status in ('UNMATCHED', 'AMBIGUOUS')
      and resolved_set_code is null
      and card_print_id is null
    )
  );

create index if not exists idx_ext_disc_resolved_set_code
  on public.external_discovery_candidates (resolved_set_code)
  where resolved_set_code is not null;

create index if not exists idx_ext_disc_card_print_id
  on public.external_discovery_candidates (card_print_id)
  where card_print_id is not null;
