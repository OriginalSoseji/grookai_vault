do $$ begin
  if current_database() !~ '^collector_pricing_replay_[0-9]+$' then raise exception 'wrong_fixture_database'; end if;
end $$;
begin;
do $$
declare parent uuid:='98d26f6e-83e8-4990-8e42-ea2e3aadb111'; cameo uuid; imagepath text; setid uuid; denied boolean;
begin
  select image_path,set_id into strict imagepath,setid from public.card_prints where id=parent;
  insert into public.card_print_cameos(card_print_id,cameo_subject_type,cameo_subject_name,pokemon_ndex,
    source_name,source_url,source_tab,source_gid,source_row_index,source_row_hash,card_name_raw,set_name_raw,number_raw,notes_raw,match_status)
  values(parent,'pokemon','Synthetic Pikachu fixture','25','SYNTHETIC TEST ONLY','https://example.invalid','test','0',1,repeat('a',64),'fixture','fixture','200','PRIVATE RAW NOTE MUST NEVER LEAK','APPROVED_MATCH') returning id into cameo;
  execute 'set local role anon';
  if exists(select 1 from public.get_public_card_cameos_v2('GV-PK-MEW-200')) then raise exception 'unconfirmed_association_leak'; end if;
  denied:=false;
  begin perform count(*) from public.card_print_cameos; exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'raw_evidence_grant_leak'; end if;
  execute 'reset role';
  denied:=false;
  begin insert into public.card_cameo_confirmations_v1(cameo_id,source_row_hash,reviewed_image_path,decision_artifact_sha256,appearance_role,display_note)
    values(cameo,repeat('a',64),imagepath,repeat('b',64),'character_representation','Invalid missing host');
  exception when check_violation then denied:=true; end;
  if not denied then raise exception 'representation_without_host_accepted'; end if;
  insert into public.card_cameo_confirmations_v1(cameo_id,source_row_hash,reviewed_image_path,decision_artifact_sha256,appearance_role,host_description,display_note)
    values(cameo,repeat('a',64),imagepath,repeat('b',64),'character_representation','synthetic cookie','SYNTHETIC reviewed test label');
  if exists(select 1 from public.get_public_card_cameos_v2('GV-PK-MEW-200')) then raise exception 'inactive_confirmation_leak'; end if;
  update public.card_cameo_confirmations_v1 set active=true where cameo_id=cameo;
  execute 'set local role anon';
  if (select count(*) from public.get_public_card_cameos_v2('GV-PK-MEW-200'))<>1 then raise exception 'confirmed_projection_missing'; end if;
  if exists(select 1 from public.get_public_card_cameos_v2('GV-PK-MEW-200') where notes_raw<>'SYNTHETIC reviewed test label' or appearance_role<>'character_representation') then raise exception 'raw_note_or_role_leak'; end if;
  if exists(select 1 from public.get_public_card_cameos_v2()) then raise exception 'unbounded_query'; end if;
  if exists(select 1 from public.get_public_card_cameos_v2(null,'25',1001)) then raise exception 'unbounded_offset'; end if;
  execute 'reset role';
  update public.card_cameo_confirmations_v1 set source_row_hash=repeat('c',64) where cameo_id=cameo;
  if exists(select 1 from public.get_public_card_cameos_v2('GV-PK-MEW-200')) then raise exception 'stale_source_confirmation'; end if;
  update public.card_cameo_confirmations_v1 set source_row_hash=repeat('a',64),reviewed_image_path='changed' where cameo_id=cameo;
  if exists(select 1 from public.get_public_card_cameos_v2('GV-PK-MEW-200')) then raise exception 'changed_image_confirmation'; end if;
  update public.card_cameo_confirmations_v1 set reviewed_image_path=imagepath where cameo_id=cameo;
  insert into public.catalog_set_release_controls(set_id,release_status,release_version) values(setid,'hidden','SYNTHETIC');
  if exists(select 1 from public.get_public_card_cameos_v2('GV-PK-MEW-200')) then raise exception 'hidden_catalog_leak'; end if;
  update public.catalog_set_release_controls set release_status='signed_in' where set_id=setid;
  if exists(select 1 from public.get_public_card_cameos_v2('GV-PK-MEW-200')) then raise exception 'signed_in_catalog_leak'; end if;
end $$;
rollback;
select 'PASS: bounded confirmed-only cameo projection; no raw grants; fixtures rolled back';
