-- Synthetic extension only; run in an unlinked, worker-disabled local lab.
begin;
do $$begin
 if current_setting('max_worker_processes')<>'0' or (select count(*) from public.card_prints)<>1313 or (select count(*) from auth.users)<>1 or (select count(*) from public.vault_item_instances)<>9
 then raise exception 'MCDONALDS_2021_LOCAL_FIXTURE_PRECONDITION'; end if;
end$$;
update public.card_prints set name='LOCAL REPLAY MCD21 CARD '||number,identity_domain='pokemon_eng_standard' where set_code in('2021swsh','mcd21');
insert into public.card_printings(card_print_id,finish_key,created_by)
select p.id,f.finish,'local_mcd21_fixture' from public.card_prints p cross join(values('normal'),('holo'))f(finish)
where p.set_code in('2021swsh','mcd21') and coalesce(p.variant_key,'')='';
update public.card_printings printing set printing_gv_id=parent.gv_id||'-'||upper(printing.finish_key)
from public.card_prints parent where parent.id=printing.card_print_id and parent.set_code in('2021swsh','mcd21');
insert into public.vault_items(id,user_id,card_id,name,gv_id,qty)
select '10000000-0000-0000-0000-000000000020','10000000-0000-0000-0000-000000000016',p.id,p.name,p.gv_id,3 from public.card_prints p where p.set_code='2021swsh' and p.number='1';
insert into public.vault_item_instances(id,user_id,card_print_id,card_printing_id,legacy_vault_item_id,gv_vi_id)
select gen_random_uuid(),'10000000-0000-0000-0000-000000000016',p.id,case when n<=2 then child.id else null end,
 '10000000-0000-0000-0000-000000000020','GVVI-LOCAL-MCD21-'||n::text
from generate_series(1,3)n cross join public.card_prints p join public.card_printings child on child.card_print_id=p.id and child.finish_key='normal'
where p.set_code='2021swsh' and p.number='1';
commit;
