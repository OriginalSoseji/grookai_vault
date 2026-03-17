begin;

create or replace function public.gv_condition_snapshots_block_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and old.gv_vi_id is null
     and new.gv_vi_id is not null
     and new.id = old.id
     and new.vault_item_id is not distinct from old.vault_item_id
     and new.user_id is not distinct from old.user_id
     and new.created_at is not distinct from old.created_at
     and new.images is not distinct from old.images
     and new.scan_quality is not distinct from old.scan_quality
     and new.measurements is not distinct from old.measurements
     and new.defects is not distinct from old.defects
     and new.confidence is not distinct from old.confidence
     and new.device_meta is not distinct from old.device_meta
     and new.fingerprint_id is not distinct from old.fingerprint_id
     and new.card_print_id is not distinct from old.card_print_id then
    return new;
  end if;

  raise exception 'condition_snapshots is append-only';
end;
$$;

comment on function public.gv_condition_snapshots_block_mutation() is
'Blocks all condition_snapshots updates/deletes except a one-time NULL->NON-NULL gv_vi_id assignment with no other field changes.';

commit;
