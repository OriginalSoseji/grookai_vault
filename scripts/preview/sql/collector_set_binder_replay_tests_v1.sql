-- All assertions run only inside the separately named replay database.
do $$ begin
  if current_database() !~ '^collector_set_binder_replay_[0-9]+$' then
    raise exception 'wrong_replay_database';
  end if;
end $$;
begin;
do $$
declare
  parent uuid := '98d26f6e-83e8-4990-8e42-ea2e3aadb111';
  printing uuid := '92f0c41e-1f2a-41ed-957d-ea973012bb5c';
  setid uuid; releaseid uuid; binderid uuid := gen_random_uuid();
  ownerid uuid := gen_random_uuid(); memberid uuid := gen_random_uuid();
  copy1 uuid := gen_random_uuid(); copy2 uuid := gen_random_uuid();
  manifest jsonb; r record; blocked boolean; otherrelease uuid; originalchildren uuid[];
begin
  select set_id into strict setid from public.card_prints where id = parent;
  if (select count(*) from public.binder_set_slots_authority_v1(setid)) <> 0 then
    raise exception 'unreviewed_set_must_have_no_slots';
  end if;
  manifest := jsonb_build_array(jsonb_build_object('position',0,'card_print_id',parent,'card_printing_id',printing));
  insert into public.binder_set_slot_releases_v1(set_id, source_reference, source_sha256, expected_slot_count, slots)
    values(setid,'SYNTHETIC REPLAY ONLY - not a real master-set checklist', repeat('a',64),1,manifest) returning id into releaseid;
  insert into public.binder_set_slot_pointers_v1 values(setid,releaseid);
  if (select count(*) from public.binder_set_slots_authority_v1(setid)) <> 1 then raise exception 'exact_slot_missing'; end if;
  if exists (select 1 from public.binder_set_slots_authority_v1(setid) where card_printing_id <> printing) then raise exception 'wrong_slot'; end if;
  if has_function_privilege('authenticated','public.binder_set_slots_authority_v1(uuid)','execute')
    or has_table_privilege('authenticated','public.binder_set_slot_releases_v1','select')
    or has_table_privilege('anon','public.binder_set_slot_pointers_v1','select')
    or has_table_privilege('service_role','public.binder_set_slot_releases_v1','insert') then raise exception 'authority_acl_leak'; end if;
  blocked := false;
  begin update public.binder_set_slot_releases_v1 set source_reference='modified' where id=releaseid;
  exception when others then blocked := sqlerrm = 'immutable_set_slot_release'; end;
  if not blocked then raise exception 'release_not_immutable'; end if;
  blocked := false;
  begin insert into public.binder_set_slot_releases_v1(set_id,source_reference,source_sha256,expected_slot_count,slots)
    values(setid,'duplicate fixture',repeat('b',64),2,manifest || jsonb_build_array(jsonb_build_object('position',1,'card_print_id',parent,'card_printing_id',printing)));
  exception when others then blocked := sqlerrm = 'invalid_set_slot_manifest'; end;
  if not blocked then raise exception 'duplicate_identity_accepted'; end if;
  update public.card_printings set is_provisional=true where id=printing;
  if exists (select 1 from public.binder_set_slots_authority_v1(setid)) then raise exception 'provisional_accepted'; end if;
  update public.card_printings set is_provisional=false where id=printing;
  update public.card_prints set data_quality_flags=jsonb_set(coalesce(data_quality_flags,'{}'),'{app_visibility_v1}', '{"status":"suppressed"}') where id=parent;
  if exists (select 1 from public.binder_set_slots_authority_v1(setid)) then raise exception 'suppressed_accepted'; end if;
  update public.card_prints set data_quality_flags=data_quality_flags - 'app_visibility_v1' where id=parent;
  insert into auth.users(id,email) values(ownerid,'set-binder-replay@example.invalid');
  insert into public.binders(id,public_id,owner_user_id,title,target_kind,set_id,checklist_mode)
    values(binderid,gen_random_uuid(),ownerid,'Synthetic replay only','set',setid,'master_set');
  if not public.binder_contribution_matches_v1(binderid,parent,printing) then raise exception 'exact_contribution_rejected'; end if;
  if public.binder_contribution_matches_v1(binderid,parent,null) then raise exception 'unresolved_contribution_accepted'; end if;
  if public.binder_contribution_matches_v1(binderid,parent,gen_random_uuid()) then raise exception 'wrong_printing_accepted'; end if;
  if (select count(*) from public.binder_slot_rows_v1(binderid)) <> 1 then raise exception 'checklist_read_mismatch'; end if;
  insert into public.catalog_set_release_controls(set_id,release_status,release_version)
    values(setid,'hidden','synthetic-replay');
  if exists (select 1 from public.binder_set_slots_authority_v1(setid)) then raise exception 'hidden_set_accepted'; end if;
  update public.catalog_set_release_controls set release_status='signed_in' where set_id=setid;
  if exists (select 1 from public.binder_set_slots_authority_v1(setid)) then raise exception 'signed_in_set_accepted'; end if;
  update public.catalog_set_release_controls set release_status='public' where set_id=setid;
  insert into public.binder_set_slot_releases_v1(set_id,source_reference,source_sha256,expected_slot_count,slots)
    values(setid,'partly invalid fixture',repeat('c',64),2,manifest || jsonb_build_array(
      jsonb_build_object('position',1,'card_print_id',parent,'card_printing_id',gen_random_uuid()))) returning id into otherrelease;
  update public.binder_set_slot_pointers_v1 set release_id=otherrelease where set_id=setid;
  if exists (select 1 from public.binder_set_slots_authority_v1(setid)) then raise exception 'partial_manifest_silently_shrank'; end if;
  insert into public.binder_set_slot_releases_v1(set_id,source_reference,source_sha256,expected_slot_count,slots)
    values(setid,'authorized parent fixture',repeat('d',64),1,jsonb_build_array(
      jsonb_build_object('position',0,'card_print_id',parent,'parent_only_authorized',true))) returning id into otherrelease;
  update public.binder_set_slot_pointers_v1 set release_id=otherrelease where set_id=setid;
  if exists (select 1 from public.binder_set_slots_authority_v1(setid)) then raise exception 'parent_bypassed_governed_children'; end if;
  select array_agg(id) into originalchildren from public.card_printings where card_print_id=parent and is_provisional=false;
  update public.card_printings set is_provisional=true where id=any(originalchildren);
  if (select count(*) from public.binder_set_slots_authority_v1(setid)) <> 1 then raise exception 'authorized_parent_missing'; end if;
  if not public.binder_contribution_matches_v1(binderid,parent,null)
    or public.binder_contribution_matches_v1(binderid,parent,printing) then raise exception 'parent_matching_wrong'; end if;
  update public.card_printings set is_provisional=false where id=any(originalchildren);
  update public.binder_set_slot_pointers_v1 set release_id=releaseid where set_id=setid;
  select * into r from public.binder_set_progress_counts_v1(binderid);
  if r.total <> 1 or r.member_completed <> 0 or r.active_count <> 0 then raise exception 'empty_progress_wrong'; end if;
  insert into public.vault_owners(user_id,owner_code,next_instance_index) values(ownerid,'ABCDEF12',3);
  insert into public.binder_members(id,binder_id,user_id,role,joined_at)
    values(memberid,binderid,ownerid,'owner',now());
  insert into public.vault_item_instances(id,user_id,gv_vi_id,card_print_id,card_printing_id)
    values(copy1,ownerid,'GVVI-ABCDEF12-000001',parent,printing),
          (copy2,ownerid,'GVVI-ABCDEF12-000002',parent,printing);
  insert into public.binder_contributions(binder_id,contributor_member_id,contributor_user_id,
    contributor_membership_epoch,vault_item_instance_id,state,snapshot_gv_vi_id,
    snapshot_card_print_id,snapshot_card_printing_id,activated_at)
    select binderid,memberid,ownerid,1,id,'active',gv_vi_id,parent,printing,now()
    from public.vault_item_instances where id in (copy1,copy2);
  select * into r from public.binder_set_progress_counts_v1(binderid);
  if r.total <> 1 or r.member_completed <> 1 or r.active_count <> 2
    or r.link_completed <> 0 or r.public_completed <> 0 then raise exception 'duplicate_or_private_progress_wrong'; end if;
  update public.binder_members set content_scope='link',content_consent_epoch=1,
    content_consent_revision=1 where id=memberid;
  select * into r from public.binder_set_progress_counts_v1(binderid);
  if r.link_completed <> 1 or r.public_completed <> 0 then raise exception 'link_consent_wrong'; end if;
  update public.binder_members set content_scope='public' where id=memberid;
  select * into r from public.binder_progress_recalculate_v1(binderid,'user',ownerid);
  if r.total_slots <> 1 or r.member_completed_slots <> 1 or r.public_completed_slots <> 1
    or r.unit <> 'finish_options' then raise exception 'persisted_progress_wrong'; end if;
  update public.binders set external_projection_revision=2 where id=binderid;
  select * into r from public.binder_set_progress_counts_v1(binderid);
  if r.member_completed <> 1 or r.link_completed <> 0 or r.public_completed <> 0 then raise exception 'stale_consent_leak'; end if;
  update public.vault_item_instances set archived_at=now() where id in (copy1,copy2);
  select * into r from public.binder_set_progress_counts_v1(binderid);
  if r.member_completed <> 0 or r.active_count <> 0 then raise exception 'archived_copy_counted'; end if;
  update public.card_printings set is_provisional=true where id=printing;
  blocked := false;
  begin perform public.binder_progress_recalculate_v1(binderid,'user',ownerid);
  exception when others then blocked := sqlerrm = 'set_binder_authority_unavailable'; end;
  if not blocked then raise exception 'invalid_checklist_shrank_to_zero'; end if;
  raise notice 'Authority, ACL, immutability, exact identity, duplicates, consent, archived copies and persisted progress passed';
end $$;
rollback;
select 'PASS: transaction rolled back; synthetic manifests are not activated in the sample' as result;
