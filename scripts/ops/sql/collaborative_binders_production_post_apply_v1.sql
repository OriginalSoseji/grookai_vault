with
binder_tables as (
  select
    c.oid,
    c.relname,
    c.relkind,
    c.relpersistence,
    c.relrowsecurity,
    c.relforcerowsecurity,
    c.relreplident,
    c.relowner,
    c.relacl
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and (
      c.relname = 'binders'
      or c.relname like 'binder\_%' escape '\'
    )
),
unexpected_binder_named_relations as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'relation', n.nspname || '.' || c.relname,
        'relkind', c.relkind
      )
      order by c.relname, c.relkind
    ),
    '[]'::jsonb
  ) as value
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and (
      c.relname = 'binders'
      or c.relname like 'binder\_%' escape '\'
    )
    and c.relkind not in ('r', 'p')
    and not (
      c.relkind = 'i'
      and exists (
        select 1
        from pg_index i
        join binder_tables bt on bt.oid = i.indrelid
        where i.indexrelid = c.oid
      )
    )
    and not (
      c.relkind = 'S'
      and c.relname = 'binder_rate_limit_events_id_seq'
    )
),
binder_identity_sequence as (
  select
    c.oid,
    c.relowner,
    c.relacl,
    format('%I.%I', n.nspname, c.relname) as sequence_name,
    c.relkind,
    c.relpersistence,
    pg_get_userbyid(c.relowner) as sequence_owner,
    format_type(s.seqtypid, -1) as sequence_type,
    s.seqstart,
    s.seqincrement,
    s.seqmin,
    s.seqmax,
    s.seqcache,
    s.seqcycle,
    d.deptype as ownership_dependency_type,
    format(
      '%I.%I',
      owner_namespace.nspname,
      owner_relation.relname
    ) as owned_by_relation,
    d.refobjsubid as owned_by_attnum,
    owner_column.attname as owned_by_column
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_sequence s on s.seqrelid = c.oid
  join pg_depend d
    on d.classid = 'pg_class'::regclass
   and d.objid = c.oid
   and d.objsubid = 0
   and d.refclassid = 'pg_class'::regclass
   and d.refobjsubid > 0
   and d.deptype in ('a', 'i')
  join pg_class owner_relation on owner_relation.oid = d.refobjid
  join pg_namespace owner_namespace
    on owner_namespace.oid = owner_relation.relnamespace
  join pg_attribute owner_column
    on owner_column.attrelid = d.refobjid
   and owner_column.attnum = d.refobjsubid
  where n.nspname = 'public'
    and c.relname = 'binder_rate_limit_events_id_seq'
),
binder_identity_sequence_shape_fingerprint as (
  select
    count(*)::integer as object_count,
    encode(
      extensions.digest(
        convert_to(
          string_agg(
            concat_ws(
              E'\x1f',
              sequence_name,
              relkind,
              relpersistence,
              sequence_owner,
              sequence_type,
              seqstart::text,
              seqincrement::text,
              seqmin::text,
              seqmax::text,
              seqcache::text,
              seqcycle::text,
              ownership_dependency_type,
              owned_by_relation,
              owned_by_attnum::text,
              owned_by_column
            ),
            E'\x1e'
            order by sequence_name
          ),
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as sha256
  from binder_identity_sequence
),
binder_identity_sequence_acl_fingerprint as (
  select
    count(*)::integer as acl_row_count,
    encode(
      extensions.digest(
        convert_to(
          string_agg(
            concat_ws(
              E'\x1f',
              sequence_row.sequence_name,
              grantor_role.rolname,
              coalesce(grantee_role.rolname, 'PUBLIC'),
              acl.privilege_type,
              acl.is_grantable::text
            ),
            E'\x1e'
            order by
              sequence_row.sequence_name,
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
  from binder_identity_sequence sequence_row
  cross join lateral aclexplode(
    coalesce(sequence_row.relacl, acldefault('s', sequence_row.relowner))
  ) acl
  left join pg_roles grantor_role on grantor_role.oid = acl.grantor
  left join pg_roles grantee_role on grantee_role.oid = acl.grantee
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
realtime_binder_projection_rows as (
  select
    publication_table.pubname,
    publication_table.schemaname,
    publication_table.tablename,
    coalesce(
      array_to_string(publication_table.attnames, E'\x1d'),
      ''
    ) as projected_columns,
    publication_table.rowfilter is null as row_filter_is_null,
    coalesce(publication_table.rowfilter, '') as row_filter
  from pg_publication_tables publication_table
  where publication_table.pubname = 'supabase_realtime'
    and publication_table.schemaname = 'public'
    and (
      publication_table.tablename = 'binders'
      or publication_table.tablename like 'binder\_%' escape '\'
    )
),
realtime_binder_projection_fingerprint as (
  select
    count(*)::integer as object_count,
    encode(
      extensions.digest(
        convert_to(
          string_agg(
            concat_ws(
              E'\x1f',
              pubname,
              schemaname,
              tablename,
              projected_columns,
              row_filter_is_null::text,
              row_filter
            ),
            E'\x1e'
            order by schemaname, tablename
          ),
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as sha256
  from realtime_binder_projection_rows
),
unexpected_binder_named_types as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'type', n.nspname || '.' || t.typname,
        'type_kind', t.typtype
      )
      order by t.typname, t.typtype
    ),
    '[]'::jsonb
  ) as value
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
    and (
      t.typname = 'binders'
      or t.typname like 'binder\_%' escape '\'
    )
    and not exists (
      select 1
      from binder_tables bt
      where bt.oid = t.typrelid
    )
),
binder_table_shape_rows(object_name, object_part, payload) as (
  select
    'public.' || bt.relname,
    'relation',
    concat_ws(
      E'\x1f',
      pg_get_userbyid(bt.relowner),
      bt.relkind,
      bt.relpersistence,
      bt.relrowsecurity::text,
      bt.relforcerowsecurity::text,
      bt.relreplident
    )
  from binder_tables bt

  union all

  select
    'public.' || bt.relname,
    'columns',
    string_agg(
      concat_ws(
        E'\x1f',
        a.attnum::text,
        a.attname,
        format_type(a.atttypid, a.atttypmod),
        a.attnotnull::text,
        a.attidentity,
        a.attgenerated,
        case
          when a.attcollation = 0 then ''
          else format(
            '%I.%I',
            collation_namespace.nspname,
            collation_row.collname
          )
        end,
        coalesce(
          replace(
            replace(
              pg_get_expr(default_row.adbin, default_row.adrelid, true),
              'public.',
              ''
            ),
            'extensions.',
            ''
          ),
          ''
        )
      ),
      E'\x1e'
      order by a.attnum
    )
  from binder_tables bt
  join pg_attribute a
    on a.attrelid = bt.oid
   and a.attnum > 0
   and not a.attisdropped
  left join pg_attrdef default_row
    on default_row.adrelid = a.attrelid
   and default_row.adnum = a.attnum
  left join pg_collation collation_row on collation_row.oid = a.attcollation
  left join pg_namespace collation_namespace
    on collation_namespace.oid = collation_row.collnamespace
  group by bt.relname

  union all

  select
    'public.' || bt.relname,
    'constraints',
    string_agg(
      concat_ws(
        E'\x1f',
        constraint_row.conname,
        constraint_row.contype,
        constraint_row.condeferrable::text,
        constraint_row.condeferred::text,
        constraint_row.convalidated::text,
        constraint_row.conislocal::text,
        constraint_row.coninhcount::text,
        constraint_row.connoinherit::text,
        replace(
          pg_get_constraintdef(constraint_row.oid, true),
          'public.',
          ''
        )
      ),
      E'\x1e'
      order by constraint_row.conname
    )
  from binder_tables bt
  join pg_constraint constraint_row on constraint_row.conrelid = bt.oid
  group by bt.relname
),
binder_table_shape_fingerprint as (
  select
    count(*)::integer as manifest_row_count,
    encode(
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
  from binder_table_shape_rows
),
binder_functions as (
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
    p.prosrc
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_language l on l.oid = p.prolang
  where n.nspname = 'public'
    and p.proname like 'binder\_%' escape '\'
),
function_fingerprint as (
  select
    count(*)::integer as function_count,
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
              provolatile::text,
              prosecdef::text,
              proleakproof::text,
              proisstrict::text,
              proretset::text,
              proparallel,
              function_config,
              procost::text,
              prorows::text,
              prosrc
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
  from binder_functions
),
function_acl_fingerprint as (
  select encode(
    extensions.digest(
      convert_to(
        string_agg(
          concat_ws(
            E'\x1f',
            bf.signature,
            grantor_role.rolname,
            coalesce(grantee_role.rolname, 'PUBLIC'),
            acl.privilege_type,
            acl.is_grantable::text
          ),
          E'\x1e'
          order by
            bf.signature,
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
  from binder_functions bf
  cross join lateral aclexplode(
    coalesce(bf.proacl, acldefault('f', bf.proowner))
  ) acl
  left join pg_roles grantor_role on grantor_role.oid = acl.grantor
  left join pg_roles grantee_role on grantee_role.oid = acl.grantee
),
changed_external_function_targets(function_signature) as (
  values
    ('public.interest_graph_upsert_watch_v1(uuid,text,uuid,text,text)'),
    ('public.interest_graph_emit_event_v1(text,text,uuid,uuid,uuid,jsonb,text,text)'),
    ('public.interest_graph_log_emit_failure_v1(text,text,uuid,uuid,jsonb,text)'),
    ('public.binder_pulse_base_eligible_events_for_viewer_v1(uuid)'),
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
index_fingerprint as (
  select encode(
    extensions.digest(
      convert_to(
        string_agg(
          concat_ws(
            E'\x1f',
            bt.relname,
            ci.relname,
            i.indisunique::text,
            i.indisprimary::text,
            i.indisvalid::text,
            i.indisready::text,
            replace(pg_get_indexdef(i.indexrelid), 'public.', '')
          ),
          E'\x1e'
          order by bt.relname, ci.relname
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  ) as sha256
  from pg_index i
  join binder_tables bt on bt.oid = i.indrelid
  join pg_class ci on ci.oid = i.indexrelid
),
binder_policy_rows as (
  select
    bt.relname,
    p.polname,
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
  from pg_policy p
  join binder_tables bt on bt.oid = p.polrelid
),
policy_fingerprint as (
  select encode(
    extensions.digest(
      convert_to(
        string_agg(
          concat_ws(
            E'\x1f',
            relname,
            polname,
            polcmd,
            polpermissive::text,
            role_names,
            using_expression,
            check_expression
          ),
          E'\x1e'
          order by relname, polname
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  ) as sha256
  from binder_policy_rows
),
changed_external_policy_targets(relation_name, policy_name) as (
  values
    ('public.trust_reports', 'trust_reports_insert_reporter'),
    ('public.card_events', 'card_events_visibility_select'),
    ('public.card_events', 'card_events_actor_insert')
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
introduced_trigger_rows as (
  select
    c.relname,
    t.tgname,
    t.tgenabled,
    fn.proname as function_name,
    replace(pg_get_triggerdef(t.oid, true), 'public.', '') as definition
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc fn on fn.oid = t.tgfoid
  where n.nspname = 'public'
    and not t.tgisinternal
    and (
      exists (
        select 1
        from binder_tables bt
        where bt.oid = t.tgrelid
      )
      or t.tgname in (
        'trg_trust_blocks_binder_effect_v1',
        'trg_binder_vault_instance_update_v1',
        'trg_binder_vault_instance_delete_v1',
        'trg_binder_slab_identity_update_v1'
      )
    )
),
trigger_fingerprint as (
  select encode(
    extensions.digest(
      convert_to(
        string_agg(
          concat_ws(
            E'\x1f',
            relname,
            tgname,
            tgenabled,
            function_name,
            definition
          ),
          E'\x1e'
          order by relname, tgname
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  ) as sha256
  from introduced_trigger_rows
),
table_acl_fingerprint as (
  select encode(
    extensions.digest(
      convert_to(
        string_agg(
          concat_ws(
            E'\x1f',
            bt.relname,
            grantor_role.rolname,
            coalesce(grantee_role.rolname, 'PUBLIC'),
            acl.privilege_type,
            acl.is_grantable::text
          ),
          E'\x1e'
          order by
            bt.relname,
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
  from binder_tables bt
  cross join lateral aclexplode(
    coalesce(bt.relacl, acldefault('r', bt.relowner))
  ) acl
  left join pg_roles grantor_role on grantor_role.oid = acl.grantor
  left join pg_roles grantee_role on grantee_role.oid = acl.grantee
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
canonical_flags(flag_key) as (
  values
    ('community'),
    ('custom'),
    ('notifications'),
    ('personal'),
    ('public'),
    ('pulse_milestones'),
    ('schema_internal'),
    ('set_binders'),
    ('shared'),
    ('templates'),
    ('view_links')
),
flag_snapshot as (
  select
    count(f.flag_key)::integer as flag_count,
    count(f.flag_key) filter (where f.enabled)::integer as enabled_flag_count,
    coalesce(
      jsonb_agg(f.flag_key order by f.flag_key) filter (where f.enabled),
      '[]'::jsonb
    ) as enabled_flags,
    coalesce(
      jsonb_agg(c.flag_key order by c.flag_key)
        filter (where f.flag_key is null),
      '[]'::jsonb
    ) as missing_flags,
    coalesce((
      select jsonb_agg(x.flag_key order by x.flag_key)
      from public.binder_feature_flags x
      where not exists (
        select 1
        from canonical_flags expected
        where expected.flag_key = x.flag_key
      )
    ), '[]'::jsonb) as unexpected_flags
  from canonical_flags c
  left join public.binder_feature_flags f using (flag_key)
),
raw_privileges as (
  select
    bt.relname,
    r.rolname,
    p.privilege_name
  from binder_tables bt
  cross join (
    select oid, rolname
    from pg_roles
    where rolname in ('anon', 'authenticated')
  ) r
  cross join (
    values
      ('SELECT'),
      ('INSERT'),
      ('UPDATE'),
      ('DELETE'),
      ('TRUNCATE'),
      ('REFERENCES'),
      ('TRIGGER'),
      ('MAINTAIN')
  ) p(privilege_name)
  where has_table_privilege(
    r.oid,
    bt.oid,
    p.privilege_name
  )
),
unexpected_raw_privileges as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'table', relname,
        'role', rolname,
        'privilege', privilege_name
      )
      order by relname, rolname, privilege_name
    ),
    '[]'::jsonb
  ) as value
  from raw_privileges
  where not (
    relname = 'binder_refresh_signals'
    and rolname = 'authenticated'
    and privilege_name = 'SELECT'
  )
),
domain_counts(table_name, row_count) as (
  select 'binders', count(*) from public.binders
  union all select 'binder_members', count(*) from public.binder_members
  union all select 'binder_progress_state', count(*) from public.binder_progress_state
  union all select 'binder_custom_revisions', count(*) from public.binder_custom_revisions
  union all select 'binder_custom_slots', count(*) from public.binder_custom_slots
  union all select 'binder_invitations', count(*) from public.binder_invitations
  union all select 'binder_view_links', count(*) from public.binder_view_links
  union all select 'binder_join_requests', count(*) from public.binder_join_requests
  union all select 'binder_owner_transfer_offers', count(*) from public.binder_owner_transfer_offers
  union all select 'binder_contributions', count(*) from public.binder_contributions
  union all select 'binder_activity_events', count(*) from public.binder_activity_events
  union all select 'binder_progress_crossings', count(*) from public.binder_progress_crossings
  union all select 'binder_legacy_watch_decisions', count(*) from public.binder_legacy_watch_decisions
  union all select 'binder_templates', count(*) from public.binder_templates
  union all select 'binder_template_versions', count(*) from public.binder_template_versions
  union all select 'binder_template_adoptions', count(*) from public.binder_template_adoptions
  union all select 'binder_idempotency_keys', count(*) from public.binder_idempotency_keys
  union all select 'binder_rate_limit_events', count(*) from public.binder_rate_limit_events
  union all select 'binder_template_version_reviews', count(*) from public.binder_template_version_reviews
  union all select 'binder_refresh_signals', count(*) from public.binder_refresh_signals
),
nonempty_domain_tables as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object('table', table_name, 'rows', row_count)
      order by table_name
    ),
    '[]'::jsonb
  ) as value
  from domain_counts
  where row_count <> 0
),
external_snapshot as (
  select
    (
      select coalesce(
        jsonb_agg(
          c.relname || '.' || t.tgname
          order by c.relname, t.tgname
        ),
        '[]'::jsonb
      )
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and not t.tgisinternal
        and t.tgname in (
          'trg_trust_blocks_binder_effect_v1',
          'trg_binder_vault_instance_update_v1',
          'trg_binder_vault_instance_delete_v1',
          'trg_binder_slab_identity_update_v1'
        )
    ) as external_trigger_map,
    coalesce((
      select encode(
        extensions.digest(convert_to(prosrc, 'UTF8'), 'sha256'),
        'hex'
      )
      from pg_proc
      where oid = to_regprocedure(
        'public.binder_pulse_base_eligible_events_for_viewer_v1(uuid)'
      )
    ), '') as pulse_base_body_sha256,
    coalesce((
      select encode(
        extensions.digest(convert_to(prosrc, 'UTF8'), 'sha256'),
        'hex'
      )
      from pg_proc
      where oid = to_regprocedure(
        'public.pulse_eligible_events_for_viewer_v1(uuid)'
      )
    ), '') as pulse_wrapper_body_sha256,
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
    ), '') as trust_insert_policy,
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
    not exists (
      select 1
      from pg_policy
      where polrelid = 'public.card_events_emit_failures'::regclass
        and polname = 'card_events_emit_failures_owner_insert'
    ) and not has_table_privilege(
      'authenticated',
      'public.card_events_emit_failures',
      'INSERT'
    ) as card_event_failure_hardening_ok,
    (
      select bool_and(
        has_function_privilege('service_role', signature, 'EXECUTE')
        and not has_function_privilege('public', signature, 'EXECUTE')
        and not has_function_privilege('anon', signature, 'EXECUTE')
        and not has_function_privilege('authenticated', signature, 'EXECUTE')
      )
      from (
        values
          ('public.interest_graph_upsert_watch_v1(uuid,text,uuid,text,text)'::regprocedure),
          ('public.interest_graph_emit_event_v1(text,text,uuid,uuid,uuid,jsonb,text,text)'::regprocedure),
          ('public.interest_graph_log_emit_failure_v1(text,text,uuid,uuid,jsonb,text)'::regprocedure),
          ('public.binder_pulse_base_eligible_events_for_viewer_v1(uuid)'::regprocedure),
          ('public.pulse_eligible_events_for_viewer_v1(uuid)'::regprocedure)
      ) hardened(signature)
    ) as hardened_function_grants_ok,
    (
      has_function_privilege(
        'authenticated',
        'public.card_events_feed_v1(integer,timestamp with time zone,uuid)',
        'EXECUTE'
      )
      and has_function_privilege(
        'service_role',
        'public.card_events_feed_v1(integer,timestamp with time zone,uuid)',
        'EXECUTE'
      )
      and not has_function_privilege(
        'public',
        'public.card_events_feed_v1(integer,timestamp with time zone,uuid)',
        'EXECUTE'
      )
      and not has_function_privilege(
        'anon',
        'public.card_events_feed_v1(integer,timestamp with time zone,uuid)',
        'EXECUTE'
      )
    ) as card_events_feed_grants_ok
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
    (select count(*)::integer from binder_tables) as binder_table_count,
    (
      select value from unexpected_binder_named_relations
    ) as unexpected_binder_named_relations,
    (
      select value from unexpected_binder_named_types
    ) as unexpected_binder_named_types,
    (
      select manifest_row_count from binder_table_shape_fingerprint
    ) as binder_table_shape_manifest_row_count,
    (
      select sha256 from binder_table_shape_fingerprint
    ) as binder_table_shape_fingerprint_sha256,
    (
      select object_count from binder_identity_sequence_shape_fingerprint
    ) as binder_identity_sequence_count,
    (
      select sha256 from binder_identity_sequence_shape_fingerprint
    ) as binder_identity_sequence_shape_fingerprint_sha256,
    (
      select acl_row_count from binder_identity_sequence_acl_fingerprint
    ) as binder_identity_sequence_acl_row_count,
    (
      select sha256 from binder_identity_sequence_acl_fingerprint
    ) as binder_identity_sequence_acl_fingerprint_sha256,
    (
      select value from unexpected_schema_create_privileges
    ) as unexpected_schema_create_privileges,
    (
      select object_count from realtime_publication_config_fingerprint
    ) as realtime_publication_config_count,
    (
      select sha256 from realtime_publication_config_fingerprint
    ) as realtime_publication_config_fingerprint_sha256,
    (
      select object_count from realtime_binder_projection_fingerprint
    ) as realtime_binder_projection_count,
    (
      select sha256 from realtime_binder_projection_fingerprint
    ) as realtime_binder_projection_fingerprint_sha256,
    (select function_count from function_fingerprint) as binder_function_count,
    (select sha256 from function_fingerprint) as binder_function_fingerprint_sha256,
    (select sha256 from function_acl_fingerprint) as binder_function_acl_fingerprint_sha256,
    (
      select object_count from changed_external_function_fingerprint
    ) as changed_external_function_count,
    (
      select sha256 from changed_external_function_fingerprint
    ) as changed_external_function_fingerprint_sha256,
    (
      select sha256 from changed_external_function_acl_fingerprint
    ) as changed_external_function_acl_fingerprint_sha256,
    (select sha256 from index_fingerprint) as binder_index_fingerprint_sha256,
    (select sha256 from policy_fingerprint) as binder_policy_fingerprint_sha256,
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
    (select sha256 from trigger_fingerprint) as binder_trigger_fingerprint_sha256,
    (select sha256 from table_acl_fingerprint) as binder_table_acl_fingerprint_sha256,
    (
      select sha256 from changed_external_table_acl_fingerprint
    ) as changed_external_table_acl_fingerprint_sha256,
    (select sha256 from stable_catalog_fingerprint) as stable_catalog_fingerprint_sha256,
    (
      select count(*)::integer
      from pg_index i
      join binder_tables bt on bt.oid = i.indrelid
    ) as binder_index_count,
    (
      select count(*)::integer
      from binder_tables
      where relrowsecurity
    ) as binder_rls_table_count,
    (
      select count(*)::integer
      from pg_policy p
      join binder_tables bt on bt.oid = p.polrelid
    ) as binder_policy_count,
    (
      select count(*)::integer
      from introduced_trigger_rows
    ) as binder_trigger_count,
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
      select count(*)::integer
      from binder_functions
      where function_config = 'search_path=public'
    ) as search_path_public_count,
    (
      select count(*)::integer
      from binder_functions
      where function_config = 'search_path=pg_catalog'
    ) as search_path_pg_catalog_count,
    (
      select count(*)::integer
      from binder_functions
      where function_config = 'search_path=public, extensions, pg_catalog'
    ) as search_path_public_extensions_count,
    (
      select count(*)::integer
      from binder_functions
      where has_function_privilege('public', oid, 'EXECUTE')
    ) as public_execute_functions,
    (
      select count(*)::integer
      from binder_functions
      where has_function_privilege('anon', oid, 'EXECUTE')
    ) as anonymous_execute_functions,
    (
      select count(*)::integer
      from binder_functions
      where has_function_privilege('authenticated', oid, 'EXECUTE')
    ) as authenticated_execute_functions,
    (
      select count(*)::integer
      from binder_functions
      where has_function_privilege('service_role', oid, 'EXECUTE')
    ) as service_execute_functions,
    (
      select coalesce(jsonb_agg(tablename order by tablename), '[]'::jsonb)
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and (
          tablename = 'binders'
          or tablename like 'binder\_%' escape '\'
        )
    ) as realtime_tables,
    (
      select relreplident = 'f' and relrowsecurity
      from binder_tables
      where relname = 'binder_refresh_signals'
    ) as refresh_signal_replica_rls_ok,
    (
      select value from unexpected_raw_privileges
    ) as unexpected_raw_privileges,
    (
      select value from nonempty_domain_tables
    ) as nonempty_domain_tables,
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
    fs.*,
    es.*
  from flag_snapshot fs
  cross join external_snapshot es
)
select jsonb_build_object(
  'package_id', 'COLLABORATIVE-BINDERS-DB-V1',
  'phase', 'post_apply',
  'read_only', true,
  'ok',
    execution_role = 'postgres'
    and server_major_version_ok
    and binder_table_count = 21
    and unexpected_binder_named_relations = '[]'::jsonb
    and unexpected_binder_named_types = '[]'::jsonb
    and binder_table_shape_manifest_row_count = 63
    and binder_table_shape_fingerprint_sha256 =
      '18fb01a0c964976097a93b10204b453fa1d4ce7501086e2693c4aabd5b79689d'
    and binder_identity_sequence_count = 1
    and binder_identity_sequence_shape_fingerprint_sha256 =
      '34634ae035a071553b71be8cf48ca10bf372a6cb95fcaa32d8be2eb811f22575'
    and binder_identity_sequence_acl_row_count = 6
    and binder_identity_sequence_acl_fingerprint_sha256 =
      '4880f9e8d10d0e915f42dcff6c715ab879c67e4b816ae4ccc2efdaf4659c4fb4'
    and unexpected_schema_create_privileges = '[]'::jsonb
    and realtime_publication_config_count = 1
    and realtime_publication_config_fingerprint_sha256 =
      'c9e74db3d75a0cabc4ae97a90b0c45d637a3865c12498281398acceb01806191'
    and realtime_binder_projection_count = 1
    and realtime_binder_projection_fingerprint_sha256 =
      '6a167a0721fd3cb2cf3351cea31e2efa59836cd7d2356219887b181d4a43db6e'
    and binder_function_count = 124
    and binder_function_fingerprint_sha256 =
      '8b1f40cc62faa6e1c8e775c891a310088f8ac48d5d95ae68775224f1e26d9ca2'
    and binder_function_acl_fingerprint_sha256 =
      'f95c392f2d801c1b7cb429268edc21f8b4762f2d0826e640b884bb8669843909'
    and changed_external_function_count = 6
    and changed_external_function_fingerprint_sha256 =
      'd79196cc1d693d0bbf3c220ccd350631819a53ccd3f54a7d05ac65232caf1e3f'
    and changed_external_function_acl_fingerprint_sha256 =
      'f65fafd844efadce756ad512ee44c0d694e249d2094def482c52465d1f7410fb'
    and binder_index_count = 65
    and binder_index_fingerprint_sha256 =
      'ad46c7612efd3306a15a8a107181abfbaa0d14ca3d1ae426e452c2baef9fc4eb'
    and binder_rls_table_count = 21
    and binder_policy_count = 22
    and binder_policy_fingerprint_sha256 =
      '907c14c26a363413cabbd44976b0f3c9e3d256ebb5a292fef028911a59e964a8'
    and changed_external_policy_count = 3
    and changed_external_policy_fingerprint_sha256 =
      '0bccdf04c5f21670cee2784aacfea713574fd95fd97e1753d926e3578ebc52a7'
    and trust_surface_constraint_count = 1
    and trust_surface_constraint_fingerprint_sha256 =
      '334fa2f5d7e70d733e40dafa4047ae00cd320541219a9fa50b26a4be9d3382d0'
    and binder_trigger_count = 22
    and binder_trigger_fingerprint_sha256 =
      'fe8061de9bf08d967d76dfdda3da8b5d62def879a9a997f8fff0e88d632e9622'
    and binder_table_acl_fingerprint_sha256 =
      '678d70ecc32c7e21c271ae25e8b207a6f9c9f7f56dbe901fdcad1f2e94c3a69d'
    and changed_external_table_acl_fingerprint_sha256 =
      '9dc7a29f8573d287af260265a90b7c86711ee4d78b30aa0c071d1bd23509ad29'
    and stable_catalog_fingerprint_sha256 ~ '^[0-9a-f]{64}$'
    and applied_package_migration_count = 5
    and search_path_public_count = 117
    and search_path_pg_catalog_count = 5
    and search_path_public_extensions_count = 2
    and public_execute_functions = 0
    and anonymous_execute_functions = 8
    and authenticated_execute_functions = 64
    and service_execute_functions = 124
    and flag_count = 11
    and enabled_flag_count = 0
    and missing_flags = '[]'::jsonb
    and unexpected_flags = '[]'::jsonb
    and realtime_tables = '["binder_refresh_signals"]'::jsonb
    and refresh_signal_replica_rls_ok
    and unexpected_raw_privileges = '[]'::jsonb
    and nonempty_domain_tables = '[]'::jsonb
    and not binder_card_event_data_exists
    and not binder_trust_report_data_exists
    and external_trigger_map = '[
      "slab_certs.trg_binder_slab_identity_update_v1",
      "trust_blocks.trg_trust_blocks_binder_effect_v1",
      "vault_item_instances.trg_binder_vault_instance_delete_v1",
      "vault_item_instances.trg_binder_vault_instance_update_v1"
    ]'::jsonb
    and pulse_base_body_sha256 =
      '0d2508ab97d0d4a3be5e2fc21e3f610b8b2b6cd60b22ffdcde7c284fafa1aff2'
    and pulse_wrapper_body_sha256 =
      '2453b36246cd0bfc7c03adb2487d96fd82392b33f4673b0b7cc539b72cd53454'
    and card_events_feed_body_sha256 =
      'e5c297e16af3998555e2003bc246b0f08294a9df4e9038330e0ad8e43217690c'
    and trust_surface_constraint =
      'CHECK (surface = ANY (ARRAY[''profile''::text, ''message''::text, ''wall_card''::text, ''listing''::text, ''card''::text, ''gvvi''::text, ''other''::text, ''binder''::text, ''binder_contribution''::text, ''binder_member''::text, ''binder_invitation''::text]))'
    and trust_insert_policy =
      'auth.uid() = reporter_user_id AND (reported_user_id IS NULL OR auth.uid() <> reported_user_id) AND (surface <> ALL (ARRAY[''binder''::text, ''binder_contribution''::text, ''binder_member''::text, ''binder_invitation''::text]))'
    and card_events_select_policy =
      'binder_card_event_visible_to_viewer_v1(auth.uid(), event_type, card_print_id, actor_user_id, subject_user_id, visibility, payload, dedupe_key)'
    and card_events_insert_policy =
      'actor_user_id = auth.uid() AND jsonb_typeof(payload) = ''object''::text AND "left"(lower(btrim(event_type)), 7) <> ''binder_''::text'
    and card_event_failure_hardening_ok
    and hardened_function_grants_ok
    and card_events_feed_grants_ok,
  'checks', to_jsonb(snapshot)
) as rollout_readback
from snapshot
