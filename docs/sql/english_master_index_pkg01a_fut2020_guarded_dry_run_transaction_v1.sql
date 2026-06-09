-- English Master Index PKG-01A fut2020 guarded dry-run transaction V1
-- GENERATED ARTIFACT ONLY. This file has not been executed by Codex.
-- Scope: PKG-01A only. PKG-01B remains blocked.
-- Package fingerprint: 72fade7655349f73019df4449a269cb4c46bbca000d0f24203fdcbfa498ee1f8
-- Fresh snapshot hash: 1ef9660b69e6464625f93879986516fa5da4281f109c002ecba6837a2ee90c31
-- This artifact has no COMMIT path. It must roll back.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create temporary table pkg01a_approved_card_prints (
  card_print_id uuid primary key,
  before_set_code text,
  before_number text,
  before_name text,
  after_set_code text not null,
  after_number text not null,
  after_name text not null,
  expected_child_printings int not null,
  expected_finish_keys text[] not null
) on commit drop;

insert into pkg01a_approved_card_prints (
  card_print_id,
  before_set_code,
  before_number,
  before_name,
  after_set_code,
  after_number,
  after_name,
  expected_child_printings,
  expected_finish_keys
) values (
  'a676888d-19e0-4064-89aa-e67019af5b95'::uuid,
  null,
  '1',
  'Pikachu on the Ball',
  'fut2020',
  '1',
  'Pikachu on the Ball',
  1,
  array['holo']::text[]
);

-- Guard 1: PKG-01A must still be exactly one fut2020 row.
do $$
declare
  target_count int;
begin
  select count(*) into target_count from pkg01a_approved_card_prints;
  if target_count <> 1 then
    raise exception 'PKG-01A target count changed: %', target_count;
  end if;
end $$;

-- Guard 2: current DB state must match the fresh snapshot before any dry-run mutation.
do $$
declare
  drift_count int;
begin
  select count(*) into drift_count
  from pkg01a_approved_card_prints approved
  join public.card_prints cp on cp.id = approved.card_print_id
  where cp.set_code is distinct from approved.before_set_code
     or cp.number is distinct from approved.before_number
     or cp.name is distinct from approved.before_name;

  if drift_count <> 0 then
    raise exception 'PKG-01A before-state drift detected: %', drift_count;
  end if;
end $$;

-- Guard 3: no vault ownership references may exist for this pilot row.
do $$
declare
  vault_count int;
begin
  select count(*) into vault_count
  from public.vault_items vi
  join pkg01a_approved_card_prints approved on approved.card_print_id = vi.card_id;

  if vault_count <> 0 then
    raise exception 'PKG-01A vault reference blocker detected: %', vault_count;
  end if;
end $$;

-- Guard 4: child printing count and finish keys must match the verified pilot scope.
do $$
declare
  mismatch_count int;
begin
  select count(*) into mismatch_count
  from pkg01a_approved_card_prints approved
  where (
    select count(*)::int
    from public.card_printings cpr
    where cpr.card_print_id = approved.card_print_id
  ) <> approved.expected_child_printings
  or exists (
    select 1
    from public.card_printings cpr
    where cpr.card_print_id = approved.card_print_id
      and not (cpr.finish_key = any(approved.expected_finish_keys))
  )
  or exists (
    select 1
    from unnest(approved.expected_finish_keys) as expected(finish_key)
    where not exists (
      select 1
      from public.card_printings cpr
      where cpr.card_print_id = approved.card_print_id
        and cpr.finish_key = expected.finish_key
    )
  );

  if mismatch_count <> 0 then
    raise exception 'PKG-01A child printing/finish mismatch detected: %', mismatch_count;
  end if;
end $$;

-- Dry-run mutation. This transaction must be rolled back below.
update public.card_prints cp
set set_code = approved.after_set_code
from pkg01a_approved_card_prints approved
where cp.id = approved.card_print_id
  and cp.set_code is distinct from approved.after_set_code;

-- Guard 5: dry-run mutation must affect exactly the approved row and only the approved final value.
do $$
declare
  resolved_count int;
begin
  select count(*) into resolved_count
  from public.card_prints cp
  join pkg01a_approved_card_prints approved on approved.card_print_id = cp.id
  where cp.set_code = approved.after_set_code
    and cp.number = approved.after_number
    and cp.name = approved.after_name;

  if resolved_count <> 1 then
    raise exception 'PKG-01A dry-run final-state verification failed: %', resolved_count;
  end if;
end $$;

-- Required rollback-only ending for this dry-run artifact.
rollback;
