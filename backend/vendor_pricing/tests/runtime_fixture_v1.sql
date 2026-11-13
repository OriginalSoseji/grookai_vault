-- Only the new, unlinked local integration lab. Auth users are created through
-- local GoTrue first. No production data or replacement read-model functions.
begin;
create schema pricing_test_fixture;
revoke all on schema pricing_test_fixture from public,anon,authenticated,service_role;
create table pricing_test_fixture.copies(owner_id uuid,instance_id uuid,gvvi text,printing_id uuid,parent_id uuid);
do $$declare actor uuid; parent uuid; printing uuid; legacy uuid; copy uuid; counter integer:=0;begin
 select id into strict parent from public.card_prints order by id limit 1;
 insert into public.card_printings(card_print_id,finish_key,printing_gv_id) values(parent,'normal','GV-PK-LOCAL-VENDOR-PRICING-NORMAL') returning id into printing;
 foreach actor in array array['__OWNER__'::uuid,'__OTHER__'::uuid] loop
  insert into public.user_entitlements(user_id,tier,role,features) values(actor,'vendor','vendor','{"vendor_tools":true}');
  insert into public.public_profiles(user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled)
   values(actor,'pricing-fixture-'||left(actor::text,8),'Local pricing fixture',true,true)
   on conflict(user_id) do update set public_profile_enabled=true,vault_sharing_enabled=true;
  for i in 1..case when actor='__OWNER__'::uuid then 3 else 1 end loop
   legacy:=gen_random_uuid();copy:=gen_random_uuid();counter:=counter+1;
   insert into public.vault_items(id,user_id,card_id,name,gv_id,qty) select legacy,actor,id,name,gv_id,1 from public.card_prints where id=parent;
   insert into public.vault_item_instances(id,user_id,card_print_id,card_printing_id,legacy_vault_item_id,gv_vi_id,intent,condition_label)
    values(copy,actor,parent,printing,legacy,'GVVI-'||upper(left(actor::text,8))||'-'||lpad(counter::text,6,'0'),'hold','NM');
   insert into pricing_test_fixture.copies values(actor,copy,'GVVI-'||upper(left(actor::text,8))||'-'||lpad(counter::text,6,'0'),printing,parent);
  end loop;
 end loop;
end$$;

create function pricing_test_fixture.publish(p_amount numeric,p_age interval default interval '1 hour') returns uuid
language plpgsql set search_path='' as $$
declare parent uuid; printing uuid; source_run uuid:=gen_random_uuid(); run uuid:=gen_random_uuid(); observation uuid:=gen_random_uuid(); candidate uuid:=gen_random_uuid(); decision uuid:=gen_random_uuid(); publication uuid:=gen_random_uuid(); mapping bigint; assignment uuid:=gen_random_uuid(); snapshot uuid; key text:='LOCAL-PRICING-'||run::text; gv text; printing_gv text;
begin
 select parent_id,printing_id into parent,printing from pricing_test_fixture.copies limit 1;
 select gv_id into gv from public.card_prints where id=parent;
 select printing_gv_id into printing_gv from public.card_printings where id=printing;
 insert into public.tcgcsv_source_sync_runs(id,run_key,sync_mode,worker_version,parser_version,schema_contract_version,status,finished_at,observed_on)
  values(source_run,key,'current_full_sync','local-fixture','local-fixture','local-fixture','completed',clock_timestamp()-p_age,current_date);
 insert into public.tcgcsv_source_price_daily_observations(id,source_price_row_identity,product_id,subtype_name,subtype_name_normalized,observed_on,raw_payload,payload_hash,market_price,first_seen_run_id,last_seen_run_id)
  values(observation,key,1999999999,'Normal','normal',current_date,'{}',repeat('a',64),p_amount,source_run,source_run);
 insert into public.external_mappings(card_print_id,source,external_id) values(parent,'tcgplayer',key) returning id into mapping;
 insert into public.market_evidence_variant_assignments(id,source_family,source_table,source_row_id,card_print_id,card_printing_id,variant_assignment_status,variant_assignment_confidence,variant_assignment_reason)
  values(assignment,'tcgcsv_market_close','tcgcsv_source_price_daily_observations',observation,parent,printing,'exact_child_finish',1,'local integration fixture only');
 insert into public.market_price_pipeline_runs(id,run_key,pipeline_version,policy_version,run_mode,git_commit_sha,worker_version,schema_version,source_sync_run_id,state,reconciliation_state,selected_count,mapped_count,eligible_count,snapshot_count)
  values(run,key,'local-fixture','local-fixture','production',repeat('0',40),'local-fixture','local-fixture',source_run,'verified','reconciled',1,1,1,1);
 insert into public.market_price_pipeline_candidates(id,run_id,source_observation_id,source_sync_run_id,source_price_row_identity,source_row_hash,source_product_id,source_subtype_name,candidate_hash,candidate_payload,card_print_id,card_printing_id,source_mapping_id,variant_assignment_id)
  values(candidate,run,observation,source_run,key,repeat('a',64),1999999999,'Normal',repeat('a',64),'{}',parent,printing,mapping,assignment);
 insert into public.market_price_qualification_decisions(id,decision_key,run_id,pipeline_candidate_id,run_key,policy_version,source_observation_id,source_sync_run_id,source_price_row_identity,source_row_hash,source_product_id,source_subtype_name,source_observed_on,source_sync_finished_at,decision,eligible,publication_lane,language_result,finish_result,source_integrity_result,duplicate_product_result,freshness_result,code_version,card_print_id,card_printing_id,market_price,currency,source_mapping_id,variant_assignment_id)
  values(decision,key,run,candidate,key,'local-fixture',observation,source_run,key,repeat('a',64),1999999999,'Normal',current_date,clock_timestamp()-p_age,'publish',true,'current','english','exact_child_finish','passed','unique','fresh','local-fixture',parent,printing,p_amount,'USD',mapping,assignment);
 insert into public.market_price_publication_sets(id,run_id,run_key,publication_state,expected_snapshot_count) values(publication,run,key,'published',1);
 insert into public.market_price_publication_snapshots(publication_set_id,run_id,qualification_decision_id,policy_version,source_observation_id,source_sync_run_id,source_artifact_hash,source_price_row_identity,source_row_hash,source_product_id,source_subtype_name,source_observed_on,source_sync_finished_at,card_print_id,card_printing_id,gv_id,printing_gv_id,finish_key,currency,market_price,observed_at,qualified_at,freshness_state,code_version,source_mapping_id,variant_assignment_id)
  values(publication,run,decision,'local-fixture',observation,source_run,repeat('a',64),key,repeat('a',64),1999999999,'Normal',current_date,clock_timestamp()-p_age,parent,printing,gv,printing_gv,'normal','USD',p_amount,clock_timestamp()-p_age,clock_timestamp(),'fresh','local-fixture',mapping,assignment) returning id into snapshot;
 insert into public.market_price_current_publication(singleton,publication_set_id,run_id) values(true,publication,run)
  on conflict(singleton) do update set publication_set_id=excluded.publication_set_id,run_id=excluded.run_id;
 return snapshot;
end$$;
revoke all on all tables in schema pricing_test_fixture from public,anon,authenticated,service_role;
revoke all on all functions in schema pricing_test_fixture from public,anon,authenticated,service_role;
select pricing_test_fixture.publish(10.10);
commit;
