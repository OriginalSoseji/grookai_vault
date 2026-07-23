begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

create temporary table binder_test_state (
  state_key text primary key,
  state_value uuid not null
) on commit drop;
grant select, insert, update, delete on table binder_test_state
to authenticated;

-- Stable fixture identities.
insert into auth.users (
  id, email, is_sso_user, is_anonymous, created_at, updated_at
) values
  ('10000000-0000-0000-0000-000000000001', 'binder-owner@example.test', false, false, now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'binder-member@example.test', false, false, now(), now()),
  ('10000000-0000-0000-0000-000000000003', 'binder-viewer@example.test', false, false, now(), now()),
  ('10000000-0000-0000-0000-000000000004', 'binder-other@example.test', false, false, now(), now()),
  ('10000000-0000-0000-0000-000000000005', 'binder-oracle-report@example.test', false, false, now(), now()),
  ('10000000-0000-0000-0000-000000000006', 'binder-oracle-action@example.test', false, false, now(), now()),
  ('10000000-0000-0000-0000-000000000007', 'binder-oracle-block@example.test', false, false, now(), now());

select ok(
  (select bool_and(enabled is false) from public.binder_feature_flags),
  'all Binder feature flags default off'
);

select ok(
  not has_table_privilege('authenticated', 'public.binders', 'select'),
  'authenticated cannot read raw binders'
);
select ok(
  not has_table_privilege('authenticated', 'public.binder_activity_events', 'select'),
  'authenticated cannot read raw Binder activity'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.interest_graph_emit_event_v1(text,text,uuid,uuid,uuid,jsonb,text,text)',
    'execute'
  ),
  'authenticated cannot execute the card-event emitter'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.interest_graph_log_emit_failure_v1(text,text,uuid,uuid,jsonb,text)',
    'execute'
  ),
  'authenticated cannot execute the emit-failure logger'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.card_events_emit_failures',
    'insert'
  ),
  'authenticated cannot forge emit-failure rows'
);

select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname like 'binder\_%' escape '\'
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) setting
        where setting like 'search_path=%'
      )
  ),
  0,
  'every Binder function has a fixed search_path'
);

select ok(
  position(
    'gen_random_bytes(16)'
    in (
      select pg_get_expr(adbin, adrelid)
      from pg_attrdef
      where adrelid = 'public.binders'::regclass
        and adnum = (
          select attnum
          from pg_attribute
          where attrelid = 'public.binders'::regclass
            and attname = 'public_id'
      )
    )
  ) > 0
  and exists (
    select 1
    from pg_attrdef ad
    join pg_depend d
      on d.classid = 'pg_attrdef'::regclass
     and d.objid = ad.oid
     and d.refclassid = 'pg_proc'::regclass
    join pg_proc p on p.oid = d.refobjid
    join pg_namespace n on n.oid = p.pronamespace
    where ad.adrelid = 'public.binders'::regclass
      and ad.adnum = (
        select attnum
        from pg_attribute
        where attrelid = 'public.binders'::regclass
          and attname = 'public_id'
      )
      and n.nspname = 'extensions'
      and p.proname = 'gen_random_bytes'
      and pg_get_function_identity_arguments(p.oid) = 'integer'
  ),
  'Binder public_id default uses all 128 CSPRNG bits'
);

select ok(public.binder_text_safe_v1('Family Binder', false), 'normal title is safe');
select ok(public.binder_text_safe_v1(E'Family\nBinder', true), 'description permits normal multiline text');
select ok(public.binder_text_safe_v1('<script>alert(1)</script>', false), 'HTML-looking input remains ordinary text');
select ok(not public.binder_text_safe_v1(E'bad\x01text', false), 'control character is rejected');
select ok(not public.binder_text_safe_v1('bad' || chr(8238) || 'text', false), 'bidi override is rejected');
select ok(not public.binder_text_safe_v1(chr(8203), false), 'zero-width blank title is rejected');
select ok(not public.binder_text_safe_v1(chr(8288), false), 'word joiner blank title is rejected');
select ok(not public.binder_text_safe_v1(chr(65279), false), 'BOM blank title is rejected');

update public.binder_feature_flags
set enabled = true
where flag_key in (
  'schema_internal',
  'personal',
  'shared',
  'view_links',
  'public',
  'community',
  'pulse_milestones',
  'custom'
);

insert into public.public_profiles (
  user_id, slug, display_name, public_profile_enabled, vault_sharing_enabled
) values
  ('10000000-0000-0000-0000-000000000001', 'binder-owner', 'Binder Owner', true, true),
  ('10000000-0000-0000-0000-000000000002', 'binder-member', 'Binder Member', true, true),
  ('10000000-0000-0000-0000-000000000003', 'binder-viewer', 'Binder Viewer', true, true),
  ('10000000-0000-0000-0000-000000000004', 'binder-other', 'Binder Other', true, true);

insert into public.sets (id, game, code, name)
values (
  '20000000-0000-0000-0000-000000000001',
  'pokemon',
  'TST',
  'Binder Test Set'
);
insert into public.pokemon_species (
  id, national_dex_number, canonical_name, display_name, slug
) values (
  '30000000-0000-0000-0000-000000000001',
  25,
  'Pikachu Test',
  'Pikachu Test',
  'pikachu-test'
);
insert into public.card_prints (
  id, game_id, set_id, name, number, set_code, gv_id, image_source, image_path
) values
  (
    '40000000-0000-0000-0000-000000000001',
    (select id from public.games where code = 'pokemon'),
    '20000000-0000-0000-0000-000000000001',
    'Hosted Pikachu',
    '1',
    'TST',
    'GV-TST-001',
    'identity',
    'canon/GV-TST-001/front.webp'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    (select id from public.games where code = 'pokemon'),
    '20000000-0000-0000-0000-000000000001',
    'Fallback Pikachu',
    '2',
    'TST',
    'GV-TST-002',
    'tcgdex',
    null
  );
insert into public.card_print_species (
  card_print_id, species_id, role, counts_for_completion, source
) values
  (
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'primary',
    true,
    'binder_test'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    'primary',
    true,
    'binder_test'
  );

insert into public.vault_owners (user_id, owner_code, next_instance_index)
values (
  '10000000-0000-0000-0000-000000000002',
  'BTEST',
  3
);
insert into public.vault_item_instances (
  id, user_id, gv_vi_id, card_print_id
) values
  (
    '50000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    public.generate_gv_vi_id_v1('BTEST', 1),
    '40000000-0000-0000-0000-000000000001'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    public.generate_gv_vi_id_v1('BTEST', 2),
    '40000000-0000-0000-0000-000000000001'
  );

insert into public.binders (
  id,
  public_id,
  owner_user_id,
  title,
  target_kind,
  species_id,
  checklist_mode,
  read_access,
  discoverability,
  join_policy,
  contribution_policy,
  cover_card_print_id
) values (
  '80000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Family Pikachu Binder',
  'species',
  '30000000-0000-0000-0000-000000000001',
  'card_prints',
  'public',
  'listed',
  'closed',
  'approval_required',
  '40000000-0000-0000-0000-000000000001'
);
insert into public.binder_members (
  id,
  public_action_ref,
  binder_id,
  user_id,
  role,
  state,
  membership_epoch,
  joined_at,
  content_scope,
  content_consent_epoch,
  content_consent_revision,
  identity_scope
) values
  (
    '60000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001',
    '80000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'owner',
    'active',
    1,
    now(),
    'public',
    1,
    1,
    'none'
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    '61000000-0000-0000-0000-000000000002',
    '80000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    'contributor',
    'active',
    1,
    now(),
    'public',
    1,
    1,
    'none'
  );
insert into public.binder_contributions (
  id,
  public_action_ref,
  binder_id,
  contributor_member_id,
  contributor_user_id,
  contributor_membership_epoch,
  vault_item_instance_id,
  state,
  snapshot_gv_vi_id,
  snapshot_card_print_id,
  source,
  added_by_user_id,
  activated_at
) values
  (
    '70000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000001',
    '80000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    1,
    '50000000-0000-0000-0000-000000000001',
    'active',
    public.generate_gv_vi_id_v1('BTEST', 1),
    '40000000-0000-0000-0000-000000000001',
    'manual',
    '10000000-0000-0000-0000-000000000002',
    now()
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    '71000000-0000-0000-0000-000000000002',
    '80000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    1,
    '50000000-0000-0000-0000-000000000002',
    'pending',
    public.generate_gv_vi_id_v1('BTEST', 2),
    '40000000-0000-0000-0000-000000000001',
    'manual',
    '10000000-0000-0000-0000-000000000002',
    null
  );

do $$
begin
  perform public.binder_progress_recalculate_v1(
    '80000000-0000-0000-0000-000000000001',
    'user',
    '10000000-0000-0000-0000-000000000001'
  );
end;
$$;

select is(
  public.binder_card_json_v1(
    '40000000-0000-0000-0000-000000000001',
    null
  ) ->> 'image_url',
  'https://grookaivault.com/api/canon/cards/GV-TST-001/image',
  'card JSON uses the Grookai canonical proxy'
);
select ok(
  not (
    public.binder_card_json_v1(
      '40000000-0000-0000-0000-000000000001',
      null
    ) ?| array['image_path', 'fallback_image_url']
  ),
  'card JSON omits raw path and direct fallback keys'
);
select ok(
  public.binder_card_has_hosted_canonical_image_v1(
    '40000000-0000-0000-0000-000000000001'
  ),
  'hosted canonical image predicate accepts hosted card'
);
select ok(
  not public.binder_card_has_hosted_canonical_image_v1(
    '40000000-0000-0000-0000-000000000002'
  ),
  'hosted canonical image predicate rejects third-party-only card'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select lives_ok(
  $$select public.binder_pulse_milestone_share_v1(
    '81000000-0000-0000-0000-000000000001',
    50,
    'pulse-share-fixture'
  )$$,
  'Owner can explicitly share a real crossed Binder milestone'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
select is(
  (
    select count(*)::integer
    from public.card_events
    where event_type = 'binder_milestone_shared'
  ),
  1,
  'lawful viewer can read current public Binder milestone row'
);
select throws_ok(
  $$insert into public.card_events (
    event_type, actor_user_id, payload, visibility
  ) values (
    'binder_milestone_shared',
    '10000000-0000-0000-0000-000000000003',
    '{}'::jsonb,
    'public'
  )$$,
  '42501',
  'new row violates row-level security policy for table "card_events"',
  'authenticated user cannot forge a reserved Binder card event'
);
reset role;

update public.binders
set read_access = 'private', discoverability = 'unlisted'
where id = '80000000-0000-0000-0000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
select is(
  (select count(*)::integer from public.card_events where event_type = 'binder_milestone_shared'),
  0,
  'milestone raw row disappears when Binder becomes private'
);
reset role;
update public.binders
set read_access = 'public', discoverability = 'listed'
where id = '80000000-0000-0000-0000-000000000001';

update public.binders set discoverability = 'unlisted'
where id = '80000000-0000-0000-0000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
select is(
  (select count(*)::integer from public.card_events where event_type = 'binder_milestone_shared'),
  0,
  'milestone raw row disappears when Binder becomes unlisted'
);
reset role;
update public.binders set discoverability = 'listed'
where id = '80000000-0000-0000-0000-000000000001';

update public.binders set moderation_state = 'frozen'
where id = '80000000-0000-0000-0000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
select is(
  (select count(*)::integer from public.card_events where event_type = 'binder_milestone_shared'),
  0,
  'milestone raw row disappears when Binder is frozen'
);
reset role;
update public.binders set moderation_state = 'clear'
where id = '80000000-0000-0000-0000-000000000001';

update public.binder_feature_flags set enabled = false
where flag_key = 'pulse_milestones';
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
select is(
  (select count(*)::integer from public.card_events where event_type = 'binder_milestone_shared'),
  0,
  'milestone raw row disappears when Pulse Binder flag is revoked'
);
reset role;
update public.binder_feature_flags set enabled = true
where flag_key = 'pulse_milestones';

update public.public_profiles set vault_sharing_enabled = false
where user_id = '10000000-0000-0000-0000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
select is(
  (select count(*)::integer from public.card_events where event_type = 'binder_milestone_shared'),
  0,
  'milestone raw row disappears when owner Vault sharing is revoked'
);
reset role;
update public.public_profiles set vault_sharing_enabled = true
where user_id = '10000000-0000-0000-0000-000000000001';

update public.binders set definition_revision = 2
where id = '80000000-0000-0000-0000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
select is(
  (select count(*)::integer from public.card_events where event_type = 'binder_milestone_shared'),
  0,
  'milestone raw row disappears after Binder definition revision changes'
);
reset role;
update public.binders set definition_revision = 1
where id = '80000000-0000-0000-0000-000000000001';

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select lives_ok(
  $$select public.binder_update_policy_v1(
    '81000000-0000-0000-0000-000000000001',
    'public',
    'listed',
    'closed',
    'members_direct',
    'policy-preserve-pending'
  )$$,
  'approval-required to members-direct policy update succeeds'
);
reset role;
select is(
  (
    select state
    from public.binder_contributions
    where id = '70000000-0000-0000-0000-000000000002'
  ),
  'pending',
  'compatible pending contribution is preserved'
);

update public.binders
set cover_card_print_id = '40000000-0000-0000-0000-000000000002'
where id = '80000000-0000-0000-0000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select lives_ok(
  $$select public.binder_update_policy_v1(
    '81000000-0000-0000-0000-000000000001',
    'public',
    'listed',
    'closed',
    'owner_only',
    'policy-owner-only'
  )$$,
  'owner-only policy transition succeeds'
);
reset role;
select is(
  (
    select state
    from public.binder_contributions
    where id = '70000000-0000-0000-0000-000000000002'
  ),
  'rejected',
  'only incompatible pending contribution is rejected'
);
select is(
  (
    select cover_card_print_id
    from public.binders
    where id = '80000000-0000-0000-0000-000000000001'
  ),
  null::uuid,
  'public-listed policy transition clears non-hosted cover'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select throws_ok(
  $$select public.binder_update_metadata_v1(
    '81000000-0000-0000-0000-000000000001',
    'Family Pikachu Binder',
    null,
    '40000000-0000-0000-0000-000000000002',
    'metadata-reject-unhosted-community-cover'
  )$$,
  '22023',
  'hosted_cover_required',
  'public-listed metadata update rejects a non-hosted species cover'
);
select lives_ok(
  $$select public.binder_update_metadata_v1(
    '81000000-0000-0000-0000-000000000001',
    'Family Pikachu Binder',
    null,
    '40000000-0000-0000-0000-000000000001',
    'metadata-set-hosted-community-cover'
  )$$,
  'public-listed metadata update accepts a hosted canonical cover'
);
select lives_ok(
  $$select public.binder_update_metadata_v1(
    '81000000-0000-0000-0000-000000000001',
    'Family Pikachu Binder',
    null,
    null,
    'metadata-clear-community-cover'
  )$$,
  'explicit nullable cover input clears the cover'
);
reset role;
select is(
  (
    select cover_card_print_id
    from public.binders
    where id = '80000000-0000-0000-0000-000000000001'
  ),
  null::uuid,
  'metadata clear persists a null cover'
);
select is(
  (
    select (payload ->> 'cover_changed')::boolean
    from public.binder_activity_events
    where binder_id = '80000000-0000-0000-0000-000000000001'
      and event_type = 'metadata_updated'
    order by created_at desc, id desc
    limit 1
  ),
  true,
  'metadata clear activity records cover_changed=true'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
select ok(
  position(
    '"contribution_action_ref"'
    in public.binder_public_detail_v1(
      '81000000-0000-0000-0000-000000000001'
    )::text
  ) > 0,
  'authenticated public projection includes opaque action refs'
);
select is(
  public.binder_public_detail_v1(
    '81000000-0000-0000-0000-000000000001'
  ) -> 'permissions' ->> 'can_report',
  'true',
  'authenticated non-owner public viewer may report the Binder'
);
select is(
  public.binder_public_detail_v1(
    '81000000-0000-0000-0000-000000000001'
  ) -> 'permissions' ->> 'can_block_owner',
  'true',
  'authenticated non-owner public viewer may block the owner'
);
select ok(
  position(
    '"image_path"'
    in public.binder_public_detail_v1(
      '81000000-0000-0000-0000-000000000001'
    )::text
  ) = 0,
  'public projection recursively omits image_path'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select is(
  public.binder_public_detail_v1(
    '81000000-0000-0000-0000-000000000001'
  ) -> 'permissions' ->> 'can_report',
  'false',
  'owner viewing own public Binder cannot report themselves'
);
select is(
  public.binder_public_detail_v1(
    '81000000-0000-0000-0000-000000000001'
  ) -> 'permissions' ->> 'can_block_owner',
  'false',
  'owner viewing own public Binder cannot block themselves'
);
reset role;

set local role anon;
select ok(
  position(
    'action_ref'
    in public.binder_public_detail_v1(
      '81000000-0000-0000-0000-000000000001'
    )::text
  ) = 0,
  'anonymous public projection contains no action refs'
);
select is(
  public.binder_public_detail_v1(
    '81000000-0000-0000-0000-000000000001'
  ) -> 'permissions' ->> 'can_block_owner',
  'false',
  'anonymous public viewer cannot block the owner'
);
reset role;
select ok(
  position(
    'action_ref'
    in public.binder_external_checklist_page_v1(
      '80000000-0000-0000-0000-000000000001',
      'link',
      '10000000-0000-0000-0000-000000000003',
      50,
      null
    )::text
  ) = 0,
  'view-link projection contains no public moderation action refs'
);

update public.binder_feature_flags
set enabled = false
where flag_key = 'personal';
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000004';
select throws_ok(
  $$select public.binder_block_owner_v1(
    '81000000-0000-0000-0000-000000000001',
    'target-disabled-owner-block'
  )$$,
  'P0001',
  'unavailable',
  'nonmember owner block is unavailable when Binder target is disabled'
);
select is(
  public.binder_report_v1(
    'binder',
    '81000000-0000-0000-0000-000000000001',
    'other',
    'target-disabled report probe',
    'target-disabled-binder-report'
  ),
  '{"ok": true}'::jsonb,
  'target-disabled public Binder report returns generic success'
);
reset role;
select is(
  (
    select count(*)::integer
    from public.trust_blocks
    where user_id = '10000000-0000-0000-0000-000000000004'
      and blocked_user_id = '10000000-0000-0000-0000-000000000001'
  ),
  0,
  'target-disabled owner block creates no Trust row'
);
select is(
  (
    select count(*)::integer
    from public.trust_reports
    where reporter_user_id = '10000000-0000-0000-0000-000000000004'
  ),
  0,
  'target-disabled public Binder report creates no Trust row'
);
update public.binder_feature_flags
set enabled = true
where flag_key = 'personal';

update public.binder_feature_flags
set enabled = false
where flag_key = 'public';
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000004';
select is(
  public.binder_report_v1(
    'binder',
    '81000000-0000-0000-0000-000000000001',
    'other',
    'public-disabled report probe',
    'public-disabled-binder-report'
  ),
  '{"ok": true}'::jsonb,
  'public-disabled Binder report returns generic success'
);
reset role;
select is(
  (
    select count(*)::integer
    from public.trust_reports
    where reporter_user_id = '10000000-0000-0000-0000-000000000004'
  ),
  0,
  'public-disabled Binder report creates no Trust row'
);
update public.binder_feature_flags
set enabled = true
where flag_key = 'public';

update public.binder_members
set
  content_scope = 'none',
  content_consent_epoch = null,
  content_consent_revision = null
where id = '60000000-0000-0000-0000-000000000002';
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
select is(
  public.binder_public_action_report_v1(
    '81000000-0000-0000-0000-000000000001',
    'contribution',
    '71000000-0000-0000-0000-000000000001',
    'other',
    'stale ref probe',
    'stale-action-report'
  ),
  '{"ok": true}'::jsonb,
  'stale public action ref returns generic success'
);
reset role;
select is(
  (
    select count(*)::integer
    from public.trust_reports
    where reporter_user_id = '10000000-0000-0000-0000-000000000003'
  ),
  0,
  'stale public action ref stores no report'
);
update public.binder_members
set
  content_scope = 'public',
  content_consent_epoch = membership_epoch,
  content_consent_revision = 1
where id = '60000000-0000-0000-0000-000000000002';

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
select is(
  public.binder_public_action_report_v1(
    '81000000-0000-0000-0000-000000000001',
    'contribution',
    '71000000-0000-0000-0000-000000000001',
    'spam',
    E'public contribution report\nwithout private copy data',
    'valid-action-report'
  ),
  '{"ok": true}'::jsonb,
  'lawful public contribution report returns generic success'
);
reset role;
select is(
  (
    select count(*)::integer
    from public.trust_reports
    where reporter_user_id = '10000000-0000-0000-0000-000000000003'
      and surface = 'binder_contribution'
  ),
  1,
  'lawful public contribution report is stored against internal authority'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
select is(
  public.binder_public_member_block_v1(
    '81000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000002',
    'valid-member-block'
  ),
  '{"ok": true}'::jsonb,
  'lawful opaque public member block returns generic success'
);
select is(
  (
    public.binder_public_detail_v1(
      '81000000-0000-0000-0000-000000000001'
    ) -> 'checklist' -> 0 ->> 'active_quantity'
  )::integer,
  1,
  'blocking non-owner contributor retains canonical coverage'
);
select ok(
  position(
    'action_ref'
    in public.binder_public_detail_v1(
      '81000000-0000-0000-0000-000000000001'
    )::text
  ) = 0,
  'blocked contributor action refs disappear on refetch'
);
reset role;
select ok(
  exists (
    select 1
    from public.trust_blocks
    where user_id = '10000000-0000-0000-0000-000000000003'
      and blocked_user_id = '10000000-0000-0000-0000-000000000002'
  ),
  'public block resolves opaque ref to Trust authority'
);
select is(
  (
    select state
    from public.binder_contributions
    where id = '70000000-0000-0000-0000-000000000001'
  ),
  'active',
  'outsider block does not remove contributor copy'
);

select ok(
  (
    select count(*) > 0
    from public.binder_refresh_signals
    where binder_public_id = '81000000-0000-0000-0000-000000000001'
  ),
  'activity transactionally creates sanitized refresh signal'
);
select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'binder_refresh_signals'
  ),
  3,
  'refresh signal has only three allow-listed columns'
);
select ok(
  exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'binder_refresh_signals'
  ),
  'only sanitized refresh authority is published for Binder Realtime'
);
select is(
  (
    select count(*)::integer
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename like 'binder\_%' escape '\'
      and tablename <> 'binder_refresh_signals'
  ),
  0,
  'no raw Binder domain table is in Realtime publication'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select is(
  (
    select count(*)::integer
    from public.binder_refresh_signals
    where binder_public_id = '81000000-0000-0000-0000-000000000001'
  ),
  1,
  'active member can subscribe to the sanitized Binder refresh row'
);
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000004';
select is(
  (
    select count(*)::integer
    from public.binder_refresh_signals
    where binder_public_id = '81000000-0000-0000-0000-000000000001'
  ),
  0,
  'outsider cannot subscribe to Binder refresh authority'
);
reset role;
update public.binder_members
set state = 'suspended', suspended_at = now()
where id = '60000000-0000-0000-0000-000000000002';
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
select is(
  (
    select count(*)::integer
    from public.binder_refresh_signals
    where binder_public_id = '81000000-0000-0000-0000-000000000001'
  ),
  0,
  'suspended member cannot subscribe to Binder refresh authority'
);
reset role;
update public.binder_members
set state = 'active', suspended_at = null
where id = '60000000-0000-0000-0000-000000000002';
update public.binder_feature_flags
set enabled = false
where flag_key = 'schema_internal';
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select is(
  (
    select count(*)::integer
    from public.binder_refresh_signals
    where binder_public_id = '81000000-0000-0000-0000-000000000001'
  ),
  0,
  'schema kill switch revokes refresh subscription immediately'
);
reset role;
update public.binder_feature_flags
set enabled = true
where flag_key = 'schema_internal';

insert into public.binders (
  id,
  public_id,
  owner_user_id,
  title,
  target_kind,
  species_id,
  checklist_mode,
  read_access,
  discoverability
) values (
  '80000000-0000-0000-0000-000000000002',
  '81000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  'Private Link Binder',
  'species',
  '30000000-0000-0000-0000-000000000001',
  'card_prints',
  'private',
  'unlisted'
);
insert into public.binder_members (
  id, binder_id, user_id, role, state, joined_at
) values
  (
    '60000000-0000-0000-0000-000000000003',
    '80000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'owner',
    'active',
    now()
  ),
  (
    '60000000-0000-0000-0000-000000000004',
    '80000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'contributor',
    'active',
    now()
  );
insert into public.binder_contributions (
  id,
  binder_id,
  contributor_member_id,
  contributor_user_id,
  contributor_membership_epoch,
  vault_item_instance_id,
  state,
  snapshot_gv_vi_id,
  snapshot_card_print_id,
  source,
  added_by_user_id,
  activated_at
) values (
  '70000000-0000-0000-0000-000000000003',
  '80000000-0000-0000-0000-000000000002',
  '60000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000002',
  1,
  '50000000-0000-0000-0000-000000000001',
  'active',
  public.generate_gv_vi_id_v1('BTEST', 1),
  '40000000-0000-0000-0000-000000000001',
  'manual',
  '10000000-0000-0000-0000-000000000002',
  now()
);
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select lives_ok(
  $$select public.binder_view_link_create_v1(
    '81000000-0000-0000-0000-000000000002',
    'view-link-first',
    'Family link',
    null
  )$$,
  'view link creation succeeds'
);
reset role;
select is(
  (
    select count(*)::integer
    from public.binder_activity_events
    where binder_id = '80000000-0000-0000-0000-000000000002'
      and event_type in ('policy_updated', 'view_link_created')
  ),
  2,
  'private-to-link transition emits policy and link events'
);
select ok(
  not exists (
    select 1
    from public.binder_idempotency_keys
    where idempotency_key = 'view-link-first'
       or response ? 'token'
       or response ? 'url'
  ),
  'idempotency storage contains no plaintext key, token, or secret URL'
);
select ok(
  (
    select bool_and(idempotency_key ~ '^[0-9a-f]{64}$')
    from public.binder_idempotency_keys
  ),
  'all persisted idempotency keys are SHA-256 hex digests'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select lives_ok(
  $sql$
    insert into pg_temp.binder_test_state (state_key, state_value)
    select
      'target_decline_offer',
      (
        public.binder_owner_transfer_offer_v1(
          '81000000-0000-0000-0000-000000000002',
          '60000000-0000-0000-0000-000000000004',
          'manager',
          'transfer-target-decline-offer'
        ) ->> 'offer_id'
      )::uuid
  $sql$,
  'owner can create a transfer offer for target-decline testing'
);
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
select lives_ok(
  $$select public.binder_owner_transfer_revoke_v1(
    (
      select state_value
      from pg_temp.binder_test_state
      where state_key = 'target_decline_offer'
    ),
    'transfer-target-decline'
  )$$,
  'pending target can decline an ownership transfer offer'
);
reset role;
select ok(
  exists (
    select 1
    from public.binder_activity_events
    where binder_id = '80000000-0000-0000-0000-000000000002'
      and event_type = 'owner_transfer_revoked'
      and payload ->> 'disposition' = 'declined_by_target'
  ),
  'target decline is distinguishable in immutable audit payload'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select lives_ok(
  $sql$
    insert into pg_temp.binder_test_state (state_key, state_value)
    select
      'owner_revoke_offer',
      (
        public.binder_owner_transfer_offer_v1(
          '81000000-0000-0000-0000-000000000002',
          '60000000-0000-0000-0000-000000000004',
          'manager',
          'transfer-owner-revoke-offer'
        ) ->> 'offer_id'
      )::uuid
  $sql$,
  'owner can create a transfer offer for owner-revoke testing'
);
select lives_ok(
  $$select public.binder_owner_transfer_revoke_v1(
    (
      select state_value
      from pg_temp.binder_test_state
      where state_key = 'owner_revoke_offer'
    ),
    'transfer-owner-revoke'
  )$$,
  'current owner can revoke a pending ownership transfer'
);
reset role;
select ok(
  exists (
    select 1
    from public.binder_activity_events
    where binder_id = '80000000-0000-0000-0000-000000000002'
      and event_type = 'owner_transfer_revoked'
      and payload ->> 'disposition' = 'revoked_by_owner'
  ),
  'owner revocation is distinguishable in immutable audit payload'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select lives_ok(
  $sql$
    insert into pg_temp.binder_test_state (state_key, state_value)
    select
      'foreign_denied_offer',
      (
        public.binder_owner_transfer_offer_v1(
          '81000000-0000-0000-0000-000000000002',
          '60000000-0000-0000-0000-000000000004',
          'manager',
          'transfer-foreign-denied-offer'
        ) ->> 'offer_id'
      )::uuid
  $sql$,
  'owner can create a transfer offer for foreign-caller testing'
);
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000004';
select throws_ok(
  $$select public.binder_owner_transfer_revoke_v1(
    (
      select state_value
      from pg_temp.binder_test_state
      where state_key = 'foreign_denied_offer'
    ),
    'transfer-foreign-denied'
  )$$,
  '42501',
  'not_authorized',
  'foreign caller cannot revoke or decline an ownership transfer'
);
reset role;
select is(
  (
    select status
    from public.binder_owner_transfer_offers
    where id = (
      select state_value
      from pg_temp.binder_test_state
      where state_key = 'foreign_denied_offer'
    )
  ),
  'pending',
  'foreign decline attempt leaves transfer offer pending'
);
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select lives_ok(
  $$select public.binder_owner_transfer_revoke_v1(
    (
      select state_value
      from pg_temp.binder_test_state
      where state_key = 'foreign_denied_offer'
    ),
    'transfer-foreign-test-cleanup'
  )$$,
  'owner can clean up foreign-caller fixture offer'
);
select lives_ok(
  $sql$
    insert into pg_temp.binder_test_state (state_key, state_value)
    select
      'frozen_offer',
      (
        public.binder_owner_transfer_offer_v1(
          '81000000-0000-0000-0000-000000000002',
          '60000000-0000-0000-0000-000000000004',
          'manager',
          'transfer-frozen-offer'
        ) ->> 'offer_id'
      )::uuid
  $sql$,
  'owner can create a transfer offer for frozen-state testing'
);
reset role;

set local role service_role;
set local request.jwt.claim.role = 'service_role';
select lives_ok(
  $$select public.binder_service_moderate_v1(
    '80000000-0000-0000-0000-000000000002',
    'frozen',
    'binder-test-freeze',
    'service-freeze-transfer-fixture'
  )$$,
  'service can freeze transfer fixture Binder'
);
reset role;
select set_config('request.jwt.claim.role', '', true);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
select is(
  public.binder_report_v1(
    'binder',
    '81000000-0000-0000-0000-000000000002',
    'other',
    'frozen member safety report',
    'frozen-member-report'
  ),
  '{"ok": true}'::jsonb,
  'active member retains Report safety action while Binder is frozen'
);
select throws_ok(
  $$select public.binder_owner_transfer_revoke_v1(
    (
      select state_value
      from pg_temp.binder_test_state
      where state_key = 'frozen_offer'
    ),
    'transfer-frozen-target-decline'
  )$$,
  'P0001',
  'unavailable',
  'target decline is disabled while Binder is frozen'
);
select throws_ok(
  $$select public.binder_owner_transfer_accept_v1(
    (
      select state_value
      from pg_temp.binder_test_state
      where state_key = 'frozen_offer'
    ),
    'transfer-frozen-target-accept'
  )$$,
  'P0001',
  'conflict',
  'target accept is disabled while Binder is frozen'
);
reset role;
select is(
  (
    select count(*)::integer
    from public.trust_reports
    where reporter_user_id = '10000000-0000-0000-0000-000000000002'
      and surface = 'binder'
      and surface_id = '80000000-0000-0000-0000-000000000002'
  ),
  1,
  'frozen member safety report is stored'
);

set local role service_role;
set local request.jwt.claim.role = 'service_role';
select lives_ok(
  $$select public.binder_service_moderate_v1(
    '80000000-0000-0000-0000-000000000002',
    'clear',
    'binder-test-unfreeze',
    'service-unfreeze-transfer-fixture'
  )$$,
  'service can clear frozen transfer fixture'
);
reset role;
select set_config('request.jwt.claim.role', '', true);
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select lives_ok(
  $$select public.binder_owner_transfer_revoke_v1(
    (
      select state_value
      from pg_temp.binder_test_state
      where state_key = 'frozen_offer'
    ),
    'transfer-frozen-test-cleanup'
  )$$,
  'owner can revoke transfer after moderation clears'
);
reset role;

set local role service_role;
set local request.jwt.claim.role = 'service_role';
select lives_ok(
  $$select public.binder_service_moderate_v1(
    '80000000-0000-0000-0000-000000000002',
    'removed',
    'binder-test-remove',
    'service-remove-terminal-fixture'
  )$$,
  'service can move Binder into terminal removed moderation'
);
select lives_ok(
  $$select public.binder_service_moderate_v1(
    '80000000-0000-0000-0000-000000000002',
    'removed',
    'binder-test-remove-repeat',
    'service-remove-terminal-fixture-repeat'
  )$$,
  'same-state removed moderation is idempotent'
);
select throws_ok(
  $$select public.binder_service_moderate_v1(
    '80000000-0000-0000-0000-000000000002',
    'clear',
    'binder-test-revive-denied',
    'service-revive-terminal-fixture'
  )$$,
  'P0001',
  'unavailable',
  'removed Binder cannot be revived by moderation RPC'
);
reset role;
select set_config('request.jwt.claim.role', '', true);
select is(
  (
    select moderation_state
    from public.binders
    where id = '80000000-0000-0000-0000-000000000002'
  ),
  'removed',
  'failed revival leaves Binder terminally removed'
);
select is(
  (
    select state
    from public.binder_contributions
    where id = '70000000-0000-0000-0000-000000000003'
  ),
  'invalidated',
  'Binder removal invalidates live contribution'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
select throws_ok(
  $$select public.binder_leave_v1(
    '81000000-0000-0000-0000-000000000002',
    'removed-binder-leave'
  )$$,
  'P0001',
  'unavailable',
  'member cannot mutate removed Binder through Leave'
);
select is(
  public.binder_report_v1(
    'binder',
    '81000000-0000-0000-0000-000000000002',
    'other',
    'removed Binder report probe',
    'removed-binder-report'
  ),
  '{"ok": true}'::jsonb,
  'removed Binder report fails closed with generic response'
);
reset role;
select is(
  (
    select count(*)::integer
    from public.trust_reports
    where reporter_user_id = '10000000-0000-0000-0000-000000000002'
      and surface = 'binder'
      and surface_id = '80000000-0000-0000-0000-000000000002'
  ),
  1,
  'removed Binder report stores no additional Trust row'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select is(
  public.binder_report_v1(
    'binder_member',
    '60000000-0000-0000-0000-000000000004',
    'other',
    'removed member report probe',
    'removed-member-report'
  ),
  '{"ok": true}'::jsonb,
  'removed Binder member-surface report returns generic response'
);
select is(
  public.binder_report_v1(
    'binder_contribution',
    '70000000-0000-0000-0000-000000000003',
    'other',
    'removed contribution report probe',
    'removed-contribution-report'
  ),
  '{"ok": true}'::jsonb,
  'removed Binder contribution-surface report returns generic response'
);
select is(
  (
    select count(*)::integer
    from public.binder_refresh_signals
    where binder_public_id = '81000000-0000-0000-0000-000000000002'
  ),
  0,
  'removed Binder owner loses Realtime refresh authority'
);
reset role;
select is(
  (
    select count(*)::integer
    from public.trust_reports
    where reporter_user_id = '10000000-0000-0000-0000-000000000001'
      and surface in ('binder_member', 'binder_contribution')
      and surface_id in (
        '60000000-0000-0000-0000-000000000004',
        '70000000-0000-0000-0000-000000000003'
      )
  ),
  0,
  'removed member/contribution surfaces store no Trust reports'
);

insert into public.vault_owners (user_id, owner_code, next_instance_index)
values (
  '10000000-0000-0000-0000-000000000004',
  'BT04',
  3
);
insert into public.vault_item_instances (
  id, user_id, gv_vi_id, card_print_id
) values
  (
    '50000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000004',
    public.generate_gv_vi_id_v1('BT04', 1),
    '40000000-0000-0000-0000-000000000001'
  ),
  (
    '50000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000004',
    public.generate_gv_vi_id_v1('BT04', 2),
    '40000000-0000-0000-0000-000000000001'
  );
insert into public.binders (
  id,
  public_id,
  owner_user_id,
  title,
  target_kind,
  species_id,
  checklist_mode,
  read_access,
  discoverability
) values (
  '80000000-0000-0000-0000-000000000003',
  '81000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000001',
  'Epoch Rotation Binder',
  'species',
  '30000000-0000-0000-0000-000000000001',
  'card_prints',
  'public',
  'listed'
);
insert into public.binder_members (
  id,
  public_action_ref,
  binder_id,
  user_id,
  role,
  state,
  membership_epoch,
  joined_at,
  suspended_at
) values
  (
    '60000000-0000-0000-0000-000000000005',
    '62000000-0000-0000-0000-000000000005',
    '80000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    'owner',
    'active',
    1,
    now(),
    null
  ),
  (
    '60000000-0000-0000-0000-000000000006',
    '62000000-0000-0000-0000-000000000006',
    '80000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000004',
    'contributor',
    'suspended',
    1,
    now() - interval '1 day',
    now()
  );

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select lives_ok(
  $$select public.binder_member_reinstate_v1(
    '60000000-0000-0000-0000-000000000006',
    'epoch-rotation-reinstate'
  )$$,
  'owner can reinstate suspended member into a new exposure epoch'
);
reset role;
select is(
  (
    select membership_epoch
    from public.binder_members
    where id = '60000000-0000-0000-0000-000000000006'
  ),
  2,
  'reinstatement increments membership epoch'
);
select isnt(
  (
    select public_action_ref
    from public.binder_members
    where id = '60000000-0000-0000-0000-000000000006'
  ),
  '62000000-0000-0000-0000-000000000006'::uuid,
  'reinstatement rotates opaque member action reference'
);
insert into pg_temp.binder_test_state (state_key, state_value)
select
  'epoch_current_member_action_ref',
  public_action_ref
from public.binder_members
where id = '60000000-0000-0000-0000-000000000006';
update public.binder_members
set
  content_scope = 'public',
  content_consent_epoch = membership_epoch,
  content_consent_revision = 1
where id = '60000000-0000-0000-0000-000000000006';
insert into public.binder_contributions (
  id,
  public_action_ref,
  binder_id,
  contributor_member_id,
  contributor_user_id,
  contributor_membership_epoch,
  vault_item_instance_id,
  state,
  snapshot_gv_vi_id,
  snapshot_card_print_id,
  source,
  added_by_user_id,
  activated_at
) values
  (
    '70000000-0000-0000-0000-000000000004',
    '72000000-0000-0000-0000-000000000004',
    '80000000-0000-0000-0000-000000000003',
    '60000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000004',
    1,
    '50000000-0000-0000-0000-000000000003',
    'active',
    public.generate_gv_vi_id_v1('BT04', 1),
    '40000000-0000-0000-0000-000000000001',
    'manual',
    '10000000-0000-0000-0000-000000000004',
    now()
  ),
  (
    '70000000-0000-0000-0000-000000000005',
    '72000000-0000-0000-0000-000000000005',
    '80000000-0000-0000-0000-000000000003',
    '60000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000004',
    2,
    '50000000-0000-0000-0000-000000000004',
    'active',
    public.generate_gv_vi_id_v1('BT04', 2),
    '40000000-0000-0000-0000-000000000001',
    'manual',
    '10000000-0000-0000-0000-000000000004',
    now()
  );
do $$
begin
  perform public.binder_progress_recalculate_v1(
    '80000000-0000-0000-0000-000000000003',
    'user',
    '10000000-0000-0000-0000-000000000001'
  );
end;
$$;

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
select is(
  public.binder_public_action_report_v1(
    '81000000-0000-0000-0000-000000000003',
    'member',
    '62000000-0000-0000-0000-000000000006',
    'other',
    'old member action ref',
    'old-epoch-member-action-ref'
  ),
  '{"ok": true}'::jsonb,
  'old-epoch member action ref returns generic success'
);
select is(
  public.binder_public_action_report_v1(
    '81000000-0000-0000-0000-000000000003',
    'contribution',
    '72000000-0000-0000-0000-000000000004',
    'other',
    'old contribution epoch ref',
    'old-epoch-contribution-action-ref'
  ),
  '{"ok": true}'::jsonb,
  'old-epoch contribution action ref returns generic success'
);
reset role;
select is(
  (
    select count(*)::integer
    from public.trust_reports
    where reporter_user_id = '10000000-0000-0000-0000-000000000002'
      and reported_user_id = '10000000-0000-0000-0000-000000000004'
      and surface in ('binder_member', 'binder_contribution')
  ),
  0,
  'old member and contribution refs resolve to no Trust authority'
);
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
select is(
  public.binder_public_action_report_v1(
    '81000000-0000-0000-0000-000000000003',
    'member',
    (
      select state_value
      from pg_temp.binder_test_state
      where state_key = 'epoch_current_member_action_ref'
    ),
    'other',
    'current member action ref',
    'current-epoch-member-action-ref'
  ),
  '{"ok": true}'::jsonb,
  'current-epoch member action ref remains lawful'
);
reset role;
select is(
  (
    select count(*)::integer
    from public.trust_reports
    where reporter_user_id = '10000000-0000-0000-0000-000000000002'
      and reported_user_id = '10000000-0000-0000-0000-000000000004'
      and surface = 'binder_member'
  ),
  1,
  'current-epoch member action ref resolves to Trust authority'
);

insert into public.binder_invitations (
  id,
  binder_id,
  inviter_user_id,
  is_account_targeted,
  intended_user_id,
  max_role,
  token_hash,
  expires_at
) values (
  '90000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000001',
  false,
  null,
  'viewer',
  public.binder_token_hash_v1('oracle-valid-invitation-token'),
  now() + interval '1 day'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000005';
select is(
  public.binder_report_v1(
    'binder',
    '81000000-0000-0000-0000-000000000003',
    'other',
    'valid report oracle',
    'report-oracle-valid-1'
  ),
  '{"ok": true}'::jsonb,
  'valid Binder report uses generic report envelope'
);
select lives_ok(
  $sql$do $body$
  begin
    for i in 1..4 loop
      perform public.binder_report_v1(
        'binder',
        gen_random_uuid(),
        'other',
        'stale report oracle',
        'report-oracle-stale-' || i::text
      );
    end loop;
    for i in 1..4 loop
      perform public.binder_invitation_report_v1(
        'random-invitation-token-' || i::text,
        'other',
        'random invitation oracle',
        'invitation-report-oracle-random-' || i::text
      );
    end loop;
  end;
  $body$;$sql$,
  'stale Binder and random invitation reports consume generic report bucket'
);
select is(
  public.binder_invitation_report_v1(
    'oracle-valid-invitation-token',
    'other',
    'valid invitation report oracle',
    'invitation-report-oracle-valid-10'
  ),
  '{"ok": true}'::jsonb,
  'valid invitation report converges on tenth generic report request'
);
select throws_ok(
  $$select public.binder_report_v1(
    'binder',
    gen_random_uuid(),
    'other',
    'over-limit report oracle',
    'report-oracle-over-limit'
  )$$,
  'P0001',
  'rate_limited',
  'valid/stale/random report surfaces share the same actor threshold'
);
reset role;
select is(
  (
    select count(*)::integer
    from public.binder_rate_limit_events
    where actor_user_id = '10000000-0000-0000-0000-000000000005'
      and action = 'report'
  ),
  10,
  'generic report bucket stores exactly ten successful probes'
);
select ok(
  (
    select bool_and(binder_id is null)
    from public.binder_rate_limit_events
    where actor_user_id = '10000000-0000-0000-0000-000000000005'
      and action = 'report'
  ),
  'generic report bucket never stores resolved Binder authority'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000006';
select is(
  public.binder_public_action_report_v1(
    '81000000-0000-0000-0000-000000000003',
    'member',
    (
      select state_value
      from pg_temp.binder_test_state
      where state_key = 'epoch_current_member_action_ref'
    ),
    'other',
    'valid public action oracle',
    'public-action-oracle-valid-1'
  ),
  '{"ok": true}'::jsonb,
  'valid public action report returns generic envelope'
);
select lives_ok(
  $sql$do $body$
  begin
    for i in 1..9 loop
      perform public.binder_public_action_report_v1(
        '81000000-0000-0000-0000-000000000003',
        'member',
        gen_random_uuid(),
        'other',
        'random public action oracle',
        'public-action-oracle-random-' || i::text
      );
    end loop;
  end;
  $body$;$sql$,
  'random public action refs consume the same bucket as valid refs'
);
select throws_ok(
  $$select public.binder_public_action_report_v1(
    '81000000-0000-0000-0000-000000000003',
    'member',
    gen_random_uuid(),
    'other',
    'over-limit public action oracle',
    'public-action-oracle-over-limit'
  )$$,
  'P0001',
  'rate_limited',
  'public action valid/random refs converge at the same threshold'
);
reset role;
select is(
  (
    select count(*)::integer
    from public.binder_rate_limit_events
    where actor_user_id = '10000000-0000-0000-0000-000000000006'
      and action = 'public_action_report'
      and binder_id is null
  ),
  10,
  'public action report bucket records ten target-independent probes'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000007';
select is(
  public.binder_public_member_block_v1(
    '81000000-0000-0000-0000-000000000003',
    (
      select state_value
      from pg_temp.binder_test_state
      where state_key = 'epoch_current_member_action_ref'
    ),
    'public-block-oracle-valid-1'
  ),
  '{"ok": true}'::jsonb,
  'valid public member block returns generic envelope'
);
select lives_ok(
  $sql$do $body$
  begin
    for i in 1..9 loop
      perform public.binder_public_member_block_v1(
        '81000000-0000-0000-0000-000000000003',
        gen_random_uuid(),
        'public-block-oracle-random-' || i::text
      );
    end loop;
  end;
  $body$;$sql$,
  'random public member refs consume the same bucket as valid block'
);
select throws_ok(
  $$select public.binder_public_member_block_v1(
    '81000000-0000-0000-0000-000000000003',
    gen_random_uuid(),
    'public-block-oracle-over-limit'
  )$$,
  'P0001',
  'rate_limited',
  'public member block valid/random refs converge at the same threshold'
);
reset role;
select is(
  (
    select count(*)::integer
    from public.binder_rate_limit_events
    where actor_user_id = '10000000-0000-0000-0000-000000000007'
      and action = 'public_member_block'
      and binder_id is null
  ),
  10,
  'public member block bucket records ten target-independent probes'
);

select * from finish();
rollback;
