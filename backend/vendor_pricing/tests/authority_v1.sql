set local statement_timeout='45s';
create function pg_temp.check_pricing(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'PRICING_PROOF_FAILED: %',label;end if;end$$;
create function pg_temp.reject_pricing(command text,expected text) returns void language plpgsql as $$
declare reason text;begin begin execute command;exception when others then reason:=sqlerrm;end;
 if reason is null or position(expected in reason)=0 then raise exception 'PRICING_EXPECTED_REJECTION: %, got %',expected,reason;end if;end$$;
insert into auth.users(id,email) values('ac000000-0000-4000-8000-000000000001','vendor-a@fixture.invalid'),('ac000000-0000-4000-8000-000000000002','vendor-b@fixture.invalid');
insert into public.user_entitlements(user_id,tier,role,features) values
 ('ac000000-0000-4000-8000-000000000001','vendor','vendor','{"vendor_tools":true}'),('ac000000-0000-4000-8000-000000000002','vendor','vendor','{"vendor_tools":true}');
set local request.jwt.claim.sub='';set local request.jwt.claim.role='';
set local request.jwt.claims='{"role":"authenticated","sub":"ac000000-0000-4000-8000-000000000001"}';
create temporary table pricing_fixture_state(key text primary key,value jsonb);
create function pg_temp.pricing_service(action text,data jsonb default '{}') returns jsonb language sql as $$
 select public.vendor_pricing_service_v1(action,coalesce((select value from pg_temp.pricing_fixture_state where key='run'),'{}'::jsonb)||data);
$$;
do $$declare r jsonb; s jsonb; rule uuid; parent uuid; printing uuid; legacy uuid:=gen_random_uuid(); copy uuid:=gen_random_uuid(); old_copy uuid:=gen_random_uuid(); definition jsonb:='{"markupBps":1000,"flatMinor":0,"rounding":"up","stepMinor":50,"minMinor":1,"maxMinor":null}';begin
 perform pg_temp.check_pricing(grookai_vendor_pricing.calculate(10.10,definition)=1150,'markup then up');
 perform pg_temp.check_pricing(grookai_vendor_pricing.calculate(10,definition)=1100,'exact boundary unchanged');
 perform pg_temp.check_pricing(grookai_vendor_pricing.calculate(10.10,definition||'{"rounding":"down"}')=1100,'round down');
 perform pg_temp.check_pricing(grookai_vendor_pricing.calculate(10.10,definition||'{"rounding":"nearest"}')=1100,'nearest');
 perform pg_temp.check_pricing(grookai_vendor_pricing.calculate(10.15,definition||'{"rounding":"none"}')=1117,'exact half cent');
 perform pg_temp.check_pricing(grookai_vendor_pricing.calculate(1,definition||'{"markupBps":-5000,"flatMinor":-100,"minMinor":25}')=25,'explicit floor after adjustments');
 perform pg_temp.check_pricing(grookai_vendor_pricing.calculate(100,definition||'{"maxMinor":999}')=999,'cap takes precedence over rounding');
 perform pg_temp.reject_pricing($q$select grookai_vendor_pricing.calculate(10,'{"markupBps":0,"flatMinor":0,"rounding":"up","stepMinor":0}')$q$,'vendor_pricing_invalid_rule');
 perform pg_temp.reject_pricing($q$select grookai_vendor_pricing.calculate(10,'{"markupBps":0,"flatMinor":0,"rounding":"up","stepMinor":1,"minMinor":"1"}')$q$,'vendor_pricing_invalid_rule');
 r:=public.vendor_pricing_v1('save_rule',jsonb_build_object('requestId',gen_random_uuid(),'name','My default','definition',definition));
 perform pg_temp.check_pricing((r->>'ok')::boolean,'save preset');rule:=(r->'rules'->0->>'id')::uuid;
 r:=public.vendor_pricing_v1('save_settings',jsonb_build_object('requestId',gen_random_uuid(),'expectedRevision',1,'defaultRuleId',rule,'autoForNew',true));
 perform pg_temp.check_pricing((r->>'ok')::boolean,'set default');
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 perform public.vendor_pricing_service_v1('control','{"expectedRevision":0,"enabled":true}');
 r:=public.vendor_pricing_service_v1('run_start',jsonb_build_object('runId','ac000000-0000-4000-8000-000000000020'));
 insert into pricing_fixture_state values('run',jsonb_build_object('runId','ac000000-0000-4000-8000-000000000020','fence',(r->>'fence')::bigint));
 perform set_config('request.jwt.claims','{"role":"authenticated","sub":"ac000000-0000-4000-8000-000000000001"}',true);
 select id into strict parent from public.card_prints order by id limit 1;
 insert into public.card_printings(card_print_id,finish_key,printing_gv_id) values(parent,'normal','GV-PK-VENDOR-PRICING-PROOF-NORMAL') returning id into printing;
 insert into public.vault_items(id,user_id,card_id,name,gv_id,qty) select legacy,'ac000000-0000-4000-8000-000000000001',id,name,gv_id,1 from public.card_prints where id=parent;
 insert into public.vault_item_instances(id,user_id,card_print_id,card_printing_id,legacy_vault_item_id,gv_vi_id,intent)
 values(copy,'ac000000-0000-4000-8000-000000000001',parent,printing,legacy,'GVVI-AC000001-000001','hold');
 perform pg_temp.check_pricing((select mode='default' and revision=1 from grookai_vendor_pricing.copies where instance_id=copy),'new private copy inherits opted-in default');
 perform pg_temp.check_pricing((select intent='hold' and asking_price_amount is null from public.vault_item_instances where id=copy),'inheritance never publishes or invents a price');
 r:=public.vendor_pricing_v1('preview',jsonb_build_object('instanceId',copy,'mode','default'));
 perform pg_temp.check_pricing(r->>'status'='waiting','real governed reader without reference stays unavailable');
 r:=public.vendor_pricing_v1('apply',jsonb_build_object('requestId',gen_random_uuid(),'instanceId',copy,'mode','default','expectedRevision',1,'publish',true));
 perform pg_temp.check_pricing(r->>'error'='vendor_pricing_no_exact_market','missing reference cannot publish');
 perform pg_temp.check_pricing((select intent='hold' and asking_price_amount is null from public.vault_item_instances where id=copy),'failed write rolls back its copy mutation');
 perform pg_temp.check_pricing((select count(*)=1 from grookai_vendor_pricing.requests where state='failed'),'failure persisted');
 insert into public.vault_item_instances(id,user_id,card_print_id,card_printing_id,legacy_vault_item_id,gv_vi_id,intent,asking_price_amount,asking_price_currency,pricing_mode)
 values(old_copy,'ac000000-0000-4000-8000-000000000001',parent,printing,legacy,'GVVI-AC000001-000002','hold',5,'USD','asking');
 perform pg_temp.check_pricing(not exists(select 1 from grookai_vendor_pricing.copies where instance_id=old_copy),'existing-priced copies never inherit automation');
 update public.vault_item_instances set asking_price_amount=5 where id=old_copy;
 perform pg_temp.check_pricing((select mode='manual' and revision=1 and resolved_minor=500 from grookai_vendor_pricing.copies where instance_id=old_copy),'first intentional same-value manual save establishes a revision');
 r:=public.vendor_pricing_v1('apply',jsonb_build_object('requestId',gen_random_uuid(),'instanceId',old_copy,'mode','default','expectedRevision',0,'publish',true));
 perform pg_temp.check_pricing(r->>'error'='vendor_pricing_copy_changed','stale revision-zero automatic form cannot overwrite first manual save');
 insert into pricing_fixture_state values('context',jsonb_build_object('copy',copy,'parent',parent,'printing',printing,'rule',rule,'definition',definition));
end$$;

-- Transport model only, scoped to this always-rolled-back local transaction.
-- The real immutable493 reader was exercised above and is restored by rollback.
create temporary table pricing_market_fixture(status text,freshness text,source text,scope text,market numeric,provenance uuid,wrong_parent boolean default false);
insert into pricing_market_fixture values('available','fresh','tcgplayer','card_printing',10.10,'ac000000-0000-4000-8000-000000000010',false);
create or replace function public.get_market_pricing_read_model_v1(p_card_print_ids uuid[] default null,p_card_printing_ids uuid[] default null)
returns table(pricing_scope text,card_print_id uuid,card_printing_id uuid,gv_id text,printing_gv_id text,finish_key text,status text,unavailable_reason text,currency text,market_close numeric,source_name text,source_label text,observed_at timestamptz,published_at timestamptz,freshness text,low_price numeric,mid_price numeric,high_price numeric,direct_low_price numeric,is_from_price boolean,eligible_printing_count integer,lowest_active_ask numeric,active_ask_listing_count integer,active_ask_observed_at timestamptz,provenance_id uuid)
language sql stable security definer set search_path='' as $$
 select f.scope,case when f.wrong_parent then gen_random_uuid() else (s.value->>'parent')::uuid end,p_card_printing_ids[1],null::text,null::text,'normal',f.status,null::text,'USD',f.market,f.source,'TCGPlayer Market',now(),now(),f.freshness,null::numeric,null::numeric,null::numeric,null::numeric,false,1,null::numeric,0,null::timestamptz,f.provenance
 from pg_temp.pricing_market_fixture f cross join pg_temp.pricing_fixture_state s where s.key='context';
$$;

do $$declare x jsonb; r jsonb; again jsonb; payload jsonb; request uuid:=gen_random_uuid(); copy uuid; rule uuid; rev bigint; bad text; amount numeric;begin
 select value into x from pricing_fixture_state where key='context';copy:=(x->>'copy')::uuid;rule:=(x->>'rule')::uuid;
 r:=public.vendor_pricing_v1('preview',jsonb_build_object('instanceId',copy,'mode','default'));
 perform pg_temp.check_pricing((r->>'amountMinor')::bigint=1150,'server preview uses exact eligible reference');
 payload:=jsonb_build_object('requestId',request,'instanceId',copy,'mode','default','expectedRevision',1,'publish',true);
 r:=public.vendor_pricing_v1('apply',payload);
 perform pg_temp.check_pricing((r->>'ok')::boolean and (r->>'revision')::bigint=2,'automatic publication acknowledged');
 update public.vault_item_instances set asking_price_note='Keep this owner note' where id=copy;
 perform pg_temp.check_pricing((select intent='sell' and pricing_mode='asking' and asking_price_amount=11.50 and asking_price_note='Keep this owner note' from public.vault_item_instances where id=copy),'one canonical asking amount and note preserved');
 perform pg_temp.check_pricing((select mode='default' and state='ready' from grookai_vendor_pricing.copies where instance_id=copy),'repricer marker does not become a manual override');
 again:=public.vendor_pricing_v1('apply',payload);perform pg_temp.check_pricing(again=r,'matching lost-response retry returns same result');
 perform pg_temp.check_pricing((select count(*)=1 from grookai_vendor_pricing.events where kind='automatic_price'),'retry has no second effect');
 perform pg_temp.reject_pricing(format('select public.vendor_pricing_v1(%L,%L::jsonb)','apply',payload||'{"publish":false}'),'vendor_pricing_request_conflict');
 update pricing_market_fixture set market=20.10,provenance=gen_random_uuid();
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 r:=pg_temp.pricing_service('reprice',jsonb_build_object('instanceId',copy));
 perform pg_temp.check_pricing((r->>'amountMinor')::bigint=2250,'background update with app closed');
 perform pg_temp.check_pricing((select asking_price_amount=22.50 and intent='sell' from public.vault_item_instances where id=copy),'background persisted new ask');
 perform set_config('request.jwt.claims','{"role":"authenticated","sub":"ac000000-0000-4000-8000-000000000001"}',true);
 -- Every legacy/manual writer wins, including a deliberate unchanged amount.
 update public.vault_item_instances set asking_price_amount=22.50 where id=copy;
 select revision into rev from grookai_vendor_pricing.copies where instance_id=copy;
 perform pg_temp.check_pricing((select mode='manual' and state='fixed' from grookai_vendor_pricing.copies where instance_id=copy),'same-value manual save locks the price');
 update pricing_market_fixture set market=40.10,provenance=gen_random_uuid();
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 r:=pg_temp.pricing_service('reprice',jsonb_build_object('instanceId',copy));
 perform pg_temp.check_pricing(r->>'status'='skipped' and (select asking_price_amount=22.50 from public.vault_item_instances where id=copy),'manual price survives market changes');
 perform set_config('request.jwt.claims','{"role":"authenticated","sub":"ac000000-0000-4000-8000-000000000001"}',true);
 r:=public.vendor_pricing_v1('apply',jsonb_build_object('requestId',gen_random_uuid(),'instanceId',copy,'mode','default','expectedRevision',rev-1,'publish',true));
 perform pg_temp.check_pricing(r->>'error'='vendor_pricing_copy_changed','stale automatic form cannot overwrite manual edit');
 r:=public.vendor_pricing_v1('apply',jsonb_build_object('requestId',gen_random_uuid(),'instanceId',copy,'mode','default','expectedRevision',rev,'publish',true));
 perform pg_temp.check_pricing((r->>'ok')::boolean and (r->>'amountMinor')::bigint=4450,'explicit return to rules');
 foreach bad in array array['stale','source','scope','parent','provenance'] loop
  update pricing_market_fixture set freshness=case when bad='stale' then 'stale' else 'fresh' end,source=case when bad='source' then 'other' else 'tcgplayer' end,scope=case when bad='scope' then 'parent' else 'card_printing' end,wrong_parent=bad='parent',provenance=case when bad='provenance' then null else gen_random_uuid() end;
  r:=public.vendor_pricing_v1('preview',jsonb_build_object('instanceId',copy,'mode','default'));
  perform pg_temp.check_pricing(r->>'status'='waiting','ineligible reference rejected: '||bad);
 end loop;
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 r:=pg_temp.pricing_service('reprice',jsonb_build_object('instanceId',copy));
 perform pg_temp.check_pricing(r->>'status'='stale' and (select asking_price_amount=44.50 from public.vault_item_instances where id=copy),'stale data keeps last confirmed seller price');
 perform pg_temp.check_pricing(pg_temp.pricing_service('candidates')='[]'::jsonb,'stale copy waits before retry, no hot loop');
 perform pg_temp.reject_pricing($q$select public.vendor_pricing_service_v1('candidates','{"runId":"ac000000-0000-4000-8000-000000000020","fence":0}')$q$,'vendor_pricing_stale_run');
 perform set_config('request.jwt.claims','{"role":"authenticated","sub":"ac000000-0000-4000-8000-000000000002"}',true);
 perform pg_temp.check_pricing(public.vendor_pricing_v1('workspace')->'rules'='[]'::jsonb,'other vendor cannot read rules');
 perform pg_temp.reject_pricing(format('select public.vendor_pricing_v1(%L,%L::jsonb)','preview',jsonb_build_object('instanceId',copy,'mode','preset','ruleId',rule)),'vendor_pricing_copy_unavailable');
 perform pg_temp.reject_pricing($q$select public.vendor_pricing_service_v1('candidates')$q$,'vendor_pricing_service_only');
 perform pg_temp.check_pricing((select count(*)=0 from grookai_vendor_pricing.write_intents),'transaction-bound markers consumed');
 perform pg_temp.check_pricing((select count(*)=0 from grookai_square.stock_operations),'no inventory operation from repricing');
 perform pg_temp.check_pricing((select count(*)=0 from public.vault_item_instance_dispositions),'no sale recorded by repricing');
end$$;
set local role authenticated;
select pg_temp.reject_pricing($q$select * from grookai_vendor_pricing.rules$q$,'permission denied');
select pg_temp.reject_pricing($q$select grookai_vendor_pricing.calculate(10,'{}')$q$,'permission denied');
reset role;
select jsonb_build_object('pass',true,'proof','vendor pricing authority V1','rolledBack',true,'productionWrites',0,'sourceReaderMockScopedToTransaction',true);
