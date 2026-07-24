with
required_relations(relation_name) as (
  values
    ('auth.users'),
    ('public.card_events'),
    ('public.card_events_emit_failures'),
    ('public.card_print_species'),
    ('public.card_printings'),
    ('public.card_prints'),
    ('public.finish_keys'),
    ('public.pokemon_species'),
    ('public.public_profiles'),
    ('public.sets'),
    ('public.slab_certs'),
    ('public.trust_blocks'),
    ('public.trust_reports'),
    ('public.vault_item_instances'),
    ('public.vault_owners'),
    ('public.watches')
),
required_columns(schema_name, table_name, column_name, data_type) as (
  values
    ('auth', 'users', 'id', 'uuid'),
    ('public', 'pokemon_species', 'id', 'uuid'),
    ('public', 'pokemon_species', 'active', 'boolean'),
    ('public', 'pokemon_species', 'display_name', 'text'),
    ('public', 'pokemon_species', 'slug', 'text'),
    ('public', 'sets', 'id', 'uuid'),
    ('public', 'sets', 'code', 'text'),
    ('public', 'sets', 'name', 'text'),
    ('public', 'sets', 'release_date', 'date'),
    ('public', 'card_prints', 'id', 'uuid'),
    ('public', 'card_prints', 'set_id', 'uuid'),
    ('public', 'card_prints', 'gv_id', 'text'),
    ('public', 'card_prints', 'name', 'text'),
    ('public', 'card_prints', 'set_code', 'text'),
    ('public', 'card_prints', 'number', 'text'),
    ('public', 'card_prints', 'number_plain', 'text'),
    ('public', 'card_prints', 'image_source', 'text'),
    ('public', 'card_prints', 'image_path', 'text'),
    ('public', 'card_printings', 'id', 'uuid'),
    ('public', 'card_printings', 'card_print_id', 'uuid'),
    ('public', 'card_printings', 'finish_key', 'text'),
    ('public', 'card_printings', 'printing_gv_id', 'text'),
    ('public', 'card_printings', 'image_source', 'text'),
    ('public', 'card_printings', 'image_path', 'text'),
    ('public', 'card_print_species', 'id', 'uuid'),
    ('public', 'card_print_species', 'card_print_id', 'uuid'),
    ('public', 'card_print_species', 'species_id', 'uuid'),
    ('public', 'card_print_species', 'active', 'boolean'),
    ('public', 'card_print_species', 'counts_for_completion', 'boolean'),
    ('public', 'card_print_species', 'created_at', 'timestamp with time zone'),
    ('public', 'slab_certs', 'id', 'uuid'),
    ('public', 'slab_certs', 'card_print_id', 'uuid'),
    ('public', 'vault_item_instances', 'id', 'uuid'),
    ('public', 'vault_item_instances', 'user_id', 'uuid'),
    ('public', 'vault_item_instances', 'gv_vi_id', 'text'),
    ('public', 'vault_item_instances', 'card_print_id', 'uuid'),
    ('public', 'vault_item_instances', 'card_printing_id', 'uuid'),
    ('public', 'vault_item_instances', 'slab_cert_id', 'uuid'),
    ('public', 'vault_item_instances', 'archived_at', 'timestamp with time zone'),
    ('public', 'vault_item_instances', 'created_at', 'timestamp with time zone'),
    ('public', 'vault_owners', 'user_id', 'uuid'),
    ('public', 'vault_owners', 'owner_code', 'text'),
    ('public', 'vault_owners', 'next_instance_index', 'bigint'),
    ('public', 'watches', 'id', 'uuid'),
    ('public', 'watches', 'user_id', 'uuid'),
    ('public', 'watches', 'subject_type', 'text'),
    ('public', 'watches', 'subject_id', 'uuid'),
    ('public', 'watches', 'reason', 'text'),
    ('public', 'watches', 'strength', 'double precision'),
    ('public', 'watches', 'origin', 'text'),
    ('public', 'watches', 'muted_at', 'timestamp with time zone'),
    ('public', 'watches', 'created_at', 'timestamp with time zone'),
    ('public', 'watches', 'updated_at', 'timestamp with time zone'),
    ('public', 'trust_reports', 'id', 'uuid'),
    ('public', 'trust_reports', 'reporter_user_id', 'uuid'),
    ('public', 'trust_reports', 'reported_user_id', 'uuid'),
    ('public', 'trust_reports', 'surface', 'text'),
    ('public', 'trust_reports', 'surface_id', 'text'),
    ('public', 'trust_reports', 'reason', 'text'),
    ('public', 'trust_reports', 'details', 'text'),
    ('public', 'trust_blocks', 'id', 'uuid'),
    ('public', 'trust_blocks', 'user_id', 'uuid'),
    ('public', 'trust_blocks', 'blocked_user_id', 'uuid'),
    ('public', 'card_events', 'id', 'uuid'),
    ('public', 'card_events', 'event_type', 'text'),
    ('public', 'card_events', 'card_print_id', 'uuid'),
    ('public', 'card_events', 'actor_user_id', 'uuid'),
    ('public', 'card_events', 'subject_user_id', 'uuid'),
    ('public', 'card_events', 'payload', 'jsonb'),
    ('public', 'card_events', 'visibility', 'text'),
    ('public', 'card_events', 'dedupe_key', 'text'),
    ('public', 'card_events', 'created_at', 'timestamp with time zone'),
    ('public', 'card_events_emit_failures', 'actor_user_id', 'uuid'),
    ('public', 'card_events_emit_failures', 'event_type', 'text'),
    ('public', 'card_events_emit_failures', 'card_print_id', 'uuid'),
    ('public', 'card_events_emit_failures', 'source', 'text'),
    ('public', 'card_events_emit_failures', 'error_message', 'text'),
    ('public', 'card_events_emit_failures', 'payload', 'jsonb'),
    ('public', 'public_profiles', 'user_id', 'uuid'),
    ('public', 'public_profiles', 'slug', 'text'),
    ('public', 'public_profiles', 'display_name', 'text'),
    ('public', 'public_profiles', 'avatar_path', 'text'),
    ('public', 'public_profiles', 'public_profile_enabled', 'boolean'),
    ('public', 'public_profiles', 'vault_sharing_enabled', 'boolean'),
    ('public', 'finish_keys', 'key', 'text'),
    ('public', 'finish_keys', 'label', 'text')
),
required_functions(function_signature) as (
  values
    ('auth.uid()'),
    ('auth.role()'),
    ('extensions.gen_random_bytes(integer)'),
    ('extensions.digest(bytea,text)'),
    ('public.set_timestamp_updated_at()'),
    ('public.generate_gv_vi_id_v1(text,bigint)'),
    ('public.trust_block_exists_between_v1(uuid,uuid)'),
    ('public.interest_graph_upsert_watch_v1(uuid,text,uuid,text,text)'),
    ('public.interest_graph_emit_event_v1(text,text,uuid,uuid,uuid,jsonb,text,text)'),
    ('public.interest_graph_log_emit_failure_v1(text,text,uuid,uuid,jsonb,text)'),
    ('public.interest_graph_card_event_visible_to_viewer_v1(uuid,uuid,uuid,text)'),
    ('public.interest_graph_collector_public_v1(uuid)'),
    ('public.pulse_jsonb_uuid_v1(text)'),
    ('public.pulse_eligible_events_for_viewer_v1(uuid)'),
    ('public.card_events_feed_v1(integer,timestamp with time zone,uuid)')
),
required_function_bodies(function_signature, body_sha256) as (
  values
    (
      'public.set_timestamp_updated_at()',
      'effca6b411b3297f7616459dc92c7fb3c2f105009c46197eb634bf8c7fd9d9f1'
    ),
    (
      'public.generate_gv_vi_id_v1(text,bigint)',
      '66ac5c43619b15ea2a041694379120c42ea334c2e5eae60412124ae66382c55c'
    ),
    (
      'public.trust_block_exists_between_v1(uuid,uuid)',
      'f4605ed5e8267e9b4a98f47940a60429853de8da54892b511d6cba6a98a9c42c'
    ),
    (
      'public.interest_graph_upsert_watch_v1(uuid,text,uuid,text,text)',
      'a52d510f7723e2f6c99835802e9f6a4c7b892edb3438b39fbf9bc41a2800bff4'
    ),
    (
      'public.interest_graph_emit_event_v1(text,text,uuid,uuid,uuid,jsonb,text,text)',
      '421ebfa825613341ad8dc6035f603caabdd6ac7d7a67a77452defdc66d94fbd5'
    ),
    (
      'public.interest_graph_log_emit_failure_v1(text,text,uuid,uuid,jsonb,text)',
      '0fc54bb8ca8e1d882bd612d1cd54943e2db1558871e602587e647a0addb96fae'
    ),
    (
      'public.interest_graph_card_event_visible_to_viewer_v1(uuid,uuid,uuid,text)',
      '8d0c0f6ae184e55abc8029516b243e2dc798fca89801c5d1a779939c5b23d61d'
    ),
    (
      'public.interest_graph_collector_public_v1(uuid)',
      '80f72c99ce399db0598defefef0ea901255b57ccf3c34fd119fdae549d3c64b2'
    ),
    (
      'public.pulse_jsonb_uuid_v1(text)',
      '7f374bc05d0b12dcc3d64c4eb6a1ee2f69ee1886b56ab0141c06b265ad145d59'
    )
),
required_roles(role_name) as (
  values ('anon'), ('authenticated'), ('authenticator'), ('service_role')
),
external_trigger_names(trigger_name) as (
  values
    ('trg_trust_blocks_binder_effect_v1'),
    ('trg_binder_vault_instance_update_v1'),
    ('trg_binder_vault_instance_delete_v1'),
    ('trg_binder_slab_identity_update_v1')
),
external_trigger_name_collisions as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'relation', n.nspname || '.' || c.relname,
        'trigger', t.tgname
      )
      order by n.nspname, c.relname, t.tgname
    ),
    '[]'::jsonb
  ) as value
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join external_trigger_names expected on expected.trigger_name = t.tgname
  where n.nspname = 'public'
    and not t.tgisinternal
),
schema_create_guard_roles(role_name) as (
  values ('anon'), ('authenticated'), ('authenticator')
),
schema_create_guard_schemas(schema_name) as (
  values ('public'), ('extensions')
),
unexpected_schema_create_privileges as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'role', expected_role.role_name,
        'schema', expected_schema.schema_name,
        'role_exists', role_row.oid is not null,
        'schema_exists', schema_row.oid is not null,
        'has_create', coalesce(
          has_schema_privilege(role_row.oid, schema_row.oid, 'CREATE'),
          false
        )
      )
      order by expected_role.role_name, expected_schema.schema_name
    ),
    '[]'::jsonb
  ) as value
  from schema_create_guard_roles expected_role
  cross join schema_create_guard_schemas expected_schema
  left join pg_roles role_row on role_row.rolname = expected_role.role_name
  left join pg_namespace schema_row
    on schema_row.nspname = expected_schema.schema_name
  where role_row.oid is null
    or schema_row.oid is null
    or has_schema_privilege(role_row.oid, schema_row.oid, 'CREATE')
),
unexpected_public_default_acl_grantees as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'default_owner', pg_get_userbyid(default_acl.defaclrole),
        'schema', coalesce(n.nspname, '*'),
        'object_type', default_acl.defaclobjtype,
        'grantor', grantor_role.rolname,
        'grantee', coalesce(grantee_role.rolname, 'PUBLIC'),
        'privilege', acl.privilege_type,
        'grantable', acl.is_grantable
      )
      order by
        pg_get_userbyid(default_acl.defaclrole),
        coalesce(n.nspname, '*'),
        default_acl.defaclobjtype,
        grantor_role.rolname,
        coalesce(grantee_role.rolname, 'PUBLIC'),
        acl.privilege_type,
        acl.is_grantable
    ),
    '[]'::jsonb
  ) as value
  from pg_default_acl default_acl
  left join pg_namespace n on n.oid = default_acl.defaclnamespace
  cross join lateral aclexplode(default_acl.defaclacl) acl
  left join pg_roles grantor_role on grantor_role.oid = acl.grantor
  left join pg_roles grantee_role on grantee_role.oid = acl.grantee
  where (
      default_acl.defaclnamespace = 0
      or n.nspname = 'public'
    )
    and coalesce(grantee_role.rolname, 'PUBLIC') not in (
      'postgres',
      'anon',
      'authenticated',
      'service_role'
    )
),
reviewed_public_default_acl_rows as (
  select
    pg_get_userbyid(default_acl.defaclrole) as default_owner,
    n.nspname as schema_name,
    default_acl.defaclobjtype as object_type,
    grantor_role.rolname as grantor_name,
    coalesce(grantee_role.rolname, 'PUBLIC') as grantee_name,
    acl.privilege_type,
    acl.is_grantable
  from pg_default_acl default_acl
  join pg_namespace n on n.oid = default_acl.defaclnamespace
  cross join lateral aclexplode(default_acl.defaclacl) acl
  left join pg_roles grantor_role on grantor_role.oid = acl.grantor
  left join pg_roles grantee_role on grantee_role.oid = acl.grantee
  where pg_get_userbyid(default_acl.defaclrole) = 'postgres'
    and n.nspname = 'public'
    and default_acl.defaclobjtype in ('r', 'f', 'S')
),
reviewed_public_default_acl_fingerprint as (
  select
    count(*)::integer as row_count,
    encode(
      extensions.digest(
        convert_to(
          string_agg(
            concat_ws(
              E'\x1f',
              default_owner,
              schema_name,
              object_type,
              grantor_name,
              grantee_name,
              privilege_type,
              is_grantable::text
            ),
            E'\x1e'
            order by
              default_owner,
              schema_name,
              object_type,
              grantor_name,
              grantee_name,
              privilege_type,
              is_grantable
          ),
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as sha256
  from reviewed_public_default_acl_rows
),
realtime_publication_config_row as (
  select
    publication.pubname,
    pg_get_userbyid(publication.pubowner) as owner_name,
    publication.puballtables,
    publication.pubinsert,
    publication.pubupdate,
    publication.pubdelete,
    publication.pubtruncate,
    publication.pubviaroot
  from pg_publication publication
  where publication.pubname = 'supabase_realtime'
),
realtime_publication_config_fingerprint as (
  select
    count(*)::integer as object_count,
    encode(
      extensions.digest(
        convert_to(
          string_agg(
            concat_ws(
              E'\x1f',
              pubname,
              owner_name,
              puballtables::text,
              pubinsert::text,
              pubupdate::text,
              pubdelete::text,
              pubtruncate::text,
              pubviaroot::text
            ),
            E'\x1e'
            order by pubname
          ),
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as sha256
  from realtime_publication_config_row
),
changed_external_function_targets(function_signature) as (
  values
    ('public.interest_graph_upsert_watch_v1(uuid,text,uuid,text,text)'),
    ('public.interest_graph_emit_event_v1(text,text,uuid,uuid,uuid,jsonb,text,text)'),
    ('public.interest_graph_log_emit_failure_v1(text,text,uuid,uuid,jsonb,text)'),
    ('public.pulse_eligible_events_for_viewer_v1(uuid)'),
    ('public.card_events_feed_v1(integer,timestamp with time zone,uuid)')
),
changed_external_functions as (
  select
    p.oid,
    p.proowner,
    p.proacl,
    format(
      '%I.%I(%s)',
      n.nspname,
      p.proname,
      replace(pg_get_function_identity_arguments(p.oid), 'public.', '')
    ) as signature,
    replace(pg_get_function_arguments(p.oid), 'public.', '') as function_arguments,
    replace(pg_get_function_result(p.oid), 'public.', '') as function_result,
    pg_get_userbyid(p.proowner) as function_owner,
    l.lanname,
    p.prokind,
    p.provolatile,
    p.prosecdef,
    p.proleakproof,
    p.proisstrict,
    p.proretset,
    p.proparallel,
    coalesce(array_to_string(p.proconfig, ','), '') as function_config,
    p.procost,
    p.prorows,
    encode(
      extensions.digest(convert_to(p.prosrc, 'UTF8'), 'sha256'),
      'hex'
    ) as body_sha256
  from changed_external_function_targets target
  join pg_proc p on p.oid = to_regprocedure(target.function_signature)
  join pg_namespace n on n.oid = p.pronamespace
  join pg_language l on l.oid = p.prolang
),
changed_external_function_fingerprint as (
  select
    count(*)::integer as object_count,
    encode(
      extensions.digest(
        convert_to(
          string_agg(
            concat_ws(
              E'\x1f',
              signature,
              function_arguments,
              function_result,
              function_owner,
              lanname,
              prokind,
              provolatile,
              prosecdef::text,
              proleakproof::text,
              proisstrict::text,
              proretset::text,
              proparallel,
              function_config,
              procost::text,
              prorows::text,
              body_sha256
            ),
            E'\x1e'
            order by signature
          ),
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as sha256
  from changed_external_functions
),
changed_external_function_acl_fingerprint as (
  select encode(
    extensions.digest(
      convert_to(
        string_agg(
          concat_ws(
            E'\x1f',
            changed.signature,
            grantor_role.rolname,
            coalesce(grantee_role.rolname, 'PUBLIC'),
            acl.privilege_type,
            acl.is_grantable::text
          ),
          E'\x1e'
          order by
            changed.signature,
            grantor_role.rolname,
            coalesce(grantee_role.rolname, 'PUBLIC'),
            acl.privilege_type,
            acl.is_grantable
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  ) as sha256
  from changed_external_functions changed
  cross join lateral aclexplode(
    coalesce(changed.proacl, acldefault('f', changed.proowner))
  ) acl
  left join pg_roles grantor_role on grantor_role.oid = acl.grantor
  left join pg_roles grantee_role on grantee_role.oid = acl.grantee
),
changed_external_policy_targets(relation_name, policy_name) as (
  values
    ('public.trust_reports', 'trust_reports_insert_reporter'),
    ('public.card_events', 'card_events_visibility_select'),
    ('public.card_events', 'card_events_actor_insert'),
    (
      'public.card_events_emit_failures',
      'card_events_emit_failures_owner_insert'
    )
),
changed_external_policy_rows as (
  select
    n.nspname as schema_name,
    c.relname as relation_name,
    p.polname as policy_name,
    p.polcmd,
    p.polpermissive,
    (
      select string_agg(
        coalesce(r.rolname, 'PUBLIC'),
        ','
        order by coalesce(r.rolname, 'PUBLIC')
      )
      from unnest(p.polroles) role_oid
      left join pg_roles r on r.oid = role_oid
    ) as role_names,
    replace(
      coalesce(pg_get_expr(p.polqual, p.polrelid, true), ''),
      'public.',
      ''
    ) as using_expression,
    replace(
      coalesce(pg_get_expr(p.polwithcheck, p.polrelid, true), ''),
      'public.',
      ''
    ) as check_expression
  from changed_external_policy_targets target
  join pg_class c on c.oid = to_regclass(target.relation_name)
  join pg_namespace n on n.oid = c.relnamespace
  join pg_policy p
    on p.polrelid = c.oid
   and p.polname = target.policy_name
),
changed_external_policy_fingerprint as (
  select
    count(*)::integer as object_count,
    encode(
      extensions.digest(
        convert_to(
          string_agg(
            concat_ws(
              E'\x1f',
              schema_name,
              relation_name,
              policy_name,
              polcmd,
              polpermissive::text,
              role_names,
              using_expression,
              check_expression
            ),
            E'\x1e'
            order by schema_name, relation_name, policy_name
          ),
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as sha256
  from changed_external_policy_rows
),
trust_surface_constraint_row as (
  select
    n.nspname as schema_name,
    c.relname as relation_name,
    constraint_row.conname as constraint_name,
    constraint_row.contype,
    constraint_row.condeferrable,
    constraint_row.condeferred,
    constraint_row.convalidated,
    constraint_row.conislocal,
    constraint_row.coninhcount,
    constraint_row.connoinherit,
    replace(
      pg_get_constraintdef(constraint_row.oid, true),
      'public.',
      ''
    ) as definition
  from pg_constraint constraint_row
  join pg_class c on c.oid = constraint_row.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where constraint_row.conrelid = 'public.trust_reports'::regclass
    and constraint_row.conname = 'trust_reports_surface_check'
),
trust_surface_constraint_fingerprint as (
  select
    count(*)::integer as object_count,
    encode(
      extensions.digest(
        convert_to(
          string_agg(
            concat_ws(
              E'\x1f',
              schema_name,
              relation_name,
              constraint_name,
              contype,
              condeferrable::text,
              condeferred::text,
              convalidated::text,
              conislocal::text,
              coninhcount::text,
              connoinherit::text,
              definition
            ),
            E'\x1e'
            order by schema_name, relation_name, constraint_name
          ),
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as sha256
  from trust_surface_constraint_row
),
changed_external_table_acl_fingerprint as (
  select encode(
    extensions.digest(
      convert_to(
        string_agg(
          concat_ws(
            E'\x1f',
            n.nspname || '.' || c.relname,
            grantor_role.rolname,
            coalesce(grantee_role.rolname, 'PUBLIC'),
            acl.privilege_type,
            acl.is_grantable::text
          ),
          E'\x1e'
          order by
            grantor_role.rolname,
            coalesce(grantee_role.rolname, 'PUBLIC'),
            acl.privilege_type,
            acl.is_grantable
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  ) as sha256
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join lateral aclexplode(
    coalesce(c.relacl, acldefault('r', c.relowner))
  ) acl
  left join pg_roles grantor_role on grantor_role.oid = acl.grantor
  left join pg_roles grantee_role on grantee_role.oid = acl.grantee
  where c.oid = 'public.card_events_emit_failures'::regclass
),
missing_relations as (
  select coalesce(jsonb_agg(relation_name order by relation_name), '[]'::jsonb) as value
  from required_relations rr
  where not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname || '.' || c.relname = rr.relation_name
      and c.relkind in ('r', 'p')
  )
),
missing_columns as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'relation', schema_name || '.' || table_name,
        'column', column_name,
        'type', data_type
      )
      order by schema_name, table_name, column_name
    ),
    '[]'::jsonb
  ) as value
  from required_columns required
  where not exists (
    select 1
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = required.schema_name
      and c.relname = required.table_name
      and c.relkind in ('r', 'p')
      and a.attname = required.column_name
      and a.attnum > 0
      and not a.attisdropped
      and format_type(a.atttypid, a.atttypmod) = required.data_type
  )
),
missing_functions as (
  select coalesce(jsonb_agg(function_signature order by function_signature), '[]'::jsonb) as value
  from required_functions
  where to_regprocedure(function_signature) is null
),
drifted_functions as (
  select coalesce(
    jsonb_agg(function_signature order by function_signature),
    '[]'::jsonb
  ) as value
  from required_function_bodies required
  where coalesce((
    select encode(
      extensions.digest(convert_to(p.prosrc, 'UTF8'), 'sha256'),
      'hex'
    )
    from pg_proc p
    where p.oid = to_regprocedure(required.function_signature)
  ), '') <> required.body_sha256
),
missing_roles as (
  select coalesce(jsonb_agg(role_name order by role_name), '[]'::jsonb) as value
  from required_roles
  where not exists (
    select 1 from pg_roles where rolname = role_name
  )
),
stable_target_relations(relation_oid) as (
  values
    ('public.trust_reports'::regclass),
    ('public.trust_blocks'::regclass),
    ('public.vault_item_instances'::regclass),
    ('public.slab_certs'::regclass),
    ('public.watches'::regclass),
    ('public.card_events'::regclass),
    ('public.card_events_emit_failures'::regclass)
),
stable_manifests(object_name, object_part, payload) as (
  select
    replace(t.relation_oid::text, 'public.', ''),
    'columns',
    string_agg(
      concat_ws(
        E'\x1f',
        a.attnum,
        a.attname,
        format_type(a.atttypid, a.atttypmod),
        a.attnotnull,
        a.attidentity,
        a.attgenerated,
        coalesce(
          replace(pg_get_expr(d.adbin, d.adrelid, true), 'public.', ''),
          ''
        )
      ),
      E'\x1e'
      order by a.attnum
    )
  from stable_target_relations t
  join pg_attribute a
    on a.attrelid = t.relation_oid
   and a.attnum > 0
   and not a.attisdropped
  left join pg_attrdef d
    on d.adrelid = a.attrelid
   and d.adnum = a.attnum
  group by t.relation_oid

  union all

  select
    replace(t.relation_oid::text, 'public.', ''),
    'stable_constraints',
    string_agg(
      concat_ws(
        E'\x1f',
        c.conname,
        c.contype,
        c.condeferrable,
        c.condeferred,
        replace(pg_get_constraintdef(c.oid, true), 'public.', '')
      ),
      E'\x1e'
      order by c.conname
    )
  from stable_target_relations t
  join pg_constraint c on c.conrelid = t.relation_oid
  where not (
    t.relation_oid = 'public.trust_reports'::regclass
    and c.conname = 'trust_reports_surface_check'
  )
  group by t.relation_oid

  union all

  select
    replace(t.relation_oid::text, 'public.', ''),
    'indexes',
    string_agg(
      concat_ws(
        E'\x1f',
        ci.relname,
        i.indisunique,
        i.indisprimary,
        i.indisvalid,
        replace(pg_get_indexdef(i.indexrelid), 'public.', '')
      ),
      E'\x1e'
      order by ci.relname
    )
  from stable_target_relations t
  join pg_index i on i.indrelid = t.relation_oid
  join pg_class ci on ci.oid = i.indexrelid
  group by t.relation_oid

  union all

  select
    replace(t.relation_oid::text, 'public.', ''),
    'stable_policies',
    coalesce(
      string_agg(
        concat_ws(
          E'\x1f',
          p.polname,
          p.polcmd,
          p.polpermissive,
          p.polroles::text,
          replace(coalesce(pg_get_expr(p.polqual, p.polrelid, true), ''), 'public.', ''),
          replace(coalesce(pg_get_expr(p.polwithcheck, p.polrelid, true), ''), 'public.', '')
        ),
        E'\x1e'
        order by p.polname
      ) filter (where p.oid is not null),
      ''
    )
  from stable_target_relations t
  left join pg_policy p
    on p.polrelid = t.relation_oid
   and p.polname not in (
     'trust_reports_insert_reporter',
     'card_events_visibility_select',
     'card_events_actor_insert',
     'card_events_emit_failures_owner_insert'
   )
  group by t.relation_oid

  union all

  select
    replace(t.relation_oid::text, 'public.', ''),
    'stable_triggers',
    coalesce(
      string_agg(
        concat_ws(
          E'\x1f',
          g.tgname,
          replace(pg_get_triggerdef(g.oid, true), 'public.', '')
        ),
        E'\x1e'
        order by g.tgname
      ) filter (where g.oid is not null),
      ''
    )
  from stable_target_relations t
  left join pg_trigger g
    on g.tgrelid = t.relation_oid
   and not g.tgisinternal
   and g.tgname not in (
     'trg_trust_blocks_binder_effect_v1',
     'trg_binder_vault_instance_update_v1',
     'trg_binder_vault_instance_delete_v1',
     'trg_binder_slab_identity_update_v1'
   )
  group by t.relation_oid

  union all

  select
    replace(t.relation_oid::text, 'public.', ''),
    'rls_replica',
    concat_ws(E'\x1f', c.relrowsecurity, c.relforcerowsecurity, c.relreplident)
  from stable_target_relations t
  join pg_class c on c.oid = t.relation_oid

  union all

  select
    replace(t.relation_oid::text, 'public.', ''),
    'stable_acl',
    coalesce(array_to_string(c.relacl, ','), '')
  from stable_target_relations t
  join pg_class c on c.oid = t.relation_oid
  where t.relation_oid <> 'public.card_events_emit_failures'::regclass
),
stable_functions(object_name, object_part, payload) as (
  select
    format(
      '%I.%I(%s)',
      n.nspname,
      p.proname,
      replace(pg_get_function_identity_arguments(p.oid), 'public.', '')
    ),
    'function_shape_body',
    concat_ws(
      E'\x1f',
      replace(pg_get_function_arguments(p.oid), 'public.', ''),
      replace(pg_get_function_result(p.oid), 'public.', ''),
      pg_get_userbyid(p.proowner),
      l.lanname,
      p.provolatile,
      p.prosecdef,
      p.proparallel,
      coalesce(array_to_string(p.proconfig, ','), ''),
      p.prosrc
    )
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_language l on l.oid = p.prolang
  where n.nspname = 'public'
    and p.proname in (
      'interest_graph_upsert_watch_v1',
      'interest_graph_emit_event_v1',
      'interest_graph_log_emit_failure_v1'
    )
),
stable_catalog_fingerprint as (
  select encode(
    extensions.digest(
      convert_to(
        string_agg(
          concat_ws(E'\x1f', object_name, object_part, payload),
          E'\x1e'
          order by object_name, object_part
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  ) as sha256
  from (
    select * from stable_manifests
    union all
    select * from stable_functions
  ) stable_rows
),
snapshot as (
  select
    current_user as execution_role,
    pg_catalog.current_setting('server_version_num')::integer
      as server_version_num,
    (
      pg_catalog.current_setting('server_version_num')::integer / 10000
    ) as server_major_version,
    17::integer as required_server_major_version,
    (
      pg_catalog.current_setting('server_version_num')::integer / 10000 = 17
    ) as server_major_version_ok,
    (
      select count(*)::integer
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and (
          c.relname = 'binders'
          or c.relname like 'binder\_%' escape '\'
        )
    ) as binder_relation_collision_count,
    (
      select count(*)::integer
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
        and (
          t.typname = 'binders'
          or t.typname like 'binder\_%' escape '\'
        )
    ) as binder_type_collision_count,
    (
      select count(*)::integer
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname like 'binder\_%' escape '\'
    ) as binder_function_count,
    (
      select value from external_trigger_name_collisions
    ) as external_trigger_name_collisions,
    (
      select value from unexpected_public_default_acl_grantees
    ) as unexpected_public_default_acl_grantees,
    (
      select value from unexpected_schema_create_privileges
    ) as unexpected_schema_create_privileges,
    (
      select row_count from reviewed_public_default_acl_fingerprint
    ) as reviewed_public_default_acl_row_count,
    (
      select sha256 from reviewed_public_default_acl_fingerprint
    ) as reviewed_public_default_acl_fingerprint_sha256,
    (
      select object_count from realtime_publication_config_fingerprint
    ) as realtime_publication_config_count,
    (
      select sha256 from realtime_publication_config_fingerprint
    ) as realtime_publication_config_fingerprint_sha256,
    (
      select object_count from changed_external_function_fingerprint
    ) as changed_external_function_count,
    (
      select sha256 from changed_external_function_fingerprint
    ) as changed_external_function_fingerprint_sha256,
    (
      select sha256 from changed_external_function_acl_fingerprint
    ) as changed_external_function_acl_fingerprint_sha256,
    (
      select object_count from changed_external_policy_fingerprint
    ) as changed_external_policy_count,
    (
      select sha256 from changed_external_policy_fingerprint
    ) as changed_external_policy_fingerprint_sha256,
    (
      select object_count from trust_surface_constraint_fingerprint
    ) as trust_surface_constraint_count,
    (
      select sha256 from trust_surface_constraint_fingerprint
    ) as trust_surface_constraint_fingerprint_sha256,
    (
      select sha256 from changed_external_table_acl_fingerprint
    ) as changed_external_table_acl_fingerprint_sha256,
    (
      select count(*)::integer
      from supabase_migrations.schema_migrations
      where version::text = any(array[
        '20260723100000',
        '20260723101000',
        '20260723102000',
        '20260723103000',
        '20260723104000'
      ])
    ) as applied_package_migration_count,
    (
      select max(version::text)
      from supabase_migrations.schema_migrations
    ) as migration_head,
    (
      select value from missing_relations
    ) as missing_relations,
    (
      select value from missing_columns
    ) as missing_columns,
    (
      select value from missing_functions
    ) as missing_functions,
    (
      select value from drifted_functions
    ) as drifted_functions,
    (
      select value from missing_roles
    ) as missing_roles,
    (
      select sha256 from stable_catalog_fingerprint
    ) as stable_catalog_fingerprint_sha256,
    exists (
      select 1
      from pg_publication
      where pubname = 'supabase_realtime'
    ) as realtime_publication_exists,
    exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and (
          tablename = 'binders'
          or tablename like 'binder\_%' escape '\'
        )
    ) as binder_realtime_object_exists,
    exists (
      select 1
      from public.card_events
      where event_type like 'binder\_%' escape '\'
    ) as binder_card_event_data_exists,
    exists (
      select 1
      from public.trust_reports
      where surface in (
        'binder',
        'binder_contribution',
        'binder_member',
        'binder_invitation'
      )
    ) as binder_trust_report_data_exists,
    to_regprocedure(
      'public.binder_pulse_base_eligible_events_for_viewer_v1(uuid)'
    ) is not null as wrapped_pulse_function_exists,
    coalesce((
      select encode(
        extensions.digest(convert_to(prosrc, 'UTF8'), 'sha256'),
        'hex'
      )
      from pg_proc
      where oid = to_regprocedure(
        'public.pulse_eligible_events_for_viewer_v1(uuid)'
      )
    ), '') as pulse_body_sha256,
    coalesce((
      select encode(
        extensions.digest(convert_to(prosrc, 'UTF8'), 'sha256'),
        'hex'
      )
      from pg_proc
      where oid = to_regprocedure(
        'public.card_events_feed_v1(integer,timestamp with time zone,uuid)'
      )
    ), '') as card_events_feed_body_sha256,
    coalesce((
      select pg_get_constraintdef(oid, true)
      from pg_constraint
      where conrelid = 'public.trust_reports'::regclass
        and conname = 'trust_reports_surface_check'
    ), '') as trust_surface_constraint,
    coalesce((
      select pg_get_expr(polwithcheck, polrelid, true)
      from pg_policy
      where polrelid = 'public.trust_reports'::regclass
        and polname = 'trust_reports_insert_reporter'
    ), '') as trust_insert_policy
    ,
    replace(coalesce((
      select pg_get_expr(polqual, polrelid, true)
      from pg_policy
      where polrelid = 'public.card_events'::regclass
        and polname = 'card_events_visibility_select'
    ), ''), 'public.', '') as card_events_select_policy,
    replace(coalesce((
      select pg_get_expr(polwithcheck, polrelid, true)
      from pg_policy
      where polrelid = 'public.card_events'::regclass
        and polname = 'card_events_actor_insert'
    ), ''), 'public.', '') as card_events_insert_policy,
    exists (
      select 1
      from pg_policy
      where polrelid = 'public.card_events_emit_failures'::regclass
        and polname = 'card_events_emit_failures_owner_insert'
    ) and has_table_privilege(
      'authenticated',
      'public.card_events_emit_failures',
      'INSERT'
    ) as card_event_failure_baseline_ok
)
select jsonb_build_object(
  'package_id', 'COLLABORATIVE-BINDERS-DB-V1',
  'phase', 'preflight',
  'read_only', true,
  'ok',
    execution_role = 'postgres'
    and server_major_version_ok
    and binder_relation_collision_count = 0
    and binder_type_collision_count = 0
    and binder_function_count = 0
    and external_trigger_name_collisions = '[]'::jsonb
    and unexpected_public_default_acl_grantees = '[]'::jsonb
    and unexpected_schema_create_privileges = '[]'::jsonb
    and reviewed_public_default_acl_row_count = 48
    and reviewed_public_default_acl_fingerprint_sha256 =
      '0ecd7a35a5a81388d2742067a282d5c73763bfa40853255b7aa1e3c9a4cea9df'
    and realtime_publication_config_count = 1
    and realtime_publication_config_fingerprint_sha256 =
      'c9e74db3d75a0cabc4ae97a90b0c45d637a3865c12498281398acceb01806191'
    and changed_external_function_count = 5
    and changed_external_function_fingerprint_sha256 =
      '1595bcfc837d711491826c8dd13b32a0ab862501a59bae77521d31b8ef944b4e'
    and changed_external_function_acl_fingerprint_sha256 =
      '10d37e82eb251c900a92356dd672d33f549c4b9a04563a2d479c8e9ac0cb5143'
    and changed_external_policy_count = 4
    and changed_external_policy_fingerprint_sha256 =
      'f8aad091d50312fff86405a5587d8a57b342396408d95a6356a78a550ce1feb0'
    and trust_surface_constraint_count = 1
    and trust_surface_constraint_fingerprint_sha256 =
      '2bf3095b9f4111f7ac2fb29a93b1cb82598a0711faf33653bb46ee433c617406'
    and changed_external_table_acl_fingerprint_sha256 =
      '86d9e3364f604500e50bd84da120f4c53e62840f824653b2cb9f9425b7c67e5f'
    and applied_package_migration_count = 0
    and migration_head = '20260715120000'
    and missing_relations = '[]'::jsonb
    and missing_columns = '[]'::jsonb
    and missing_functions = '[]'::jsonb
    and drifted_functions = '[]'::jsonb
    and missing_roles = '[]'::jsonb
    and stable_catalog_fingerprint_sha256 ~ '^[0-9a-f]{64}$'
    and realtime_publication_exists
    and not binder_realtime_object_exists
    and not binder_card_event_data_exists
    and not binder_trust_report_data_exists
    and not wrapped_pulse_function_exists
    and pulse_body_sha256 =
      '0d2508ab97d0d4a3be5e2fc21e3f610b8b2b6cd60b22ffdcde7c284fafa1aff2'
    and card_events_feed_body_sha256 =
      '71dfac930d7d2d8402c1c6e36699c49b39ed8588fb14e5798d94bd840de0f8a5'
    and trust_surface_constraint =
      'CHECK (surface = ANY (ARRAY[''profile''::text, ''message''::text, ''wall_card''::text, ''listing''::text, ''card''::text, ''gvvi''::text, ''other''::text]))'
    and trust_insert_policy =
      'auth.uid() = reporter_user_id AND (reported_user_id IS NULL OR auth.uid() <> reported_user_id)'
    and card_events_select_policy =
      'interest_graph_card_event_visible_to_viewer_v1(auth.uid(), actor_user_id, subject_user_id, visibility)'
    and card_events_insert_policy =
      'actor_user_id = auth.uid() AND jsonb_typeof(payload) = ''object''::text'
    and card_event_failure_baseline_ok,
  'checks', jsonb_build_object(
    'execution_role', execution_role,
    'server_version_num', server_version_num,
    'server_major_version', server_major_version,
    'required_server_major_version', required_server_major_version,
    'server_major_version_ok', server_major_version_ok,
    'binder_relation_collision_count', binder_relation_collision_count,
    'binder_type_collision_count', binder_type_collision_count,
    'binder_function_count', binder_function_count,
    'external_trigger_name_collisions', external_trigger_name_collisions,
    'unexpected_public_default_acl_grantees',
      unexpected_public_default_acl_grantees,
    'unexpected_schema_create_privileges',
      unexpected_schema_create_privileges,
    'reviewed_public_default_acl_row_count',
      reviewed_public_default_acl_row_count,
    'reviewed_public_default_acl_fingerprint_sha256',
      reviewed_public_default_acl_fingerprint_sha256,
    'realtime_publication_config_count',
      realtime_publication_config_count,
    'realtime_publication_config_fingerprint_sha256',
      realtime_publication_config_fingerprint_sha256,
    'changed_external_function_count', changed_external_function_count,
    'changed_external_function_fingerprint_sha256',
      changed_external_function_fingerprint_sha256,
    'changed_external_function_acl_fingerprint_sha256',
      changed_external_function_acl_fingerprint_sha256,
    'changed_external_policy_count', changed_external_policy_count,
    'changed_external_policy_fingerprint_sha256',
      changed_external_policy_fingerprint_sha256,
    'trust_surface_constraint_count', trust_surface_constraint_count,
    'trust_surface_constraint_fingerprint_sha256',
      trust_surface_constraint_fingerprint_sha256,
    'changed_external_table_acl_fingerprint_sha256',
      changed_external_table_acl_fingerprint_sha256,
    'applied_package_migration_count', applied_package_migration_count,
    'migration_head', migration_head,
    'missing_relations', missing_relations,
    'missing_columns', missing_columns,
    'missing_functions', missing_functions,
    'drifted_functions', drifted_functions,
    'missing_roles', missing_roles,
    'stable_catalog_fingerprint_sha256', stable_catalog_fingerprint_sha256,
    'realtime_publication_exists', realtime_publication_exists,
    'binder_realtime_object_exists', binder_realtime_object_exists,
    'binder_card_event_data_exists', binder_card_event_data_exists,
    'binder_trust_report_data_exists', binder_trust_report_data_exists,
    'wrapped_pulse_function_exists', wrapped_pulse_function_exists,
    'pulse_body_sha256', pulse_body_sha256,
    'card_events_feed_body_sha256', card_events_feed_body_sha256,
    'trust_surface_constraint', trust_surface_constraint,
    'trust_insert_policy', trust_insert_policy,
    'card_events_select_policy', card_events_select_policy,
    'card_events_insert_policy', card_events_insert_policy,
    'card_event_failure_baseline_ok', card_event_failure_baseline_ok
  )
) as rollout_readback
from snapshot
