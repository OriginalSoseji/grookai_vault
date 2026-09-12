-- SQL-level authentication simulation only; not a GoTrue/JWT/browser test.
do $$ begin
  if current_database() !~ '^collector_set_binder_replay_[0-9]+$' then raise exception 'wrong_replay_database'; end if;
end $$;
begin;
do $$
declare
  ownerid uuid := gen_random_uuid(); guestid uuid := gen_random_uuid(); outsider uuid := gen_random_uuid();
  parent uuid := '98d26f6e-83e8-4990-8e42-ea2e3aadb111';
  printing uuid := '92f0c41e-1f2a-41ed-957d-ea973012bb5c';
  owncopy uuid := gen_random_uuid(); guestcopy uuid := gen_random_uuid(); unresolved uuid := gen_random_uuid();
  setid uuid; releaseid uuid; publicid uuid; customid uuid; binderid uuid;
  speciesid uuid := gen_random_uuid(); speciesbinder uuid;
  owncontrib uuid; guestcontrib uuid; response jsonb; replay jsonb; invite jsonb;
  slots jsonb; blocked boolean; before_count integer;
begin
  if exists (select 1 from pg_proc where pronamespace='public'::regnamespace
    and proname like 'binder_%' and pg_get_userbyid(proowner) <> 'postgres') then
    raise exception 'binder_function_owner_drift';
  end if;
  select set_id into strict setid from public.card_prints where id=parent;
  insert into public.pokemon_species(id,national_dex_number,canonical_name,display_name,slug,source)
    values(speciesid,9,'Blastoise','Blastoise','blastoise','SYNTHETIC REPLAY ONLY');
  insert into public.card_print_species(card_print_id,species_id,role,source)
    values(parent,speciesid,'primary','SYNTHETIC REPLAY ONLY');
  insert into auth.users(id,email) values (ownerid,'binder-owner@example.invalid'),
    (guestid,'binder-guest@example.invalid'),(outsider,'binder-outsider@example.invalid');
  insert into public.vault_owners(user_id,owner_code,next_instance_index)
    values(ownerid,'ABCDEF21',3),(guestid,'ABCDEF22',2);
  insert into public.vault_item_instances(id,user_id,gv_vi_id,card_print_id,card_printing_id)
    values(owncopy,ownerid,'GVVI-ABCDEF21-000001',parent,printing),
      (unresolved,ownerid,'GVVI-ABCDEF21-000002',parent,null),
      (guestcopy,guestid,'GVVI-ABCDEF22-000001',parent,printing);
  update public.binder_feature_flags set enabled=true
    where flag_key in ('schema_internal','personal','custom','shared','set_binders','public','view_links');
  select count(*) into before_count from public.binders;

  perform set_config('request.jwt.claim.sub',ownerid::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  execute 'set local role authenticated';
  if current_user <> 'authenticated' then raise exception 'role_not_applied'; end if;
  blocked := false;
  begin perform public.binder_create_v1('No approved checklist','set','master_set','rpc-no-authority',p_set_id=>setid);
  exception when sqlstate 'P0001' then blocked := sqlerrm='set_binder_authority_unavailable'; end;
  if not blocked then raise exception 'unreviewed_set_create_did_not_fail'; end if;
  blocked := false;
  begin perform count(*) from public.binder_set_slot_releases_v1;
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'raw_authority_read_leak'; end if;
  blocked := false;
  begin perform public.binder_set_slots_authority_v1(setid);
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'internal_authority_execute_leak'; end if;
  execute 'reset role';
  if (select count(*) from public.binders) <> before_count then raise exception 'failed_create_left_binder'; end if;
  if exists(select 1 from public.binder_set_options_v1('151')) then raise exception 'unreviewed_set_option_leak'; end if;

  slots := jsonb_build_array(jsonb_build_object('position',0,'card_print_id',parent,'card_printing_id',printing));
  insert into public.binder_set_slot_releases_v1(set_id,source_reference,source_sha256,expected_slot_count,slots)
    values(setid,'SYNTHETIC RPC REPLAY ONLY',repeat('e',64),1,slots) returning id into releaseid;
  insert into public.binder_set_slot_pointers_v1 values(setid,releaseid);
  execute 'set local role authenticated';
  if (select count(*) from public.binder_set_options_v1('151')) <> 1 then raise exception 'approved_set_option_missing'; end if;
  if exists(select 1 from public.binder_set_options_v1(repeat('x',61))) then raise exception 'unbounded_set_option_query'; end if;
  response := public.binder_create_v1('RPC set fixture','set','master_set','rpc-create',p_set_id=>setid);
  publicid := (response->>'binder_public_id')::uuid;
  replay := public.binder_create_v1('RPC set fixture','set','master_set','rpc-create',p_set_id=>setid);
  if response is distinct from replay or publicid is null then raise exception 'create_idempotency_failed'; end if;
  response := public.binder_checklist_v1(publicid);
  if (response->>'total_slots')::integer <> 1 or jsonb_array_length(response->'items') <> 1 then raise exception 'rpc_checklist_wrong'; end if;
  blocked := false;
  begin perform public.binder_contribution_add_v1(publicid,unresolved,'rpc-unresolved');
  exception when sqlstate 'P0001' then blocked := sqlerrm='invalid_target'; end;
  if not blocked then raise exception 'rpc_unresolved_copy_accepted'; end if;
  blocked := false;
  begin perform public.binder_contribution_add_v1(publicid,guestcopy,'rpc-foreign-copy');
  exception when sqlstate 'P0001' then blocked := sqlerrm in ('unavailable','conflict'); end;
  if not blocked then raise exception 'rpc_foreign_copy_accepted'; end if;
  response := public.binder_contribution_add_v1(publicid,owncopy,'rpc-own-add');
  owncontrib := (response->>'contribution_id')::uuid;
  if response->>'state' <> 'active' or owncontrib is null then raise exception 'rpc_own_add_failed'; end if;
  replay := public.binder_contribution_add_v1(publicid,owncopy,'rpc-own-add');
  if replay is distinct from response then raise exception 'add_idempotency_failed'; end if;
  response := public.binder_checklist_v1(publicid,'in_binder');
  if (response->>'member_completed_slots')::integer <> 1 or jsonb_array_length(response->'items') <> 1 then raise exception 'rpc_progress_wrong'; end if;
  perform public.binder_update_policy_v1(publicid,'private','unlisted','invite_only','members_direct','rpc-policy');
  invite := public.binder_invite_create_v1(publicid,'contributor','rpc-invite',guestid);

  perform set_config('request.jwt.claim.sub',outsider::text,true);
  blocked := false;
  begin perform public.binder_checklist_v1(publicid);
  exception when sqlstate 'P0001' then blocked := sqlerrm='unavailable'; end;
  if not blocked then raise exception 'outsider_checklist_leak'; end if;
  blocked := false;
  begin perform public.binder_contribution_withdraw_v1(owncontrib,'rpc-foreign-withdraw');
  exception when sqlstate 'P0001' then blocked := sqlerrm='unavailable'; end;
  if not blocked then raise exception 'outsider_withdraw_allowed'; end if;

  perform set_config('request.jwt.claim.sub',guestid::text,true);
  response := public.binder_invite_accept_v1(invite->>'token','rpc-accept');
  if response->>'ok' <> 'true' then raise exception 'invitation_accept_failed'; end if;
  response := public.binder_contribution_add_v1(publicid,guestcopy,'rpc-guest-add');
  guestcontrib := (response->>'contribution_id')::uuid;
  if response->>'state' <> 'active' then raise exception 'guest_contribution_failed'; end if;
  response := public.binder_checklist_v1(publicid);
  if (response->>'member_completed_slots')::integer <> 1 then raise exception 'guest_duplicate_inflated_progress'; end if;
  perform set_config('request.jwt.claim.sub',ownerid::text,true);
  perform public.binder_update_policy_v1(publicid,'public','unlisted','invite_only','members_direct','rpc-public');
  perform public.binder_member_preferences_v1(publicid,null,'public','none','muted','rpc-consent');
  execute 'reset role';
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claim.role','anon',true);
  execute 'set local role anon';
  response := public.binder_public_detail_v1(publicid);
  if (response #>> '{progress,completed_slots}')::integer is distinct from 1
    or (response #>> '{progress,total_slots}')::integer is distinct from 1
    or (response #>> '{member_summary,contributor_count}')::integer is distinct from 1 then
    raise exception 'public_projection_not_consent_scoped'; end if;
  if response::text like '%GVVI-%' or response::text like '%'||ownerid::text||'%'
    or response::text like '%'||guestid::text||'%' or response::text like '%'||owncopy::text||'%'
    or response::text like '%'||guestcopy::text||'%' or response::text like '%'||owncontrib::text||'%'
    or response::text like '%'||guestcontrib::text||'%' then raise exception 'public_projection_identity_leak'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',ownerid::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  execute 'set local role authenticated';
  perform public.binder_member_preferences_v1(publicid,null,'none','none','muted','rpc-revoke-consent');
  response := public.binder_checklist_v1(publicid);
  if (response->>'member_completed_slots')::integer is distinct from 1 then raise exception 'consent_changed_member_progress'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claim.role','anon',true);
  execute 'set local role anon';
  response := public.binder_public_detail_v1(publicid);
  if (response #>> '{progress,completed_slots}')::integer is distinct from 0
    or (response #>> '{member_summary,contributor_count}')::integer is distinct from 0 then
    raise exception 'revoked_consent_public_leak'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',ownerid::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  execute 'set local role authenticated';
  perform public.binder_update_policy_v1(publicid,'private','unlisted','invite_only','members_direct','rpc-private');
  perform set_config('request.jwt.claim.sub',guestid::text,true);
  perform public.binder_contribution_withdraw_v1(guestcontrib,'rpc-guest-withdraw');
  perform set_config('request.jwt.claim.sub',ownerid::text,true);
  perform public.binder_contribution_withdraw_v1(owncontrib,'rpc-owner-withdraw');
  response := public.binder_checklist_v1(publicid,'missing');
  if (response->>'member_completed_slots')::integer <> 0 or jsonb_array_length(response->'items') <> 1 then raise exception 'withdraw_did_not_restore_missing'; end if;

  -- Existing custom workflow must still work with the Set Binder candidate installed.
  response := public.binder_create_v1('RPC custom fixture','custom','custom','rpc-custom',p_custom_slots=>slots);
  customid := (response->>'binder_public_id')::uuid;
  perform public.binder_contribution_add_v1(customid,owncopy,'rpc-custom-add');
  response := public.binder_checklist_v1(customid);
  if response->>'unit' <> 'custom_slots' or (response->>'member_completed_slots')::integer <> 1 then raise exception 'custom_regression'; end if;
  response := public.binder_create_v1('RPC species fixture','species','card_prints','rpc-species',p_species_id=>speciesid);
  speciesbinder := (response->>'binder_public_id')::uuid;
  perform public.binder_contribution_add_v1(speciesbinder,unresolved,'rpc-species-add');
  response := public.binder_checklist_v1(speciesbinder);
  if response->>'unit' is distinct from 'card_prints' or (response->>'total_slots')::integer is distinct from 1
    or (response->>'member_completed_slots')::integer is distinct from 1 then raise exception 'species_regression'; end if;

  execute 'reset role';
  select id into binderid from public.binders where public_id=publicid;
  if (select count(*) from public.vault_item_instances where id in (owncopy,guestcopy,unresolved) and archived_at is null) <> 3 then
    raise exception 'binder_mutated_ownership'; end if;
  if (select count(*) from public.binder_contributions where binder_id=binderid and state='withdrawn') <> 2 then
    raise exception 'withdraw_history_missing'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claim.role','anon',true);
  execute 'set local role anon';
  blocked := false;
  begin perform public.binder_create_v1('Anonymous attempt','set','master_set','rpc-anon',p_set_id=>setid);
  exception when insufficient_privilege or invalid_authorization_specification then blocked := true; end;
  if not blocked then raise exception 'anonymous_mutation_allowed'; end if;
  blocked := false;
  begin perform public.binder_public_detail_v1(publicid);
  exception when sqlstate 'P0001' then blocked := sqlerrm='unavailable'; end;
  if not blocked then raise exception 'private_binder_public_leak'; end if;
  execute 'reset role';
end $$;
rollback;
select 'PASS: authenticated owner, invited contributor, outsider and anonymous RPC checks; all fixtures rolled back';
