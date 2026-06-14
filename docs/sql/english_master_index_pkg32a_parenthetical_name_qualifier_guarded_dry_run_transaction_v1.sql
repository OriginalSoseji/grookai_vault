-- PKG-32A-PARENTHETICAL-NAME-QUALIFIER-PARENT-UPDATES GUARDED DRY-RUN TRANSACTION V1
-- Generated for review only. This artifact intentionally ends with ROLLBACK.
-- Package fingerprint: ee81961d70dd94f3fcee5718efcc745bc6bcba47ad08e0e86c83ee2355509298
-- Scope: 6 parent name qualifier updates; no child writes.
-- No migrations. No global apply.

begin;

create temporary table pkg32a_targets (
  card_print_id uuid primary key,
  set_code text not null,
  number text not null,
  number_plain text,
  old_name text not null,
  new_name text not null,
  expected_child_rows integer not null
) on commit drop;

insert into pkg32a_targets (
  card_print_id,
  set_code,
  number,
  number_plain,
  old_name,
  new_name,
  expected_child_rows
) values
  ('3cc9f3b8-542b-4418-bef5-bb2e2131d0d4'::uuid, 'sv01', '189', '189', 'Professor''s Research', 'Professor''s Research (Professor Sada)', 2),
  ('79b57853-1668-4c92-9bcf-c6a99e13370e'::uuid, 'sv01', '240', '240', 'Professor''s Research', 'Professor''s Research (Professor Sada)', 1),
  ('69cfbb61-17b4-44cf-aa78-28bb61195c64'::uuid, 'sv01', '241', '241', 'Professor''s Research', 'Professor''s Research (Professor Turo)', 1),
  ('f429bfbc-8a25-4203-b036-f63f7027a0d8'::uuid, 'sv02', '172', '172', 'Boss''s Orders', 'Boss''s Orders (Ghetsis)', 3),
  ('012d9ef6-75d0-43d1-b4dc-d4dfe131f45f'::uuid, 'sv02', '248', '248', 'Boss''s Orders', 'Boss''s Orders (Ghetsis)', 1),
  ('e380fe60-9e2e-49b2-9913-9c3285de4693'::uuid, 'sv02', '265', '265', 'Boss''s Orders', 'Boss''s Orders (Ghetsis)', 1);

do $$
declare
  v_targets integer;
  v_bad_parent_refs integer;
  v_duplicate_target_parent integer;
  v_identity_refs integer;
  v_updated integer;
  v_child_rows integer;
begin
  select count(*) into v_targets from pkg32a_targets;
  if v_targets <> 6 then
    raise exception 'PKG-32A-PARENTHETICAL-NAME-QUALIFIER-PARENT-UPDATES target guard failed: expected 6, got %', v_targets;
  end if;

  select count(*) into v_bad_parent_refs
  from pkg32a_targets t
  left join public.card_prints cp on cp.id = t.card_print_id
  where cp.id is null
     or lower(cp.set_code) <> lower(t.set_code)
     or lower(coalesce(cp.number, '')) <> lower(t.number)
     or lower(coalesce(cp.number_plain, '')) <> lower(coalesce(t.number_plain, ''))
     or cp.name <> t.old_name;
  if v_bad_parent_refs <> 0 then
    raise exception 'PKG-32A-PARENTHETICAL-NAME-QUALIFIER-PARENT-UPDATES parent ownership guard failed: %', v_bad_parent_refs;
  end if;

  select count(*) into v_duplicate_target_parent
  from pkg32a_targets t
  join public.card_prints cp
    on cp.id <> t.card_print_id
   and lower(cp.set_code) = lower(t.set_code)
   and lower(coalesce(cp.number, '')) = lower(t.number)
   and cp.name = t.new_name;
  if v_duplicate_target_parent <> 0 then
    raise exception 'PKG-32A-PARENTHETICAL-NAME-QUALIFIER-PARENT-UPDATES duplicate target parent guard failed: %', v_duplicate_target_parent;
  end if;

  if to_regclass('public.card_print_identity') is not null then
    select count(*) into v_identity_refs
    from public.card_print_identity cpi
    join pkg32a_targets t on t.card_print_id = cpi.card_print_id
    where cpi.is_active is true;
  else
    v_identity_refs := 0;
  end if;
  if v_identity_refs <> 0 then
    raise exception 'PKG-32A-PARENTHETICAL-NAME-QUALIFIER-PARENT-UPDATES active identity guard failed: %', v_identity_refs;
  end if;

  select count(*) into v_child_rows
  from public.card_printings cpr
  join pkg32a_targets t on t.card_print_id = cpr.card_print_id;
  if v_child_rows <> (select sum(expected_child_rows)::integer from pkg32a_targets) then
    raise exception 'PKG-32A-PARENTHETICAL-NAME-QUALIFIER-PARENT-UPDATES child scope guard failed: expected %, got %',
      (select sum(expected_child_rows)::integer from pkg32a_targets), v_child_rows;
  end if;

  update public.card_prints cp
  set name = t.new_name
  from pkg32a_targets t
  where cp.id = t.card_print_id;
  get diagnostics v_updated = row_count;
  if v_updated <> 6 then
    raise exception 'PKG-32A-PARENTHETICAL-NAME-QUALIFIER-PARENT-UPDATES update guard failed: expected 6, got %', v_updated;
  end if;

  raise notice 'PKG-32A-PARENTHETICAL-NAME-QUALIFIER-PARENT-UPDATES dry-run passed: parent names updated %, child writes 0, fingerprint ee81961d70dd94f3fcee5718efcc745bc6bcba47ad08e0e86c83ee2355509298', v_updated;
end $$;

rollback;
