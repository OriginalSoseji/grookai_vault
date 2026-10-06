select jsonb_build_object('server_version',current_setting('server_version'),'read_only',current_setting('transaction_read_only'),
'sanity',jsonb_build_object('cards',(select count(*) from public.card_prints),'sets',(select count(*) from public.sets),'traits',(select count(*) from public.card_print_traits)),
'ALL_RELATIONS_QUERY',(select coalesce(jsonb_agg(snapshot_row),'[]'::jsonb) from (with extension_oids as (
  select
      objid
  from
      pg_depend d
  WHERE
      d.refclassid = 'pg_extension'::regclass and
      d.classid = 'pg_class'::regclass
), enums as (

  SELECT
    t.oid as enum_oid,
    n.nspname as "schema",
    t.typname as name
  FROM pg_catalog.pg_type t
       LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
       left outer join extension_oids e
         on t.oid = e.objid
  WHERE
    t.typcategory = 'E'
    and e.objid is null
     and n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
     and n.nspname not like 'pg_temp_%' and n.nspname not like 'pg_toast_temp_%'
  ORDER BY 1, 2
),
r as (
    select
        c.relname as name,
        n.nspname as schema,
        c.relkind as relationtype,
        c.oid as oid,
        case when c.relkind in ('m', 'v') then
          pg_get_viewdef(c.oid)
        else null end
          as definition,
        (SELECT
              '"' || nmsp_parent.nspname || '"."' || parent.relname || '"' as parent
          FROM pg_inherits
              JOIN pg_class parent            ON pg_inherits.inhparent = parent.oid
              JOIN pg_class child             ON pg_inherits.inhrelid   = child.oid
              JOIN pg_namespace nmsp_parent   ON nmsp_parent.oid  = parent.relnamespace
              JOIN pg_namespace nmsp_child    ON nmsp_child.oid   = child.relnamespace
          where child.oid = c.oid)
        as parent_table,
        case when c.relpartbound is not null then
          pg_get_expr(c.relpartbound, c.oid, true)
        when c.relhassubclass is not null then
          pg_catalog.pg_get_partkeydef(c.oid)
        end
        as partition_def,
        c.relrowsecurity::boolean as rowsecurity,
        c.relforcerowsecurity::boolean as forcerowsecurity,
        c.relpersistence as persistence,
        c.relpages as page_size_estimate,
        c.reltuples as row_count_estimate
    from
        pg_catalog.pg_class c
        inner join pg_catalog.pg_namespace n
          ON n.oid = c.relnamespace
        left outer join extension_oids e
          on c.oid = e.objid
    where c.relkind in ('r', 'v', 'm', 'c', 'p')
     and e.objid is null
     and n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
     and n.nspname not like 'pg_temp_%' and n.nspname not like 'pg_toast_temp_%'
)
select
    r.relationtype,
    r.schema,
    r.name,
    r.definition as definition,
    a.attnum as position_number,
    a.attname as attname,
    a.attnotnull as not_null,
    a.atttypid::regtype AS datatype,
    a.attidentity != '' as is_identity,
    a.attidentity = 'a' as is_identity_always,
    -- PRE_12 false as is_generated,
     a.attgenerated != '' as is_generated,
    (SELECT c.collname FROM pg_catalog.pg_collation c, pg_catalog.pg_type t
     WHERE c.oid = a.attcollation AND t.oid = a.atttypid AND a.attcollation <> t.typcollation) AS collation,
    pg_get_expr(ad.adbin, ad.adrelid) as defaultdef,
    r.oid as oid,
    format_type(atttypid, atttypmod) AS datatypestring,
    e.enum_oid is not null as is_enum,
    e.name as enum_name,
    e.schema as enum_schema,
    pg_catalog.obj_description(r.oid) as comment,
    r.parent_table,
    r.partition_def,
    r.rowsecurity,
    r.forcerowsecurity,
    r.persistence,
    r.page_size_estimate,
    r.row_count_estimate
FROM
    r
    left join pg_catalog.pg_attribute a
        on r.oid = a.attrelid and a.attnum > 0
    left join pg_catalog.pg_attrdef ad
        on a.attrelid = ad.adrelid
        and a.attnum = ad.adnum
    left join enums e
      on a.atttypid = e.enum_oid
where a.attisdropped is not true
 and r.schema not in ('pg_catalog', 'information_schema', 'pg_toast')
 and r.schema not like 'pg_temp_%' and r.schema not like 'pg_toast_temp_%'
order by relationtype, r.schema, r.name, position_number) snapshot_row),
'COLLATIONS_QUERY',(select coalesce(jsonb_agg(snapshot_row),'[]'::jsonb) from (select
  collname as name,
  n.nspname as schema,
  case collprovider
    when 'd' then 'database default'
    when 'i' then 'icu'
    when 'c' then 'libc'
  end
  as provider,
  collencoding as encoding,
  collcollate as lc_collate,
  collctype as lc_ctype,
  collversion as version
from
pg_collation c
INNER JOIN pg_namespace n
    ON n.oid=c.collnamespace
     where nspname not in ('pg_internal', 'pg_catalog', 'information_schema', 'pg_toast')
     and nspname not like 'pg_temp_%' and nspname not like 'pg_toast_temp_%'
order by 2, 1) snapshot_row),
'RLSPOLICIES_QUERY',(select coalesce(jsonb_agg(snapshot_row),'[]'::jsonb) from (select
  p.polname as name,
  n.nspname as schema,
  c.relname as table_name,
  p.polcmd as commandtype,
  p.polpermissive as permissive,
  (
    select
      array_agg(
        case when o = 0 THEN
        'public'
        else
        pg_get_userbyid(o)::text
        end
      )
    from
    unnest(p.polroles) as unn(o)
  )
  as roles,
  p.polqual as qualtree,
  pg_get_expr(p.polqual, p.polrelid) as qual,
  pg_get_expr(p.polwithcheck, p.polrelid) as withcheck
from
  pg_policy p
  join pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
order by
  2, 1) snapshot_row),
'INDEXES_QUERY',(select coalesce(jsonb_agg(snapshot_row),'[]'::jsonb) from (with extension_oids as (
  select
      objid,
      classid::regclass::text as classid
  from
      pg_depend d
  WHERE
      d.refclassid = 'pg_extension'::regclass and
      d.classid = 'pg_index'::regclass
),
extension_relations as (
  select
      objid
  from
      pg_depend d
  WHERE
      d.refclassid = 'pg_extension'::regclass and
      d.classid = 'pg_class'::regclass
), pre as (
    SELECT n.nspname AS schema,
   c.relname AS table_name,
   i.relname AS name,
   i.oid as oid,
   e.objid as extension_oid,
   pg_get_indexdef(i.oid) AS definition,
       (
           select
               array_agg(attname order by ik.n)
           from
                unnest(x.indkey) with ordinality ik(i, n)
                join pg_attribute aa
                    on
                        aa.attrelid = x.indrelid
                        and ik.i = aa.attnum
        )
       index_columns,
       indoption key_options,
       indnatts total_column_count,
        indnkeyatts key_column_count,
       -- 10_AND_EARLIER indnatts key_column_count,
       indnatts num_att,
         indnatts - indnkeyatts included_column_count,
        -- 10_AND_EARLIER 0 included_column_count,
       indisunique is_unique,
       indisprimary is_pk,
       indisexclusion is_exclusion,
       indimmediate is_immediate,
       indisclustered is_clustered,
       indcollation key_collations,
       pg_get_expr(indexprs, indrelid) key_expressions,
       pg_get_expr(indpred, indrelid) partial_predicate,
       amname algorithm
  FROM pg_index x
    JOIN pg_class c ON c.oid = x.indrelid
    JOIN pg_class i ON i.oid = x.indexrelid
    JOIN pg_am am ON i.relam = am.oid
    LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
     left join extension_oids e
      on i.oid = e.objid
    left join extension_relations er
      on c.oid = er.objid
WHERE
    x.indislive
    and c.relkind in ('r', 'm', 'p') AND i.relkind in ('i', 'I')
       and nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
       and nspname not like 'pg_temp_%' and nspname not like 'pg_toast_temp_%'
       and e.objid is null and er.objid is null
)
select * ,
index_columns[1:key_column_count] as key_columns,
index_columns[key_column_count+1:array_length(index_columns, 1)] as included_columns
from pre
order by 1, 2, 3) snapshot_row),
'SEQUENCES_QUERY',(select coalesce(jsonb_agg(snapshot_row),'[]'::jsonb) from (with
extension_objids as (
    select
        objid as extension_objid
    from
        pg_depend d
    WHERE
        d.refclassid = 'pg_extension'::regclass and
        d.classid = 'pg_class'::regclass
), pre as (
    select
        n.nspname as schema,
        c.relname as name,
        c_ref.relname as table_name,
        a.attname as column_name,
        --a.attname is not null as has_table_owner,
        --a.attidentity is distinct from '' as is_identity,
        d.deptype is not distinct from 'i' as is_identity
        --a.attidentity = 'a' as is_identity_always
    from
        --pg_sequence s

        --inner join pg_class c
        --    on s.seqrelid = c.oid

        pg_class c

        inner join pg_catalog.pg_namespace n
            ON n.oid = c.relnamespace

        left join extension_objids
            on c.oid = extension_objids.extension_objid

        left join pg_depend d
            on c.oid = d.objid and d.deptype in ('i', 'a')

        left join pg_class c_ref
            on d.refobjid = c_ref.oid

        left join pg_attribute a
            ON ( a.attnum = d.refobjsubid
                AND a.attrelid = d.refobjid )

where
    c.relkind = 'S'
     and n.nspname not in ('pg_internal', 'pg_catalog', 'information_schema', 'pg_toast')
     and n.nspname not like 'pg_temp_%' and n.nspname not like 'pg_toast_temp_%'
    and extension_objids.extension_objid is null
)
select
    *
from
    pre
where
    not is_identity
order by
    1, 2) snapshot_row),
'CONSTRAINTS_QUERY',(select coalesce(jsonb_agg(snapshot_row),'[]'::jsonb) from (with information_schema_table_constraints as (
select
    nc.nspname::information_schema.sql_identifier AS constraint_schema,
    c.conname::information_schema.sql_identifier AS constraint_name,
    nr.nspname::information_schema.sql_identifier AS table_schema,
    r.relname::information_schema.sql_identifier AS table_name,
    CASE c.contype
        WHEN 'c'::"char" THEN 'CHECK'::text
        WHEN 'f'::"char" THEN 'FOREIGN KEY'::text
        WHEN 'p'::"char" THEN 'PRIMARY KEY'::text
        WHEN 'u'::"char" THEN 'UNIQUE'::text
        ELSE NULL::text
    END::information_schema.character_data AS constraint_type,
    CASE
        WHEN c.condeferrable THEN 'YES'::text
        ELSE 'NO'::text
    END::information_schema.yes_or_no AS is_deferrable,
    CASE
        WHEN c.condeferred THEN 'YES'::text
        ELSE 'NO'::text
    END::information_schema.yes_or_no AS initially_deferred,
    'YES'::character varying::information_schema.yes_or_no AS enforced
   FROM pg_namespace nc,
    pg_namespace nr,
    pg_constraint c,
    pg_class r
  WHERE nc.oid = c.connamespace AND nr.oid = r.relnamespace AND c.conrelid = r.oid AND (c.contype <> ALL (ARRAY['t'::"char", 'x'::"char"])) AND (r.relkind = ANY (ARRAY['r'::"char", 'p'::"char"])) AND NOT pg_is_other_temp_schema(nr.oid) AND (pg_has_role(r.relowner, 'USAGE'::text) OR has_table_privilege(r.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER'::text) OR has_any_column_privilege(r.oid, 'SELECT, INSERT, UPDATE, REFERENCES'::text))
UNION ALL
 SELECT
    nr.nspname::information_schema.sql_identifier AS constraint_schema,
    (((((nr.oid::text || '_'::text) || r.oid::text) || '_'::text) || a.attnum::text) || '_not_null'::text)::information_schema.sql_identifier AS constraint_name,
    nr.nspname::information_schema.sql_identifier AS table_schema,
    r.relname::information_schema.sql_identifier AS table_name,
    'CHECK'::character varying::information_schema.character_data AS constraint_type,
    'NO'::character varying::information_schema.yes_or_no AS is_deferrable,
    'NO'::character varying::information_schema.yes_or_no AS initially_deferred,
    'YES'::character varying::information_schema.yes_or_no AS enforced
   FROM pg_namespace nr,
    pg_class r,
    pg_attribute a
  WHERE nr.oid = r.relnamespace AND r.oid = a.attrelid AND a.attnotnull AND a.attnum > 0 AND NOT a.attisdropped AND (r.relkind = ANY (ARRAY['r'::"char", 'p'::"char"])) AND NOT pg_is_other_temp_schema(nr.oid) AND (pg_has_role(r.relowner, 'USAGE'::text) OR has_table_privilege(r.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER'::text) OR has_any_column_privilege(r.oid, 'SELECT, INSERT, UPDATE, REFERENCES'::text))
),
extension_oids as (
  select
      objid
  from
      pg_depend d
  WHERE
      d.refclassid = 'pg_extension'::regclass
      and d.classid = 'pg_constraint'::regclass
), extension_rels as (
  select
      objid
  from
      pg_depend d
  WHERE
      d.refclassid = 'pg_extension'::regclass
      and d.classid = 'pg_class'::regclass
), indexes as (
    select
        schemaname as schema,
        tablename as table_name,
        indexname as name,
        indexdef as definition,
        indexdef as create_statement
    FROM
        pg_indexes
         where schemaname not in ('pg_catalog', 'information_schema', 'pg_toast')
		 and schemaname not like 'pg_temp_%' and schemaname not like 'pg_toast_temp_%'
    order by
        schemaname, tablename, indexname
)
select
    nspname as schema,
    conname as name,
    relname as table_name,
    pg_get_constraintdef(pg_constraint.oid) as definition,
    case contype
        when 'c' then 'CHECK'
        when 'f' then 'FOREIGN KEY'
        when 'p' then 'PRIMARY KEY'
        when 'u' then 'UNIQUE'
        when 'x' then 'EXCLUDE'
    end as constraint_type,
    i.name as index,
    e.objid as extension_oid,
    case when contype = 'f' then
        (
            SELECT nspname
            FROM pg_catalog.pg_class AS c
            JOIN pg_catalog.pg_namespace AS ns
            ON c.relnamespace = ns.oid
            WHERE c.oid = confrelid::regclass
        )
    end as foreign_table_schema,
    case when contype = 'f' then
        (
            select relname
            from pg_catalog.pg_class c
            where c.oid = confrelid::regclass
        )
    end as foreign_table_name,
    case when contype = 'f' then
        (
            select
                array_agg(ta.attname order by c.rn)
            from
            pg_attribute ta
            join unnest(conkey) with ordinality c(cn, rn)

            on
                ta.attrelid = conrelid and ta.attnum = c.cn
        )
    else null end as fk_columns_local,
    case when contype = 'f' then
        (
            select
                array_agg(ta.attname order by c.rn)
            from
            pg_attribute ta
            join unnest(confkey) with ordinality c(cn, rn)

            on
                ta.attrelid = confrelid and ta.attnum = c.cn
        )
    else null end as fk_columns_foreign,
    contype = 'f' as is_fk,
    condeferrable as is_deferrable,
    condeferred as initially_deferred
from
    pg_constraint
    INNER JOIN pg_class
        ON conrelid=pg_class.oid
    INNER JOIN pg_namespace
        ON pg_namespace.oid=pg_class.relnamespace
    left outer join indexes i
        on nspname = i.schema
        and conname = i.name
        and relname = i.table_name
    left outer join extension_oids e
      on pg_class.oid = e.objid
    left outer join extension_rels er
      on er.objid = conrelid
    left outer join extension_rels cr
      on cr.objid = confrelid
    where contype in ('c', 'f', 'p', 'u', 'x')
   and nspname not in ('pg_internal', 'pg_catalog', 'information_schema', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
   and e.objid is null and er.objid is null and cr.objid is null
order by 1, 3, 2) snapshot_row),
'FUNCTIONS_QUERY',(select coalesce(jsonb_agg(snapshot_row),'[]'::jsonb) from (with extension_oids as (
      select
          objid
      from
          pg_depend d
      WHERE
          d.refclassid = 'pg_extension'::regclass
          and d.classid = 'pg_proc'::regclass
    ),
    pg_proc_pre as (
      select
        pp.*,
         pp.oid as p_oid
        -- 10_AND_EARLIER pp.oid as p_oid, case when pp.proisagg then 'a' else 'f' end as prokind
      from pg_proc pp
    ),
routines as (
 SELECT current_database()::information_schema.sql_identifier AS specific_catalog,
    n.nspname::information_schema.sql_identifier AS specific_schema,
    --nameconcatoid(p.proname, p.oid)::information_schema.sql_identifier AS specific_name,
    current_database()::information_schema.sql_identifier AS routine_catalog,
    n.nspname::information_schema.sql_identifier AS schema,
    p.proname::information_schema.sql_identifier AS name,
        CASE p.prokind
            WHEN 'f'::"char" THEN 'FUNCTION'::text
            WHEN 'p'::"char" THEN 'PROCEDURE'::text
            ELSE NULL::text
        END::information_schema.character_data AS routine_type,
        CASE
            WHEN p.prokind = 'p'::"char" THEN NULL::text
            WHEN t.typelem <> 0::oid AND t.typlen = '-1'::integer THEN 'ARRAY'::text
            WHEN nt.nspname = 'pg_catalog'::name THEN format_type(t.oid, NULL::integer)
            ELSE 'USER-DEFINED'::text
        END::information_schema.character_data AS data_type,

        CASE
            WHEN nt.nspname IS NOT NULL THEN current_database()
            ELSE NULL::name
        END::information_schema.sql_identifier AS type_udt_catalog,
    nt.nspname::information_schema.sql_identifier AS type_udt_schema,
    t.typname::information_schema.sql_identifier AS type_udt_name,
        CASE
            WHEN p.prokind <> 'p'::"char" THEN 0
            ELSE NULL::integer
        END::information_schema.sql_identifier AS dtd_identifier,
        CASE
            WHEN l.lanname = 'sql'::name THEN 'SQL'::text
            ELSE 'EXTERNAL'::text
        END::information_schema.character_data AS routine_body,
        CASE
            WHEN pg_has_role(p.proowner, 'USAGE'::text) THEN p.prosrc
            ELSE NULL::text
        END::information_schema.character_data AS definition,
        CASE
            WHEN l.lanname = 'c'::name THEN p.prosrc
            ELSE NULL::text
        END::information_schema.character_data AS external_name,
    upper(l.lanname::text)::information_schema.character_data AS external_language,
    'GENERAL'::character varying::information_schema.character_data AS parameter_style,
        CASE
            WHEN p.provolatile = 'i'::"char" THEN 'YES'::text
            ELSE 'NO'::text
        END::information_schema.yes_or_no AS is_deterministic,
    'MODIFIES'::character varying::information_schema.character_data AS sql_data_access,
        CASE
            WHEN p.prokind <> 'p'::"char" THEN
            CASE
                WHEN p.proisstrict THEN 'YES'::text
                ELSE 'NO'::text
            END
            ELSE NULL::text
        END::information_schema.yes_or_no AS is_null_call,
    'YES'::character varying::information_schema.yes_or_no AS schema_level_routine,
    0::information_schema.cardinal_number AS max_dynamic_result_sets,
        CASE
            WHEN p.prosecdef THEN 'DEFINER'::text
            ELSE 'INVOKER'::text
        END::information_schema.character_data AS security_type,
    'NO'::character varying::information_schema.yes_or_no AS as_locator,
    'NO'::character varying::information_schema.yes_or_no AS is_udt_dependent,
    p.p_oid as oid,
    p.proisstrict,
    p.prosecdef,
    p.provolatile,
    p.proargtypes,
    p.proallargtypes,
    p.proargnames,
    p.proargdefaults,
    p.proargmodes,
    p.proowner,
    p.prokind as kind
   FROM pg_namespace n
     JOIN pg_proc_pre p ON n.oid = p.pronamespace
     JOIN pg_language l ON p.prolang = l.oid
     LEFT JOIN (pg_type t
     JOIN pg_namespace nt ON t.typnamespace = nt.oid) ON p.prorettype = t.oid AND p.prokind <> 'p'::"char"
  WHERE pg_has_role(p.proowner, 'USAGE'::text) OR has_function_privilege(p.p_oid, 'EXECUTE'::text)

),
    pgproc as (
      select
        schema,
        name,
        p.oid as oid,
        e.objid as extension_oid,
        case proisstrict when true then
          'RETURNS NULL ON NULL INPUT'
        else
          'CALLED ON NULL INPUT'
        end as strictness,
        case prosecdef when true then
          'SECURITY DEFINER'
        else
          'SECURITY INVOKER'
        end as security_type,
        case provolatile
          when 'i' then
            'IMMUTABLE'
          when 's' then
            'STABLE'
          when 'v' then
            'VOLATILE'
          else
            null
        end as volatility,
        p.proargtypes,
        p.proallargtypes,
        p.proargnames,
        p.proargdefaults,
        p.proargmodes,
        p.proowner,
        COALESCE(p.proallargtypes, p.proargtypes::oid[]) as procombinedargtypes,
        p.kind,
        p.type_udt_schema,
        p.type_udt_name,
        p.definition,
        p.external_language

      from
          routines p
          left outer join extension_oids e
            on p.oid = e.objid
      where true
       and p.kind != 'a'
       and schema not in ('pg_internal', 'pg_catalog', 'information_schema', 'pg_toast')
       and schema not like 'pg_temp_%' and schema not like 'pg_toast_temp_%'
       and e.objid is null
       and p.external_language not in ('C', 'INTERNAL')
    ),
unnested as (
    select
        p.*,
        pname as parameter_name,
        pnum as position_number,
        CASE
            WHEN pargmode IS NULL THEN null
            WHEN pargmode = 'i'::"char" THEN 'IN'::text
            WHEN pargmode = 'o'::"char" THEN 'OUT'::text
            WHEN pargmode = 'b'::"char" THEN 'INOUT'::text
            WHEN pargmode = 'v'::"char" THEN 'IN'::text
            WHEN pargmode = 't'::"char" THEN 'OUT'::text
            ELSE NULL::text
            END::information_schema.character_data AS parameter_mode,
      CASE
        WHEN t.typelem <> 0::oid AND t.typlen = '-1'::integer THEN 'ARRAY'::text
        else format_type(t.oid, NULL::integer)

    END::information_schema.character_data AS data_type,
    CASE
            WHEN pg_has_role(p.proowner, 'USAGE'::text) THEN pg_get_function_arg_default(p.oid, pnum::int)
            ELSE NULL::text
        END::varchar AS parameter_default
    from pgproc p
    left join lateral
    unnest(
        p.proargnames,
        p.proallargtypes,
        p.procombinedargtypes,
        p.proargmodes)
    WITH ORDINALITY AS uu(pname, pdatatype, pargtype, pargmode, pnum) ON TRUE
    left join pg_type t
        on t.oid = uu.pargtype
),
    pre as (
        SELECT
            p.schema as schema,
            p.name as name,
            case when p.data_type = 'USER-DEFINED' then
              '"' || p.type_udt_schema || '"."' || p.type_udt_name || '"'
            else
              p.data_type
            end as returntype,
            p.data_type = 'USER-DEFINED' as has_user_defined_returntype,
            p.parameter_name as parameter_name,
            p.data_type as data_type,
            p.parameter_mode as parameter_mode,
            p.parameter_default as parameter_default,
            p.position_number as position_number,
            p.definition as definition,
            pg_get_functiondef(p.oid) as full_definition,
            p.external_language as language,
            p.strictness as strictness,
            p.security_type as security_type,
            p.volatility as volatility,
            p.kind as kind,
            p.oid as oid,
            p.extension_oid as extension_oid,
            pg_get_function_result(p.oid) as result_string,
            pg_get_function_identity_arguments(p.oid) as identity_arguments,
            pg_catalog.obj_description(p.oid) as comment
        FROM
          unnested p
    )
select
*
from pre
order by
    schema, name, parameter_mode, position_number, parameter_name) snapshot_row),
'TYPES_QUERY',(select coalesce(jsonb_agg(snapshot_row),'[]'::jsonb) from (with extension_oids as (
  select
      objid
  from
      pg_depend d
  WHERE
      d.refclassid = 'pg_extension'::regclass and
      d.classid = 'pg_type'::regclass
)

SELECT
  n.nspname AS schema,
  pg_catalog.format_type (t.oid, NULL) AS name,
  t.typname AS internal_name,
  CASE
    WHEN t.typrelid != 0
      THEN CAST ( 'tuple' AS pg_catalog.text )
    WHEN t.typlen < 0
      THEN CAST ( 'var' AS pg_catalog.text )
    ELSE CAST ( t.typlen AS pg_catalog.text )
  END AS size,
  -- pg_catalog.array_to_string (
  --   ARRAY(
  --     SELECT e.enumlabel
  --       FROM pg_catalog.pg_enum e
  --       WHERE e.enumtypid = t.oid
  --       ORDER BY e.oid ), E'\n'
  --   ) AS columns,
  pg_catalog.obj_description (t.oid, 'pg_type') AS description,
  (array_to_json(array(
    select
      jsonb_build_object('attribute', attname, 'type', a.typname)
    from pg_class
    join pg_attribute on (attrelid = pg_class.oid)
    join pg_type a on (atttypid = a.oid)
    where (pg_class.reltype = t.oid)
  ))) as columns
FROM
  pg_catalog.pg_type t
  LEFT JOIN pg_catalog.pg_namespace n
    ON n.oid = t.typnamespace
WHERE (
  t.typrelid = 0
  OR (
    SELECT c.relkind = 'c'
      FROM pg_catalog.pg_class c
      WHERE c.oid = t.typrelid
  )
)
AND NOT EXISTS (
  SELECT 1
    FROM pg_catalog.pg_type el
    WHERE el.oid = t.typelem
    AND el.typarray = t.oid
)
AND n.nspname <> 'pg_catalog'
AND n.nspname <> 'information_schema'
AND pg_catalog.pg_type_is_visible ( t.oid )
and t.typcategory = 'C'
and t.oid not in (select * from extension_oids)
ORDER BY 1, 2) snapshot_row),
'DOMAINS_QUERY',(select coalesce(jsonb_agg(snapshot_row),'[]'::jsonb) from (with extension_oids as (
  select
      objid
  from
      pg_depend d
  WHERE
      d.refclassid = 'pg_extension'::regclass and
      d.classid = 'pg_type'::regclass
)
SELECT n.nspname as "schema",
       t.typname as "name",
       pg_catalog.format_type(t.typbasetype, t.typtypmod) as "data_type",
       (SELECT c.collname FROM pg_catalog.pg_collation c, pg_catalog.pg_type bt
        WHERE c.oid = t.typcollation AND bt.oid = t.typbasetype AND t.typcollation <> bt.typcollation) as "collation",
        rr.conname as "constraint_name",
       t.typnotnull as "not_null",
       t.typdefault as "default",
       pg_catalog.array_to_string(ARRAY(
         SELECT pg_catalog.pg_get_constraintdef(r.oid, true) FROM pg_catalog.pg_constraint r WHERE t.oid = r.contypid
       ), ' ') as "check"
FROM pg_catalog.pg_type t
     LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
     left join pg_catalog.pg_constraint rr on t.oid = rr.contypid
WHERE t.typtype = 'd'
      AND n.nspname <> 'pg_catalog'
      AND n.nspname <> 'information_schema'
  AND pg_catalog.pg_type_is_visible(t.oid)
  and t.oid not in (select * from extension_oids)
ORDER BY 1, 2) snapshot_row),
'EXTENSIONS_QUERY',(select coalesce(jsonb_agg(snapshot_row),'[]'::jsonb) from (select
  nspname as schema,
  extname as name,
  extversion as version,
  e.oid as oid
from
    pg_extension e
    INNER JOIN pg_namespace
        ON pg_namespace.oid=e.extnamespace
order by schema, name) snapshot_row),
'ENUMS_QUERY',(select coalesce(jsonb_agg(snapshot_row),'[]'::jsonb) from (with extension_oids as (
  select
      objid
  from
      pg_depend d
  WHERE
      d.refclassid = 'pg_extension'::regclass and
      d.classid = 'pg_type'::regclass
)
SELECT
  n.nspname as "schema",
  t.typname as "name",
  ARRAY(
     SELECT e.enumlabel::text
      FROM pg_catalog.pg_enum e
      WHERE e.enumtypid = t.oid
      ORDER BY e.enumsortorder
  ) as elements
FROM pg_catalog.pg_type t
     LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
     left outer join extension_oids e
       on t.oid = e.objid
WHERE
  t.typcategory = 'E'
  and e.objid is null
   and n.nspname not in ('pg_internal', 'pg_catalog', 'information_schema', 'pg_toast')
   and n.nspname not like 'pg_temp_%' and n.nspname not like 'pg_toast_temp_%'
ORDER BY 1, 2) snapshot_row),
'DEPS_QUERY',(select coalesce(jsonb_agg(snapshot_row),'[]'::jsonb) from (with things1 as (
  select
    oid as objid,
    pronamespace as namespace,
    proname as name,
    pg_get_function_identity_arguments(oid) as identity_arguments,
    'f' as kind
  from pg_proc
   where pg_proc.prokind != 'a'
  -- 10_AND_EARLIER where pg_proc.proisagg is False
  union
  select
    oid,
    relnamespace as namespace,
    relname as name,
    null as identity_arguments,
    relkind as kind
  from pg_class
  where oid not in (
    select ftrelid from pg_foreign_table
  )
),
extension_objids as (
  select
      objid as extension_objid
  from
      pg_depend d
  WHERE
      d.refclassid = 'pg_extension'::regclass
    union
    select
        t.typrelid as extension_objid
    from
        pg_depend d
        join pg_type t on t.oid = d.objid
    where
        d.refclassid = 'pg_extension'::regclass
),
things as (
    select
      objid,
      kind,
      n.nspname as schema,
      name,
      identity_arguments
    from things1 t
    inner join pg_namespace n
      on t.namespace = n.oid
    left outer join extension_objids
      on t.objid = extension_objids.extension_objid
    where
      kind in ('r', 'v', 'm', 'c', 'f') and
      nspname not in ('pg_internal', 'pg_catalog', 'information_schema', 'pg_toast')
      and nspname not like 'pg_temp_%' and nspname not like 'pg_toast_temp_%'
      and extension_objids.extension_objid is null
),
combined as (
  select distinct
    t.objid,
    t.schema,
    t.name,
    t.identity_arguments,
    t.kind,
    things_dependent_on.objid as objid_dependent_on,
    things_dependent_on.schema as schema_dependent_on,
    things_dependent_on.name as name_dependent_on,
    things_dependent_on.identity_arguments as identity_arguments_dependent_on,
    things_dependent_on.kind as kind_dependent_on
  FROM
      pg_depend d
      inner join things things_dependent_on
        on d.refobjid = things_dependent_on.objid
      inner join pg_rewrite rw
        on d.objid = rw.oid
        and things_dependent_on.objid != rw.ev_class
      inner join things t
        on rw.ev_class = t.objid
  where
    d.deptype in ('n')
    and
    rw.rulename = '_RETURN'
)
select * from combined
order by
schema, name, identity_arguments, kind_dependent_on,
schema_dependent_on, name_dependent_on, identity_arguments_dependent_on) snapshot_row),
'SCHEMAS_QUERY',(select coalesce(jsonb_agg(snapshot_row),'[]'::jsonb) from (with extension_oids as (
  select
      objid
  from
      pg_depend d
  WHERE
      d.refclassid = 'pg_extension'::regclass
      and d.classid = 'pg_namespace'::regclass
) select
    nspname as schema
from
    pg_catalog.pg_namespace
    left outer join extension_oids e
    	on e.objid = oid
 where nspname not in ('pg_internal', 'pg_catalog', 'information_schema', 'pg_toast')
 and nspname not like 'pg_temp_%' and nspname not like 'pg_toast_temp_%'
 and e.objid is null
order by 1) snapshot_row),
'PRIVILEGES_QUERY',(select coalesce(jsonb_agg(snapshot_row),'[]'::jsonb) from (select
  table_schema as schema,
  table_name as name,
  'table' as object_type,
  grantee as user,
  privilege_type as privilege
from information_schema.role_table_grants
where grantee != (
    select tableowner
    from pg_tables
    where schemaname = table_schema
    and tablename = table_name
)
 and table_schema not in ('pg_internal', 'pg_catalog', 'information_schema', 'pg_toast')
 and table_schema not like 'pg_temp_%' and table_schema not like 'pg_toast_temp_%'
order by schema, name, user) snapshot_row),
'TRIGGERS_QUERY',(select coalesce(jsonb_agg(snapshot_row),'[]'::jsonb) from (with extension_oids as (
  select
      objid
  from
      pg_depend d
  WHERE
     d.refclassid = 'pg_extension'::regclass and
     d.classid = 'pg_trigger'::regclass
)
select
    tg.tgname "name",
    nsp.nspname "schema",
    cls.relname table_name,
    pg_get_triggerdef(tg.oid) full_definition,
    proc.proname proc_name,
    nspp.nspname proc_schema,
    tg.tgenabled enabled,
    tg.oid in (select * from extension_oids) as extension_owned
from pg_trigger tg
join pg_class cls on cls.oid = tg.tgrelid
join pg_namespace nsp on nsp.oid = cls.relnamespace
join pg_proc proc on proc.oid = tg.tgfoid
join pg_namespace nspp on nspp.oid = proc.pronamespace
where not tg.tgisinternal
 and not tg.oid in (select * from extension_oids)
order by schema, table_name, name) snapshot_row),
'SECURITY',(select coalesce(jsonb_agg(snapshot_row),'[]'::jsonb) from (select 'relation' kind,c.relname::text name,pg_get_userbyid(c.relowner) owner,
  to_jsonb(array(select x::text from unnest(c.relacl) x order by x::text)) acl,
  jsonb_build_object('rowsecurity',c.relrowsecurity,'forcerowsecurity',c.relforcerowsecurity,
    'options',c.reloptions,'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,
      'acl',array(select x::text from unnest(a.attacl) x order by x::text)) order by a.attname)
      from pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped)) attributes
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p','v','m','S','f')
union all
select 'function',p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',pg_get_userbyid(p.proowner),
  to_jsonb(array(select x::text from unnest(p.proacl) x order by x::text)),
  jsonb_build_object('security_definer',p.prosecdef,'config',p.proconfig,'leakproof',p.proleakproof)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
order by kind,name) snapshot_row),
'LEDGER',(select coalesce(jsonb_agg(snapshot_row),'[]'::jsonb) from (select version from supabase_migrations.schema_migrations order by version) snapshot_row)) as receipt;