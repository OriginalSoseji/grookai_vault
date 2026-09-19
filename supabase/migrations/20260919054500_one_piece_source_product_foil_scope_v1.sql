begin;

set local lock_timeout = '3s';
set local statement_timeout = '30s';

-- Admit the literal source-product Foil designation for One Piece. This is not
-- Pokemon Holo, an inferred foil pattern, or a pricing publication change.
do $$
declare
  current_row public.finish_keys%rowtype;
  changed integer;
begin
  select * into current_row from public.finish_keys where key = 'foil' for update;
  if not found then
    raise exception 'Existing foil registry row required';
  end if;
  if current_row.label is distinct from 'Foil'
    or current_row.sort_order is distinct from 60
    or current_row.is_active is distinct from true
    or (current_row.meta - 'game_scope') is distinct from
       '{"source_contract":"MTG_CANONICAL_CATALOG_IMPORT_CONTRACT_V1","publication_scope":"mtg_v1"}'::jsonb then
    raise exception 'Foil registry authority drift';
  end if;
  if current_row.meta->'game_scope' = '["mtg","one_piece"]'::jsonb then
    return;
  end if;
  if current_row.meta->'game_scope' is distinct from '["mtg"]'::jsonb then
    raise exception 'Foil registry scope drift';
  end if;
  update public.finish_keys
    set meta = jsonb_set(meta, '{game_scope}', '["mtg","one_piece"]'::jsonb, false)
    where key = 'foil' and meta = current_row.meta;
  get diagnostics changed = row_count;
  if changed <> 1 then
    raise exception 'Foil registry compare-and-swap failed';
  end if;
end;
$$;

commit;
