-- ============================================================================
-- Condition Assist V1: enforce append-only immutability for condition_snapshots
-- Rule: UPDATE/DELETE must always fail, regardless of RLS/policy changes.
-- ============================================================================

create or replace function public.gv_condition_snapshots_block_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'condition_snapshots is append-only';
end;
$$;

drop trigger if exists trg_condition_snapshots_block_update on public.condition_snapshots;
create trigger trg_condition_snapshots_block_update
before update on public.condition_snapshots
for each row execute function public.gv_condition_snapshots_block_mutation();

drop trigger if exists trg_condition_snapshots_block_delete on public.condition_snapshots;
create trigger trg_condition_snapshots_block_delete
before delete on public.condition_snapshots
for each row execute function public.gv_condition_snapshots_block_mutation();
