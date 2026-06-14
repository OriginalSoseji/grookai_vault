-- PKG-35B-EXU-UNOWN-QUESTION-NORMAL-CHILD-DELETE GUARDED DRY-RUN TRANSACTION V1
-- Generated for review only. This artifact intentionally ends with ROLLBACK.
-- Package fingerprint: d890f6e2b240b132645614ab3231a29317b6a53549b1104ccc68bd64a2cbb2b6
-- Scope: 1 unsupported normal child delete for exu Unown ?.
-- No parent writes. No migrations. No global apply.

begin;

create temporary table pkg35b_targets (
  card_print_id uuid primary key,
  unsupported_child_printing_id uuid not null unique,
  supported_child_printing_id uuid not null unique,
  set_code text not null,
  card_number text not null,
  card_name text not null
) on commit drop;

insert into pkg35b_targets (
  card_print_id,
  unsupported_child_printing_id,
  supported_child_printing_id,
  set_code,
  card_number,
  card_name
) values
  ('8ee10c61-bbe4-4a20-aadb-4b994928c9de'::uuid, '284b0760-afc0-4a7f-911b-ace215c4feb0'::uuid, 'b252ca9b-922a-4173-9987-a64749a56c45'::uuid, 'exu', '?', 'Unown');

do $$
declare
  v_targets integer;
  v_parent_mismatch integer;
  v_unsupported_child_mismatch integer;
  v_supported_child_mismatch integer;
  v_child_dependency_refs integer;
  v_deleted_children integer;
  ref record;
begin
  select count(*) into v_targets from pkg35b_targets;
  if v_targets <> 1 then
    raise exception 'PKG-35B-EXU-UNOWN-QUESTION-NORMAL-CHILD-DELETE target guard failed: expected 1, got %', v_targets;
  end if;

  select count(*) into v_parent_mismatch
  from pkg35b_targets t
  left join public.card_prints cp on cp.id = t.card_print_id
  where cp.id is null
     or cp.set_code <> t.set_code
     or cp.set_code <> 'exu'
     or cp.number <> t.card_number
     or cp.number <> '?'
     or cp.name <> t.card_name
     or cp.name <> 'Unown';
  if v_parent_mismatch <> 0 then
    raise exception 'PKG-35B-EXU-UNOWN-QUESTION-NORMAL-CHILD-DELETE parent guard failed: %', v_parent_mismatch;
  end if;

  select count(*) into v_unsupported_child_mismatch
  from pkg35b_targets t
  left join public.card_printings cpr
    on cpr.id = t.unsupported_child_printing_id
   and cpr.card_print_id = t.card_print_id
  where cpr.id is null
     or cpr.finish_key <> 'normal';
  if v_unsupported_child_mismatch <> 0 then
    raise exception 'PKG-35B-EXU-UNOWN-QUESTION-NORMAL-CHILD-DELETE unsupported child guard failed: %', v_unsupported_child_mismatch;
  end if;

  select count(*) into v_supported_child_mismatch
  from pkg35b_targets t
  left join public.card_printings cpr
    on cpr.id = t.supported_child_printing_id
   and cpr.card_print_id = t.card_print_id
  where cpr.id is null
     or cpr.finish_key <> 'holo';
  if v_supported_child_mismatch <> 0 then
    raise exception 'PKG-35B-EXU-UNOWN-QUESTION-NORMAL-CHILD-DELETE supported holo child guard failed: %', v_supported_child_mismatch;
  end if;

  for ref in
    select tc.table_schema, tc.table_name, kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and ccu.table_name = 'card_printings'
      and ccu.column_name = 'id'
  loop
    execute format(
      'select count(*) from %I.%I ref join pg_temp.pkg35b_targets t on ref.%I = t.unsupported_child_printing_id',
      ref.table_schema,
      ref.table_name,
      ref.column_name
    ) into v_child_dependency_refs;
    if v_child_dependency_refs <> 0 then
      raise exception 'PKG-35B-EXU-UNOWN-QUESTION-NORMAL-CHILD-DELETE child dependency guard failed: %.%.% has % refs',
        ref.table_schema, ref.table_name, ref.column_name, v_child_dependency_refs;
    end if;
  end loop;

  delete from public.card_printings cpr
  using pkg35b_targets t
  where cpr.id = t.unsupported_child_printing_id;
  get diagnostics v_deleted_children = row_count;
  if v_deleted_children <> 1 then
    raise exception 'PKG-35B-EXU-UNOWN-QUESTION-NORMAL-CHILD-DELETE child delete guard failed: expected 1, got %', v_deleted_children;
  end if;

  raise notice 'PKG-35B-EXU-UNOWN-QUESTION-NORMAL-CHILD-DELETE dry-run passed: unsupported normal children deleted %, supported holo children preserved %, fingerprint d890f6e2b240b132645614ab3231a29317b6a53549b1104ccc68bd64a2cbb2b6',
    v_deleted_children, 1;
end $$;

rollback;
