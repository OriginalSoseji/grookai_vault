begin;

alter table public.condition_snapshots
  add column if not exists gv_vi_id text null;

comment on column public.condition_snapshots.gv_vi_id is
'Canonical GVVI object identity for deterministic condition snapshot reconciliation. Null means unresolved or historical-only.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'condition_snapshots_gv_vi_id_fkey'
  ) then
    alter table public.condition_snapshots
      add constraint condition_snapshots_gv_vi_id_fkey
      foreign key (gv_vi_id)
      references public.vault_item_instances(gv_vi_id);
  end if;
end
$$;

create index if not exists condition_snapshots_gv_vi_id_idx
  on public.condition_snapshots (gv_vi_id);

alter table public.condition_snapshots disable trigger trg_condition_snapshots_block_update;

with deterministic_candidates as (
  select
    cs.id as snapshot_id,
    min(vii.gv_vi_id) as gv_vi_id
  from public.condition_snapshots cs
  join public.vault_items vi
    on vi.id = cs.vault_item_id
  join public.vault_item_instances vii
    on vii.user_id = cs.user_id
   and vii.archived_at is null
   and vii.gv_vi_id is not null
   and (
     vii.legacy_vault_item_id = cs.vault_item_id
     or vii.card_print_id = coalesce(cs.card_print_id, vi.card_id)
   )
  where cs.gv_vi_id is null
  group by cs.id
  having count(*) = 1
)
update public.condition_snapshots cs
set gv_vi_id = dc.gv_vi_id
from deterministic_candidates dc
where cs.id = dc.snapshot_id
  and cs.gv_vi_id is null;

alter table public.condition_snapshots enable trigger trg_condition_snapshots_block_update;

commit;
