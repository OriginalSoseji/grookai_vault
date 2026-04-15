begin;

-- REPRINT_ANTHOLOGY_IDENTITY_MODEL_V1
--
-- Purpose:
-- - replace the raw cel25c uniqueness carve-out with declared set-level identity
--   behavior on public.sets
-- - preserve standard-set number/variant uniqueness semantics
-- - preserve lawful reprint anthology same-number coexistence through
--   print_identity_key-driven uniqueness
--
-- V1 declared models:
-- - standard
-- - reprint_anthology
--
-- V1 anthology assignment:
-- - cel25c only

alter table public.sets
  add column if not exists identity_model text;

comment on column public.sets.identity_model is
  'Declared set-level identity behavior. V1 values: standard, reprint_anthology.';

alter table public.card_prints
  add column if not exists set_identity_model text;

comment on column public.card_prints.set_identity_model is
  'Denormalized copy of public.sets.identity_model used for deterministic card_prints uniqueness enforcement.';

create or replace function public.resolve_set_identity_model(p_set_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
    (
      select s.identity_model
      from public.sets s
      where s.id = p_set_id
    ),
    'standard'
  );
$$;

comment on function public.resolve_set_identity_model(uuid) is
  'Resolves the declared set-level identity model for a card_print row.';

create or replace function public.card_prints_assign_set_identity_model()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.set_identity_model := public.resolve_set_identity_model(new.set_id);
  return new;
end;
$$;

create or replace function public.propagate_set_identity_model_to_card_prints()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.identity_model is distinct from old.identity_model then
    update public.card_prints cp
    set set_identity_model = new.identity_model
    where cp.set_id = new.id
      and cp.set_identity_model is distinct from new.identity_model;
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ck_sets_identity_model_v1'
  ) then
    alter table public.sets
      add constraint ck_sets_identity_model_v1
      check (identity_model in ('standard', 'reprint_anthology'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ck_card_prints_set_identity_model_v1'
  ) then
    alter table public.card_prints
      add constraint ck_card_prints_set_identity_model_v1
      check (set_identity_model in ('standard', 'reprint_anthology'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ck_card_prints_reprint_anthology_requires_pik_v1'
  ) then
    alter table public.card_prints
      add constraint ck_card_prints_reprint_anthology_requires_pik_v1
      check (
        set_identity_model <> 'reprint_anthology'
        or nullif(btrim(print_identity_key), '') is not null
      );
  end if;
end $$;

update public.sets
set identity_model = 'standard'
where identity_model is null;

update public.sets
set identity_model = 'reprint_anthology'
where id = '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid
  and code = 'cel25c';

alter table public.sets
  alter column identity_model set default 'standard';

alter table public.sets
  alter column identity_model set not null;

update public.card_prints cp
set set_identity_model = public.resolve_set_identity_model(cp.set_id)
where cp.set_identity_model is distinct from public.resolve_set_identity_model(cp.set_id);

alter table public.card_prints
  alter column set_identity_model set default 'standard';

alter table public.card_prints
  alter column set_identity_model set not null;

drop trigger if exists trg_card_prints_assign_set_identity_model on public.card_prints;

create trigger trg_card_prints_assign_set_identity_model
before insert or update of set_id, set_identity_model
on public.card_prints
for each row
execute function public.card_prints_assign_set_identity_model();

drop trigger if exists trg_sets_propagate_identity_model_to_card_prints on public.sets;

create trigger trg_sets_propagate_identity_model_to_card_prints
after update of identity_model
on public.sets
for each row
execute function public.propagate_set_identity_model_to_card_prints();

do $$
declare
  v_cel25c_set_id constant uuid := '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid;
  v_cel25c_exists boolean;
  v_cel25c_identity_model text;
  v_other_anthology_sets integer;
  v_helper_mismatch_count integer;
  v_missing_anthology_pik_count integer;
  v_standard_duplicate_groups integer;
  v_anthology_duplicate_groups integer;
begin
  select exists (
    select 1
    from public.sets s
    where s.id = v_cel25c_set_id
      and s.code = 'cel25c'
  )
  into v_cel25c_exists;

  if v_cel25c_exists then
    select s.identity_model
    into v_cel25c_identity_model
    from public.sets s
    where s.id = v_cel25c_set_id
      and s.code = 'cel25c';

    if v_cel25c_identity_model is distinct from 'reprint_anthology' then
      raise exception
        'reprint anthology migration aborted: cel25c identity_model is %, expected reprint_anthology',
        v_cel25c_identity_model;
    end if;
  else
    raise notice
      'cel25c canonical set row not present; anthology assignment verification skipped';
  end if;

  select count(*)
  into v_other_anthology_sets
  from public.sets s
  where s.identity_model = 'reprint_anthology'
    and (not v_cel25c_exists or s.id <> v_cel25c_set_id);

  if v_other_anthology_sets <> 0 then
    raise exception
      'reprint anthology migration aborted: found % non-cel25c anthology sets before audit',
      v_other_anthology_sets;
  end if;

  select count(*)
  into v_helper_mismatch_count
  from public.card_prints cp
  join public.sets s
    on s.id = cp.set_id
  where cp.set_identity_model is distinct from s.identity_model;

  if v_helper_mismatch_count <> 0 then
    raise exception
      'reprint anthology migration aborted: % card_print rows disagree with owning set identity_model',
      v_helper_mismatch_count;
  end if;

  select count(*)
  into v_missing_anthology_pik_count
  from public.card_prints cp
  where cp.set_identity_model = 'reprint_anthology'
    and nullif(btrim(cp.print_identity_key), '') is null;

  if v_missing_anthology_pik_count <> 0 then
    raise exception
      'reprint anthology migration aborted: % anthology rows are missing print_identity_key',
      v_missing_anthology_pik_count;
  end if;

  select count(*)
  into v_standard_duplicate_groups
  from (
    select
      cp.set_id,
      cp.number_plain,
      coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
      coalesce(cp.variant_key, '') as variant_key
    from public.card_prints cp
    where cp.set_identity_model = 'standard'
      and cp.set_id is not null
      and cp.number_plain is not null
    group by
      cp.set_id,
      cp.number_plain,
      coalesce(cp.printed_identity_modifier, ''),
      coalesce(cp.variant_key, '')
    having count(*) > 1
  ) dupes;

  if v_standard_duplicate_groups <> 0 then
    raise exception
      'reprint anthology migration aborted: % duplicate groups would violate standard-set uniqueness',
      v_standard_duplicate_groups;
  end if;

  select count(*)
  into v_anthology_duplicate_groups
  from (
    select
      cp.set_id,
      cp.number_plain,
      cp.print_identity_key,
      coalesce(cp.variant_key, '') as variant_key
    from public.card_prints cp
    where cp.set_identity_model = 'reprint_anthology'
      and cp.set_id is not null
      and cp.number_plain is not null
      and cp.print_identity_key is not null
    group by
      cp.set_id,
      cp.number_plain,
      cp.print_identity_key,
      coalesce(cp.variant_key, '')
    having count(*) > 1
  ) dupes;

  if v_anthology_duplicate_groups <> 0 then
    raise exception
      'reprint anthology migration aborted: % duplicate groups would violate anthology print identity uniqueness',
      v_anthology_duplicate_groups;
  end if;
end $$;

create unique index if not exists uq_card_prints_identity_v2_standard_sets
on public.card_prints (
  set_id,
  number_plain,
  coalesce(printed_identity_modifier, ''),
  coalesce(variant_key, '')
)
where set_id is not null
  and number_plain is not null
  and set_identity_model = 'standard';

drop index if exists public.uq_card_prints_identity_v2_non_cel25c;

drop index if exists public.uq_card_prints_identity_v3_print_identity;

create unique index if not exists uq_card_prints_identity_v3_print_identity
on public.card_prints (
  set_id,
  number_plain,
  print_identity_key,
  coalesce(variant_key, '')
)
where set_id is not null
  and number_plain is not null
  and print_identity_key is not null
  and set_identity_model = 'reprint_anthology';

commit;
