-- Synthetic local mixed-case coordinates; never production.
begin;
do $$begin
 if current_setting('max_worker_processes')<>'0' or (select count(*) from public.card_prints)<>1313 or (select count(*) from auth.users)<>1 or (select count(*) from public.vault_item_instances)<>15 or (select count(*) from supabase_migrations.schema_migrations) not in(507,508) then raise exception 'LATIOS_MIXED_ID_FIXTURE_PRECONDITION';end if;end$$;
update public.card_prints set gv_id='GV-PK-TK-'||set_code||'-'||number where set_code in('tk-ex-latio','tk1b');
update public.card_printings p set printing_gv_id=c.gv_id||'-'||upper(p.finish_key) from public.card_prints c where c.id=p.card_print_id and c.set_code in('tk-ex-latio','tk1b');
update public.vault_items v set gv_id=c.gv_id from public.card_prints c where c.id=v.card_id and c.set_code in('tk-ex-latio','tk1b');
commit;
