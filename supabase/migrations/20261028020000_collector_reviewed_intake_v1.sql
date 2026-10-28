-- Qualified replay and default-off rollout are required before activation.
begin;
set local search_path=pg_catalog,public,extensions;

do $reviewed_intake_object_guards$ declare actual text; begin
if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('collector_intake_can_write_v1','collector_intake_set_control_v1','guard_vault_intake_origin_v1','vault_intake_execute_v1','vault_intake_request_v1') and format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) not in ('public.collector_intake_can_write_v1()','public.collector_intake_set_control_v1(bigint, boolean, uuid[])','public.guard_vault_intake_origin_v1()','public.vault_intake_execute_v1(uuid, text, jsonb)','public.vault_intake_request_v1(uuid, text, jsonb)')) then raise exception 'reviewed_intake_function_overload_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p where p.oid=to_regprocedure('public.collector_intake_can_write_v1()')); if actual is not null and actual is distinct from '28586ecc3dff52101f7e9ad35678dd723d37d97bc57e54579b0e68bdc23df91f' then raise exception 'reviewed_intake_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p where p.oid=to_regprocedure('public.collector_intake_set_control_v1(bigint, boolean, uuid[])')); if actual is not null and actual is distinct from '830ac2418d715c275aeae95fa991115b627745dcf70ae53f89af9cb29884b5ca' then raise exception 'reviewed_intake_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p where p.oid=to_regprocedure('public.guard_vault_intake_origin_v1()')); if actual is not null and actual is distinct from '935e4a76d53ed456fefdf50e6896e75136f26c1e821b6812948f117cdcc0a46c' then raise exception 'reviewed_intake_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p where p.oid=to_regprocedure('public.vault_intake_execute_v1(uuid, text, jsonb)')); if actual is not null and actual is distinct from 'f0da35d9f4ad16eb449b92d1d878cceb3d2f187ab9a2be7f92e0a650197e3230' then raise exception 'reviewed_intake_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p where p.oid=to_regprocedure('public.vault_intake_request_v1(uuid, text, jsonb)')); if actual is not null and actual is distinct from 'f48b663f0b0df9a884855cb46e6714b84076f02c0ff1670a34e720b3bc8af261' then raise exception 'reviewed_intake_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.collector_intake_control_events_v1_pkey')); if actual is not null and actual is distinct from 'bff21c4bc367fd2b3b01bef6d40a2af1c789e1f153338b095a4f006d94d9b87f' then raise exception 'reviewed_intake_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.collector_intake_controls_v1_pkey')); if actual is not null and actual is distinct from '2fe629564c2000de0b91df4bd3bd789f468891dfbd845a860af3467a8d9858fe' then raise exception 'reviewed_intake_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.purchase_lots_owner_date_idx')); if actual is not null and actual is distinct from 'fe18bba313e90b9c12022053049ae330d0ec722dba502fc41937277c44db925a' then raise exception 'reviewed_intake_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.purchase_lots_pkey')); if actual is not null and actual is distinct from 'c9a0334bfd265febe53daa3b68827986a155b6a24a9c11d0e5ffec983e7c2946' then raise exception 'reviewed_intake_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.purchase_lots_tags_idx')); if actual is not null and actual is distinct from 'e7db8c441216f1b9635940689ca424009f596bc81d8926d4fcb31f882e4e0605' then raise exception 'reviewed_intake_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_instances_acquired_idx')); if actual is not null and actual is distinct from '577d749683bafaeb86a2049917fe31eee2d087335ddbf4d094a17cd1b9903df6' then raise exception 'reviewed_intake_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_instances_intake_tags_idx')); if actual is not null and actual is distinct from '02937fb013547d4ee5f71ae924906aaab1fe988edb66388ef1bfc6b732969f95' then raise exception 'reviewed_intake_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_instances_purchase_lot_idx')); if actual is not null and actual is distinct from '0f7c463aa123a5fbf0ca4e60ac3eadf3c138cf60ce2c404cb09a6708edf2ffe7' then raise exception 'reviewed_intake_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_allocation_events_pkey')); if actual is not null and actual is distinct from '326a69a2580e55d90d285f7709baa8ab16e63ff6fe8f97a0a6967d57b3820e6a' then raise exception 'reviewed_intake_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_batches_owner_idx')); if actual is not null and actual is distinct from 'd5fa6b0ca7f0fc2d593f0726abc1440fe67030a6d430fc7e019f5942bc19fd7c' then raise exception 'reviewed_intake_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_batches_pkey')); if actual is not null and actual is distinct from 'd919b21cd5eec71b6f3a21847ea6816b4a300ad012918fc2c40484e431d3dc40' then raise exception 'reviewed_intake_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_commit_receipts_v1_pkey')); if actual is not null and actual is distinct from 'bb755b5fccb9ee6082f6f77a67fd21f6c7d882185177d8a649380deb715fa145' then raise exception 'reviewed_intake_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_items_batch_idx')); if actual is not null and actual is distinct from 'd9328a960144b601c94124d2766b2751a6ce052130873a5819231183f4fff085' then raise exception 'reviewed_intake_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_items_pkey')); if actual is not null and actual is distinct from 'dc3bcb9ffd6be56b85c359c2d82236f410c9de566d6db991ade83e301e4fc323' then raise exception 'reviewed_intake_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_operations_analysis_idx')); if actual is not null and actual is distinct from 'd84ad4ecab9140be29c26b79bbb2e3f7da6a892351737ddf0a1de1fc1ef29faf' then raise exception 'reviewed_intake_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_operations_owner_time_idx')); if actual is not null and actual is distinct from 'b5f7c01eb69e3fdb7acea793fef6e4b144ead6457a85dd7e2c66507a31f6073b' then raise exception 'reviewed_intake_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_operations_v1_pkey')); if actual is not null and actual is distinct from '432f785c10883441e33b5af4b4e01a4f04d0345737654d7530db9085a370f83b' then raise exception 'reviewed_intake_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_sales_v1_disposition_id_key')); if actual is not null and actual is distinct from '7ae1a345e1c6e70962b3b2167eade1e9129bea78f9e27874b20c13d6169af4db' then raise exception 'reviewed_intake_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_sales_v1_pkey')); if actual is not null and actual is distinct from '14dae091de2ae717a51ba0bbbc06872053f4ddbf3f7d77f735747074c3a3fc98' then raise exception 'reviewed_intake_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('command',p.polcmd,'permissive',p.polpermissive,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid),'roles',(select jsonb_agg(case when role_id=0 then 'public' else pg_get_userbyid(role_id) end order by role_id) from unnest(p.polroles) role_id)))::text,'UTF8')),'hex') from pg_policy p where p.polrelid='storage.objects'::regclass and p.polname='vault_intake_private_delete'); if actual is not null and actual is distinct from 'd6fb0cc209d235e00338d390500eaf32e9b18cfbeb4cb66d75e674ee6d440634' then raise exception 'reviewed_intake_policy_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('command',p.polcmd,'permissive',p.polpermissive,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid),'roles',(select jsonb_agg(case when role_id=0 then 'public' else pg_get_userbyid(role_id) end order by role_id) from unnest(p.polroles) role_id)))::text,'UTF8')),'hex') from pg_policy p where p.polrelid='storage.objects'::regclass and p.polname='vault_intake_private_insert'); if actual is not null and actual is distinct from '83032a35f551942048f826cc6cce03e6350d9515fd48beac6b0949680a82cc5c' then raise exception 'reviewed_intake_policy_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('command',p.polcmd,'permissive',p.polpermissive,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid),'roles',(select jsonb_agg(case when role_id=0 then 'public' else pg_get_userbyid(role_id) end order by role_id) from unnest(p.polroles) role_id)))::text,'UTF8')),'hex') from pg_policy p where p.polrelid='storage.objects'::regclass and p.polname='vault_intake_private_select'); if actual is not null and actual is distinct from '9d8dea7099d26b59ca48b15cdabddc0e263332f32ae9febb147799137b2b2dca' then raise exception 'reviewed_intake_policy_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('command',p.polcmd,'permissive',p.polpermissive,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid),'roles',(select jsonb_agg(case when role_id=0 then 'public' else pg_get_userbyid(role_id) end order by role_id) from unnest(p.polroles) role_id)))::text,'UTF8')),'hex') from pg_policy p where p.polrelid='storage.objects'::regclass and p.polname='vault_intake_private_update'); if actual is not null and actual is distinct from '90772c11876397fb32b27c9d033c4f4d555d8551361933ef6675c9c9abe12709' then raise exception 'reviewed_intake_policy_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.collector_intake_control_events_v1')); if actual is not null and actual is distinct from 'a688a9f74a4b6a495d49d727babb72e11dadce969c9418e2092e96e44fe60ed5' then raise exception 'reviewed_intake_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.collector_intake_controls_v1')); if actual is not null and actual is distinct from '727ee598124f60fd2ff09b8cdfb3cea7dc336757db046b1c9137d8363690fc06' then raise exception 'reviewed_intake_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.purchase_lots')); if actual is not null and actual is distinct from 'f11710dcb06ec52d078680e2b1f74fc3740a6da8057e02f1ee56701db703fe84' then raise exception 'reviewed_intake_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_allocation_events')); if actual is not null and actual is distinct from '50142e16a73d77eefed59d2b158f42e5d300ce328c675f6425f0c0e6b5a8166b' then raise exception 'reviewed_intake_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_batches')); if actual is not null and actual is distinct from 'ad60d57f850aee56814c05f58f86655ad356a2d495106039da20c086e46d6317' then raise exception 'reviewed_intake_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_commit_receipts_v1')); if actual is not null and actual is distinct from '80d3e3ffb48c59a2971ab000de91b19013a9e00a00ea709d225ab8afa8f796b1' then raise exception 'reviewed_intake_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_items')); if actual is not null and actual is distinct from '457572418ca665430c2e165debdd3e3ca60b5081c2d0b5ef4ff30a0f7fe490d7' then raise exception 'reviewed_intake_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_operations_v1')); if actual is not null and actual is distinct from '3e3b895aac42782ca69c7ec4aa4a8fb02e77dbe2167195ec9c01b239bd4240a1' then raise exception 'reviewed_intake_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_sales_v1')); if actual is not null and actual is distinct from '59705f5f6f08248c3958fee44a727ff236dcc73d5b41f92c55e04cdfa06f7591' then raise exception 'reviewed_intake_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled))::text,'UTF8')),'hex') from pg_trigger t where t.tgrelid='public.vault_item_instances'::regclass and t.tgname='guard_vault_intake_origin_v1' and not t.tgisinternal); if actual is not null and actual is distinct from '23d7228ea5e91c8a419800e05225c612bb4ec7edb334217fc0e4c821bf6c5c7f' then raise exception 'reviewed_intake_trigger_drift'; end if;
end $reviewed_intake_object_guards$;

create table if not exists public.collector_intake_controls_v1 (
  singleton boolean primary key default true check (singleton),
  writes_enabled boolean not null default false,
  canary_actor_ids uuid[] not null default '{}',
  revision bigint not null default 1 check (revision>0),
  updated_at timestamptz not null default now(),
  check (cardinality(canary_actor_ids)<=10)
);
insert into public.collector_intake_controls_v1(singleton) values(true) on conflict do nothing;

create table if not exists public.collector_intake_control_events_v1 (
  id uuid primary key default gen_random_uuid(),
  version text not null default 'collector_reviewed_intake_v1',
  status text not null check(status in ('succeeded','failed')),
  previous_state jsonb not null default '{}',
  next_state jsonb not null default '{}',
  error_code text,
  error_detail jsonb not null default '{}',
  created_at timestamptz not null default clock_timestamp()
);
create table if not exists public.vault_intake_operations_v1 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version text not null default 'collector_reviewed_intake_v1',
  analysis_key text not null check(char_length(analysis_key)=64),
  action text not null check(char_length(action) between 1 and 80),
  subject_id uuid,
  status text not null check(status in ('succeeded','failed')),
  stage text not null,
  result_summary jsonb not null default '{}',
  error_code text,
  error_detail jsonb not null default '{}',
  started_at timestamptz not null,
  finished_at timestamptz not null,
  check ((status='succeeded' and error_code is null) or (status='failed' and error_code is not null))
);
create index if not exists vault_intake_operations_owner_time_idx on public.vault_intake_operations_v1(user_id,finished_at desc,id);
create index if not exists vault_intake_operations_analysis_idx on public.vault_intake_operations_v1(analysis_key,finished_at desc);
alter table public.collector_intake_controls_v1 enable row level security;
alter table public.collector_intake_control_events_v1 enable row level security;
alter table public.vault_intake_operations_v1 enable row level security;
revoke all on public.collector_intake_controls_v1,public.collector_intake_control_events_v1,public.vault_intake_operations_v1 from public,anon,authenticated,service_role;
grant select on public.collector_intake_controls_v1,public.collector_intake_control_events_v1,public.vault_intake_operations_v1 to service_role;

create or replace function public.collector_intake_can_write_v1() returns boolean
language sql stable security definer set search_path=public as $function$
  select auth.uid() is not null and exists(
    select 1 from public.collector_intake_controls_v1 c where c.singleton
      and (c.writes_enabled or auth.uid()=any(c.canary_actor_ids))
  );
$function$;
revoke all on function public.collector_intake_can_write_v1() from public,anon,authenticated,service_role;
grant execute on function public.collector_intake_can_write_v1() to authenticated,service_role;

create or replace function public.collector_intake_set_control_v1(p_expected_revision bigint,p_enabled boolean,p_canary_actor_ids uuid[] default '{}') returns jsonb
language plpgsql security definer set search_path=public as $function$
declare
  previous public.collector_intake_controls_v1%rowtype;
  next_row public.collector_intake_controls_v1%rowtype;
  actors uuid[];
  code text;
  state text;
  message text;
  event_id uuid:=gen_random_uuid();
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  begin
    if p_enabled is null or p_canary_actor_ids is null or cardinality(p_canary_actor_ids)>10 or array_position(p_canary_actor_ids,null) is not null then raise exception 'invalid_intake_control'; end if;
    select coalesce(array_agg(id order by id),'{}'::uuid[]) into actors from (select distinct unnest(p_canary_actor_ids) id) a;
    if (select count(*) from auth.users where id=any(actors))<>cardinality(actors) then raise exception 'invalid_canary_actor'; end if;
    select * into previous from public.collector_intake_controls_v1 where singleton for update;
    if previous.revision is distinct from p_expected_revision then raise exception 'intake_control_revision_conflict' using errcode='40001'; end if;
    update public.collector_intake_controls_v1 set writes_enabled=p_enabled,canary_actor_ids=actors,revision=revision+1,updated_at=clock_timestamp()
      where singleton returning * into next_row;
  exception when others then
    get stacked diagnostics state=returned_sqlstate,message=message_text;
    code:=case when message ~ '^[a-z][a-z0-9_]{1,79}$' then message else 'intake_control_failed' end;
  end;
  insert into public.collector_intake_control_events_v1(id,status,previous_state,next_state,error_code,error_detail)
  values(event_id,case when code is null then 'succeeded' else 'failed' end,coalesce(to_jsonb(previous),'{}'),
    case when code is null then to_jsonb(next_row) else '{}'::jsonb end,code,
    case when code is null then '{}'::jsonb else jsonb_build_object('sqlstate',state,'stage','control_update') end);
  if code is not null then return jsonb_build_object('ok',false,'operation_id',event_id,'error',jsonb_build_object('code',code,'sqlstate',state)); end if;
  return jsonb_build_object('ok',true,'operation_id',event_id,'result',to_jsonb(next_row));
end;
$function$;
revoke all on function public.collector_intake_set_control_v1(bigint,boolean,uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.collector_intake_set_control_v1(bigint,boolean,uuid[]) to service_role;


create table if not exists public.purchase_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  purchased_on date not null default current_date,
  currency text not null default 'USD' check (currency in ('USD','CAD','EUR','GBP','AUD','NZD','CHF')),
  total_cost_cents bigint null check (total_cost_cents between 0 and 100000000000),
  reserve_cents bigint not null default 0 check (reserve_cents >= 0),
  is_complete boolean not null default false,
  source text null check (char_length(source) <= 240),
  notes text null check (char_length(notes) <= 4000),
  tags text[] not null default '{}',
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(tags) <= 40),
  check (total_cost_cents is null or reserve_cents <= total_cost_cents)
);
create index if not exists purchase_lots_owner_date_idx on public.purchase_lots(user_id,purchased_on desc);
create index if not exists purchase_lots_tags_idx on public.purchase_lots using gin(tags);

create table if not exists public.vault_intake_batches (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lot_id uuid null references public.purchase_lots(id),
  title text not null check (char_length(title) between 1 and 160),
  currency text not null check (currency in ('USD','CAD','EUR','GBP','AUD','NZD','CHF')),
  acquired_on date not null default current_date,
  tags text[] not null default '{}',
  state text not null default 'draft' check (state in ('draft','partial','saved')),
  snapshot jsonb not null default '{}'::jsonb,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(tags) <= 40),
  check (octet_length(snapshot::text) <= 4000000)
);
create index if not exists vault_intake_batches_owner_idx on public.vault_intake_batches(user_id,updated_at desc);

create table if not exists public.vault_intake_items (
  id uuid primary key,
  batch_id uuid not null references public.vault_intake_batches(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  saved_instance_ids uuid[] not null default '{}',
  saved_at timestamptz null,
  created_at timestamptz not null default now()
);
create index if not exists vault_intake_items_batch_idx on public.vault_intake_items(batch_id);

alter table public.vault_item_instances
  add column if not exists acquisition_lot_id uuid null references public.purchase_lots(id),
  add column if not exists intake_item_id uuid null references public.vault_intake_items(id),
  add column if not exists acquired_on date null,
  add column if not exists acquisition_currency text null,
  add column if not exists intake_tags text[] not null default '{}',
  add column if not exists intake_allocation jsonb not null default '{}'::jsonb;
create index if not exists vault_instances_purchase_lot_idx on public.vault_item_instances(user_id,acquisition_lot_id);
create index if not exists vault_instances_acquired_idx on public.vault_item_instances(user_id,acquired_on);
create index if not exists vault_instances_intake_tags_idx on public.vault_item_instances using gin(intake_tags);

-- Existing owner-update policies must not allow assigning another user's lot,
-- forging intake membership, or changing sold intake costs through old clients.
create or replace function public.guard_vault_intake_origin_v1() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.acquisition_lot_id is not null and not exists(select 1 from public.purchase_lots l where l.id=new.acquisition_lot_id and l.user_id=new.user_id) then raise exception 'invalid_lot_owner'; end if;
  if new.intake_item_id is not null and not exists(select 1 from public.vault_intake_items i where i.id=new.intake_item_id and i.user_id=new.user_id) then raise exception 'invalid_intake_owner'; end if;
  if auth.role() is distinct from 'service_role' then
    if tg_op='INSERT' then
      if new.acquisition_lot_id is not null or new.intake_item_id is not null then raise exception 'intake_service_required'; end if;
    elsif new.acquisition_lot_id is distinct from old.acquisition_lot_id or new.intake_item_id is distinct from old.intake_item_id or
      (old.intake_item_id is not null and (new.acquisition_cost is distinct from old.acquisition_cost or new.acquisition_currency is distinct from old.acquisition_currency or new.acquired_on is distinct from old.acquired_on or new.intake_allocation is distinct from old.intake_allocation or new.intake_tags is distinct from old.intake_tags)) then raise exception 'intake_service_required'; end if;
  end if;
  return new;
end; $$;
revoke all on function public.guard_vault_intake_origin_v1() from public,anon,authenticated;
do $trigger_guard$ begin if not exists(select 1 from pg_trigger where tgrelid='public.vault_item_instances'::regclass and tgname='guard_vault_intake_origin_v1') then create trigger guard_vault_intake_origin_v1 before insert or update on public.vault_item_instances for each row execute function public.guard_vault_intake_origin_v1(); end if; end $trigger_guard$;

create table if not exists public.vault_intake_allocation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lot_id uuid null references public.purchase_lots(id),
  batch_id uuid null references public.vault_intake_batches(id),
  instance_id uuid not null references public.vault_item_instances(id),
  previous_cost numeric null,
  next_cost numeric null,
  reason text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);


alter table public.purchase_lots enable row level security;
alter table public.vault_intake_batches enable row level security;
alter table public.vault_intake_items enable row level security;
alter table public.vault_intake_allocation_events enable row level security;
revoke all on public.purchase_lots,public.vault_intake_batches,public.vault_intake_items,public.vault_intake_allocation_events from public,anon,authenticated;
grant all on public.purchase_lots,public.vault_intake_batches,public.vault_intake_items,public.vault_intake_allocation_events to service_role;

do $bucket_guard$ begin
 if exists(select 1 from storage.buckets where id='vault-intake-private' and
   (public is distinct from false or file_size_limit is distinct from 16777216::bigint or allowed_mime_types is distinct from array['image/jpeg','image/png']::text[])) then
   raise exception 'intake_private_bucket_drift';
 end if;
end $bucket_guard$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('vault-intake-private','vault-intake-private',false,16777216,array['image/jpeg','image/png'])
on conflict(id) do nothing;
do $policy_guard$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='vault_intake_private_select') then create policy vault_intake_private_select on storage.objects for select to authenticated
  using (bucket_id='vault-intake-private' and (storage.foldername(name))[1]=auth.uid()::text); end if; end $policy_guard$;
do $policy_guard$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='vault_intake_private_insert') then create policy vault_intake_private_insert on storage.objects for insert to authenticated
  with check (bucket_id='vault-intake-private' and (storage.foldername(name))[1]=auth.uid()::text); end if; end $policy_guard$;
do $policy_guard$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='vault_intake_private_update') then create policy vault_intake_private_update on storage.objects for update to authenticated
  using (bucket_id='vault-intake-private' and (storage.foldername(name))[1]=auth.uid()::text)
  with check (bucket_id='vault-intake-private' and (storage.foldername(name))[1]=auth.uid()::text); end if; end $policy_guard$;
do $policy_guard$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='vault_intake_private_delete') then create policy vault_intake_private_delete on storage.objects for delete to authenticated
  using (bucket_id='vault-intake-private' and (storage.foldername(name))[1]=auth.uid()::text); end if; end $policy_guard$;

create table if not exists public.vault_intake_commit_receipts_v1 (
  batch_id uuid not null references public.vault_intake_batches(id),
  request_revision integer not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  result jsonb not null check(octet_length(result::text)<=4500000),
  created_at timestamptz not null default now(),
  primary key(batch_id,request_revision)
);
alter table public.vault_intake_commit_receipts_v1 enable row level security;
revoke all on public.vault_intake_commit_receipts_v1 from public,anon,authenticated,service_role;
grant select on public.vault_intake_commit_receipts_v1 to service_role;

create table if not exists public.vault_intake_sales_v1 (
  request_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  disposition_id uuid not null unique references public.vault_item_instance_dispositions(id),
  selling_expenses_amount numeric not null default 0 check (selling_expenses_amount between 0 and 1000000000 and selling_expenses_amount*100=trunc(selling_expenses_amount*100)),
  sold_on date not null,
  created_at timestamptz not null default now()
);
alter table public.vault_intake_sales_v1 enable row level security;
revoke all on public.vault_intake_sales_v1 from public,anon,authenticated,service_role;
grant select on public.vault_intake_sales_v1 to service_role;

-- Privileged executor, reachable only through the audited request wrapper.
-- Single authenticated edge boundary. Every action checks the actor and owner;
-- no public or authenticated caller may invoke this privileged function directly.
create or replace function public.vault_intake_execute_v1(p_actor_user_id uuid,p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public
as $$
#variable_conflict use_variable
declare
  uid uuid := p_actor_user_id;
  lot public.purchase_lots%rowtype;
  batch public.vault_intake_batches%rowtype;
  item public.vault_intake_items%rowtype;
  copy public.vault_item_instances%rowtype;
  entry jsonb;
  result jsonb;
  copies jsonb := '[]'::jsonb;
  item_ids uuid[] := '{}';
  created_ids uuid[];
  entry_id uuid;
  lot_id uuid;
  batch_id uuid;
  quantity integer;
  i integer;
  cents bigint;
  assigned bigint;
  next_total bigint;
  next_currency text;
  costs jsonb;
  snapshot jsonb;
  state_revision integer;
  request_id uuid;
  sale public.vault_item_instance_dispositions%rowtype;
  sale_meta public.vault_intake_sales_v1%rowtype;
  sale_amount numeric;
  sale_expenses numeric;
  sale_currency text;
  sale_date date;
  sale_buyer text;
begin
  if auth.role() is distinct from 'service_role' or uid is null then
    raise exception 'service_role_and_actor_required' using errcode='42501';
  end if;
  perform set_config('request.jwt.claim.sub',uid::text,true);
  if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'invalid_payload'; end if;

  if p_action in ('lot.save','batch.save') and p_payload ? 'tags' and
     (jsonb_typeof(p_payload->'tags') is distinct from 'array' or jsonb_array_length(p_payload->'tags')>40) then raise exception 'invalid_tags'; end if;
  if p_action='batch.save' and p_payload ? 'snapshot' and jsonb_typeof(p_payload->'snapshot') is distinct from 'object' then raise exception 'invalid_snapshot'; end if;
  if p_action='batch.save' and coalesce(p_payload->'snapshot','{}'::jsonb) ? 'items' and jsonb_typeof(p_payload->'snapshot'->'items') is distinct from 'array' then raise exception 'invalid_items'; end if;

  if p_action='lot.save' then
    lot_id := (p_payload->>'id')::uuid;
    perform pg_advisory_xact_lock(hashtextextended('collector-intake-lot:'||coalesce(lot_id::text,''),0));
    select * into lot from public.purchase_lots where id=lot_id for update;
    if found and lot.user_id<>uid then raise exception 'not_found' using errcode='P0002'; end if;
    if found and lot.revision<>coalesce((p_payload->>'revision')::integer,0) then raise exception 'revision_conflict' using errcode='40001'; end if;
    next_total := (p_payload->>'total_cost_cents')::bigint;
    next_currency := coalesce(p_payload->>'currency','USD');
    select coalesce(sum(round(acquisition_cost*100)),0)::bigint into assigned
      from public.vault_item_instances where user_id=uid and acquisition_lot_id=lot_id;
    if lot.id is not null and next_currency<>lot.currency and exists(select 1 from public.vault_item_instances where acquisition_lot_id=lot_id) then raise exception 'lot_currency_locked'; end if;
    if next_total is not null and next_total<assigned then raise exception 'total_below_allocated_cost'; end if;
    insert into public.purchase_lots(id,user_id,name,purchased_on,currency,total_cost_cents,reserve_cents,is_complete,source,notes,tags)
    values(lot_id,uid,p_payload->>'name',(p_payload->>'purchased_on')::date,next_currency,next_total,
      case when next_total is null then 0 else next_total-assigned end,coalesce((p_payload->>'is_complete')::boolean,false),
      nullif(p_payload->>'source',''),nullif(p_payload->>'notes',''),array(select jsonb_array_elements_text(coalesce(p_payload->'tags','[]'))))
    on conflict(id) do update set name=excluded.name,purchased_on=excluded.purchased_on,total_cost_cents=excluded.total_cost_cents,
      reserve_cents=excluded.reserve_cents,is_complete=excluded.is_complete,source=excluded.source,notes=excluded.notes,tags=excluded.tags,
      currency=excluded.currency,revision=purchase_lots.revision+1,updated_at=now()
    where purchase_lots.user_id=uid and purchase_lots.revision=coalesce((p_payload->>'revision')::integer,0)
    returning * into lot;
    if not found then raise exception 'revision_conflict' using errcode='40001'; end if;
    return to_jsonb(lot);

  elsif p_action='lots.list' then
    return coalesce((select jsonb_agg(to_jsonb(l) order by l.purchased_on desc,l.created_at desc) from public.purchase_lots l where l.user_id=uid),'[]');

  elsif p_action='batches.list' then
    return coalesce((select jsonb_agg(to_jsonb(b)-'snapshot' order by b.updated_at desc) from public.vault_intake_batches b where b.user_id=uid and b.state<>'saved'),'[]');

  elsif p_action='batch.get' then
    select * into batch from public.vault_intake_batches where id=(p_payload->>'id')::uuid and user_id=uid;
    if not found then raise exception 'not_found' using errcode='P0002'; end if;
    return to_jsonb(batch) || jsonb_build_object('saved_items',coalesce((select jsonb_agg(jsonb_build_object('item_id',v.id,'instance_ids',v.saved_instance_ids) order by v.created_at,v.id) from public.vault_intake_items v where v.batch_id=batch.id and v.saved_at is not null),'[]'));

  elsif p_action='batch.save' then
    batch_id := (p_payload->>'id')::uuid;
    perform pg_advisory_xact_lock(hashtextextended('collector-intake-batch:'||coalesce(batch_id::text,''),0));
    lot_id := (p_payload->>'lot_id')::uuid;
    select * into batch from public.vault_intake_batches where id=batch_id for update;
    if found and batch.user_id<>uid then raise exception 'not_found' using errcode='P0002'; end if;
    if batch.state='saved' then return to_jsonb(batch); end if;
    snapshot := coalesce(p_payload->'snapshot','{}');
    if batch.id is not null and batch.revision<>coalesce((p_payload->>'revision')::integer,0) then
      -- Identical retry after a lost response; newer edits still conflict.
      if batch.snapshot=snapshot and batch.lot_id is not distinct from lot_id and batch.title=p_payload->>'title' and batch.currency=p_payload->>'currency' and batch.acquired_on=(p_payload->>'acquired_on')::date and to_jsonb(batch.tags)=coalesce(p_payload->'tags','[]') then return to_jsonb(batch); end if;
      raise exception 'revision_conflict' using errcode='40001';
    end if;
    if lot_id is not null then
      select * into lot from public.purchase_lots where id=lot_id and user_id=uid;
      if not found then raise exception 'not_found' using errcode='P0002'; end if;
      if lot.currency<>p_payload->>'currency' then raise exception 'currency_mismatch'; end if;
    end if;
    if jsonb_array_length(coalesce(snapshot->'items','[]'))>500 then raise exception 'batch_too_large'; end if;
    if exists(select 1 from public.vault_intake_items v where v.batch_id=batch_id and v.user_id=uid and v.saved_at is not null) and
       (batch.lot_id is distinct from lot_id or batch.currency<>p_payload->>'currency') then raise exception 'saved_batch_origin_locked'; end if;
    insert into public.vault_intake_batches(id,user_id,lot_id,title,currency,acquired_on,tags,snapshot)
    values(batch_id,uid,lot_id,p_payload->>'title',p_payload->>'currency',(p_payload->>'acquired_on')::date,
      array(select jsonb_array_elements_text(coalesce(p_payload->'tags','[]'))),snapshot)
    on conflict(id) do update set lot_id=excluded.lot_id,title=excluded.title,currency=excluded.currency,acquired_on=excluded.acquired_on,
      tags=excluded.tags,snapshot=excluded.snapshot,revision=vault_intake_batches.revision+1,updated_at=now()
    where vault_intake_batches.user_id=uid and vault_intake_batches.revision=coalesce((p_payload->>'revision')::integer,0)
    returning * into batch;
    if not found then raise exception 'revision_conflict' using errcode='40001'; end if;
    for entry in select value from jsonb_array_elements(coalesce(snapshot->'items','[]')) loop
      entry_id := (entry->>'id')::uuid;
      if exists(select 1 from public.vault_intake_items v where v.id=entry_id and (v.user_id<>uid or v.batch_id<>batch_id)) then raise exception 'item_origin_conflict'; end if;
      insert into public.vault_intake_items(id,batch_id,user_id,payload) values(entry_id,batch_id,uid,entry)
      on conflict(id) do update set payload=case when vault_intake_items.saved_at is null then excluded.payload else vault_intake_items.payload end
        where vault_intake_items.user_id=uid and vault_intake_items.batch_id=batch_id;
      if not found then raise exception 'item_origin_conflict'; end if;
    end loop;
    update public.vault_intake_items v set payload=jsonb_set(v.payload,'{state}','"removed"') where v.batch_id=batch.id and v.saved_at is null
      and not exists(select 1 from jsonb_array_elements(coalesce(snapshot->'items','[]')) e where (e->>'id')::uuid=v.id);
    return to_jsonb(batch);

  elsif p_action='batch.commit' then
    batch_id := (p_payload->>'id')::uuid;
    select * into batch from public.vault_intake_batches b where b.id=batch_id and b.user_id=uid for update;
    if not found then raise exception 'not_found' using errcode='P0002'; end if;
    select r.result into result from public.vault_intake_commit_receipts_v1 r where r.batch_id=batch.id and r.user_id=uid and r.request_revision=coalesce((p_payload->>'revision')::integer,0);
    if found then return result; end if;
    if batch.state='saved' then
      return jsonb_build_object('batch',to_jsonb(batch),'saved_items',coalesce((select jsonb_agg(jsonb_build_object('item_id',v.id,'instance_ids',v.saved_instance_ids) order by v.created_at,v.id) from public.vault_intake_items v where v.batch_id=batch.id and v.saved_at is not null),'[]'));
    end if;
    if (select coalesce(sum((v.payload->>'quantity')::integer),0) from public.vault_intake_items v where v.batch_id=batch.id and v.payload->>'state'='confirmed')>500 then raise exception 'batch_copy_limit'; end if;
    -- Same batch lock serializes retries and creates at most one set of copies.
    if batch.lot_id is not null then
      select * into lot from public.purchase_lots l where l.id=batch.lot_id and l.user_id=uid for update;
      if not found then raise exception 'not_found' using errcode='P0002'; end if;
      if lot.currency is distinct from batch.currency then raise exception 'currency_mismatch'; end if;
    end if;
    if batch.revision<>coalesce((p_payload->>'revision')::integer,0) and batch.state<>'saved' then raise exception 'revision_conflict' using errcode='40001'; end if;
    for item in select * from public.vault_intake_items v where v.batch_id=batch.id and v.user_id=uid order by v.created_at,v.id for update loop
      if item.saved_at is not null then
        item_ids := array_append(item_ids,item.id);
        copies := copies || jsonb_build_array(jsonb_build_object('item_id',item.id,'instance_ids',item.saved_instance_ids));
        continue;
      end if;
      entry := item.payload;
      if entry->>'state' is distinct from 'confirmed' then continue; end if;
      quantity := (entry->>'quantity')::integer;
      if quantity is null or quantity<1 or quantity>100 then raise exception 'invalid_quantity'; end if;
      if entry->>'card_id' is null then raise exception 'card_required'; end if;
      costs := coalesce(entry->'copy_costs_cents','[]');
      if jsonb_array_length(costs) not in (0,quantity) then raise exception 'cost_count_mismatch'; end if;
      if lot.total_cost_cents is not null and (jsonb_array_length(costs)=0 or coalesce((batch.snapshot->>'allocation_reviewed')::boolean,false)=false) then raise exception 'allocation_review_required'; end if;
      if lot.total_cost_cents is not null and (entry->'allocation'->>'lot_revision')::integer is distinct from lot.revision then raise exception 'lot_changed_review_costs_again' using errcode='40001'; end if;
      created_ids := '{}';
      for i in 0..quantity-1 loop
        cents := case when costs->i='null'::jsonb then null else (costs->>i)::bigint end;
        if cents<0 or cents>100000000000 then raise exception 'invalid_cost'; end if;
        result := public.vault_add_card_instance_v1((entry->>'card_id')::uuid,1,nullif(entry->>'condition','Unspecified'),nullif(entry->>'notes',''),
          entry->>'name',entry->>'set_code',null,(entry->>'card_printing_id')::uuid);
        select * into copy from public.vault_item_instances v where v.gv_vi_id=result->>'gv_vi_id' and v.user_id=uid for update;
        if not found then raise exception 'copy_creation_failed'; end if;
        update public.vault_item_instances set acquisition_lot_id=batch.lot_id,intake_item_id=item.id,
          acquired_on=batch.acquired_on,acquisition_currency=batch.currency,acquisition_cost=case when cents is null then null else cents::numeric/100 end,
          intake_tags=batch.tags,intake_allocation=coalesce(entry->'allocation','{}')
        where id=copy.id and user_id=uid;
        insert into public.vault_intake_allocation_events(user_id,lot_id,batch_id,instance_id,next_cost,reason,snapshot)
        values(uid,batch.lot_id,batch.id,copy.id,case when cents is null then null else cents::numeric/100 end,'intake',coalesce(entry->'allocation','{}'));
        created_ids := array_append(created_ids,copy.id);
      end loop;
      update public.vault_intake_items v set saved_instance_ids=created_ids,saved_at=now() where v.id=item.id;
      item_ids := array_append(item_ids,item.id);
      copies := copies || jsonb_build_array(jsonb_build_object('item_id',item.id,'instance_ids',created_ids));
    end loop;
    if batch.lot_id is not null then
      select coalesce(sum(round(v.acquisition_cost*100)),0)::bigint into assigned from public.vault_item_instances v where v.user_id=uid and v.acquisition_lot_id=lot.id;
      if lot.total_cost_cents is not null and assigned>lot.total_cost_cents then raise exception 'allocation_exceeds_lot_total'; end if;
      update public.purchase_lots l set reserve_cents=case when total_cost_cents is null then 0 else total_cost_cents-assigned end,revision=revision+1,updated_at=now() where l.id=lot.id;
    end if;
    update public.vault_intake_batches b set state=case when exists(select 1 from public.vault_intake_items v where v.batch_id=b.id and v.saved_at is null and v.payload->>'state' is distinct from 'removed') then 'partial' else 'saved' end,
      revision=revision+1,updated_at=now() where b.id=batch.id returning * into batch;
    result:=jsonb_build_object('batch',to_jsonb(batch),'saved_items',copies);
    insert into public.vault_intake_commit_receipts_v1(batch_id,request_revision,user_id,result) values(batch.id,coalesce((p_payload->>'revision')::integer,0),uid,result);
    return result;

  elsif p_action in ('lot.detail','copies.filter') then
    lot_id := (p_payload->>'lot_id')::uuid;
    if p_action='lot.detail' then
      select * into lot from public.purchase_lots l where l.id=lot_id and l.user_id=uid;
      if not found then raise exception 'not_found' using errcode='P0002'; end if;
    end if;
    select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]') into copies from (
      select v.id,v.gv_vi_id,v.card_print_id,v.card_printing_id,v.condition_label,v.acquisition_cost,v.acquisition_currency,v.acquired_on,v.intake_tags,v.acquisition_lot_id,
        v.intake_allocation,v.created_at,v.archived_at,cp.name,cp.gv_id,cp.set_code,cp.number,cp.image_url,
        s.sale_price_amount,s.sale_price_currency,s.selling_expenses_amount,s.sold_on
      from public.vault_item_instances v join public.card_prints cp on cp.id=v.card_print_id
      left join lateral (
        select d.sale_price_amount,d.sale_price_currency,coalesce(meta.selling_expenses_amount,0) as selling_expenses_amount,coalesce(meta.sold_on,d.created_at::date) as sold_on,0 as priority
        from public.vault_item_instance_dispositions d left join public.vault_intake_sales_v1 meta on meta.disposition_id=d.id and meta.user_id=uid where d.user_id=uid and d.vault_item_instance_id=v.id and d.disposition_type='sale'
        union all
        select o.price_amount,o.price_currency,0::numeric,o.created_at::date,1 from public.card_interaction_outcomes o
          where o.source_instance_id=v.id and o.outcome_type='sale' and o.source_user_id=uid
        order by priority limit 1
      ) s on true
      where v.user_id=uid and (lot_id is null or v.acquisition_lot_id=lot_id)
        and (p_payload->>'tag' is null or p_payload->>'tag'=any(v.intake_tags) or exists(select 1 from public.purchase_lots l where l.id=v.acquisition_lot_id and p_payload->>'tag'=any(l.tags)))
        and (p_payload->>'added_from' is null or v.created_at>=(p_payload->>'added_from')::timestamptz)
        and (p_payload->>'added_to' is null or v.created_at<(p_payload->>'added_to')::timestamptz)
        and (p_payload->>'purchased_from' is null or v.acquired_on>=(p_payload->>'purchased_from')::date)
        and (p_payload->>'purchased_to' is null or v.acquired_on<=(p_payload->>'purchased_to')::date)
      limit 10000
    ) q;
    return jsonb_build_object('lot',case when lot.id is null then null else to_jsonb(lot) end,'copies',copies);

  elsif p_action='allocation.revise' then
    select * into copy from public.vault_item_instances v where v.id=(p_payload->>'instance_id')::uuid and v.user_id=uid for update;
    if not found then raise exception 'not_found' using errcode='P0002'; end if;
    if copy.archived_at is not null then raise exception 'disposed_copy_cost_locked'; end if;
    if nullif(btrim(p_payload->>'reason'),'') is null then raise exception 'revision_reason_required'; end if;
    cents := (p_payload->>'cost_cents')::bigint;
    if cents<0 or cents>100000000000 then raise exception 'invalid_cost'; end if;
    if copy.acquisition_lot_id is not null then
      select * into lot from public.purchase_lots l where l.id=copy.acquisition_lot_id and l.user_id=uid for update;
      select coalesce(sum(round(v.acquisition_cost*100)),0)::bigint into assigned from public.vault_item_instances v where v.acquisition_lot_id=lot.id and v.id<>copy.id;
      if lot.total_cost_cents is not null and assigned+coalesce(cents,0)>lot.total_cost_cents then raise exception 'allocation_exceeds_lot_total'; end if;
      update public.purchase_lots l set reserve_cents=case when total_cost_cents is null then 0 else total_cost_cents-assigned-coalesce(cents,0) end,revision=revision+1,updated_at=now() where l.id=lot.id;
    end if;
    update public.vault_item_instances set acquisition_cost=case when cents is null then null else cents::numeric/100 end where id=copy.id;
    insert into public.vault_intake_allocation_events(user_id,lot_id,instance_id,previous_cost,next_cost,reason,snapshot)
    values(uid,copy.acquisition_lot_id,copy.id,copy.acquisition_cost,case when cents is null then null else cents::numeric/100 end,p_payload->>'reason',coalesce(p_payload->'snapshot','{}'));
    return jsonb_build_object('saved',true);

  elsif p_action='sale.record' then
    request_id := (p_payload->>'request_id')::uuid;
    if request_id is null then raise exception 'request_id_required'; end if;
    sale_amount := (p_payload->>'amount')::numeric;
    sale_expenses := coalesce((p_payload->>'expenses')::numeric,0);
    sale_currency := upper(btrim(p_payload->>'currency'));
    sale_date := (p_payload->>'sold_on')::date;
    sale_buyer := nullif(btrim(p_payload->>'buyer'),'');
    if (sale_amount>0 and sale_amount<=1000000000 and sale_amount*100=trunc(sale_amount*100)) is not true then raise exception 'invalid_sale_amount'; end if;
    if (sale_expenses between 0 and 1000000000 and sale_expenses*100=trunc(sale_expenses*100)) is not true then raise exception 'invalid_sale_expenses'; end if;
    if (sale_currency in ('USD','CAD','EUR','GBP','AUD','NZD','CHF')) is not true then raise exception 'invalid_sale_currency'; end if;
    perform pg_advisory_xact_lock(hashtextextended('collector-intake-sale:'||request_id::text,0));
    select * into sale_meta from public.vault_intake_sales_v1 m where m.request_id=request_id;
    if found then
      select * into sale from public.vault_item_instance_dispositions d where d.id=sale_meta.disposition_id;
      if sale_meta.user_id is distinct from uid or sale.user_id is distinct from uid or sale.vault_item_instance_id is distinct from (p_payload->>'instance_id')::uuid or
        sale.sale_price_amount is distinct from sale_amount or sale.sale_price_currency is distinct from sale_currency or
        sale.counterparty_label is distinct from sale_buyer or sale_meta.selling_expenses_amount is distinct from sale_expenses or
        (sale_date is not null and sale_meta.sold_on is distinct from sale_date) then raise exception 'request_conflict'; end if;
      return to_jsonb(sale)||jsonb_build_object('selling_expenses_amount',sale_meta.selling_expenses_amount,'sold_on',sale_meta.sold_on,'intake_sale_request_id',request_id);
    end if;
    result := public.vault_record_exact_instance_disposition_v2((p_payload->>'instance_id')::uuid,'sale',sale_amount,sale_currency,sale_buyer);
    select * into sale from public.vault_item_instance_dispositions d where d.id=(result->>'disposition_id')::uuid and d.user_id=uid;
    if not found then raise exception 'sale_readback_failed'; end if;
    insert into public.vault_intake_sales_v1(request_id,user_id,disposition_id,selling_expenses_amount,sold_on)
      values(request_id,uid,sale.id,sale_expenses,coalesce(sale_date,current_date)) returning * into sale_meta;
    return to_jsonb(sale)||jsonb_build_object('selling_expenses_amount',sale_meta.selling_expenses_amount,'sold_on',sale_meta.sold_on,'intake_sale_request_id',request_id);
  end if;
  raise exception 'unsupported_intake_action' using errcode='22023';
end;
$$;
revoke all on function public.vault_intake_execute_v1(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.vault_intake_execute_v1(uuid,text,jsonb) from service_role;

notify pgrst,'reload schema';

-- The executor is private even to direct service-role RPC callers. Only this
-- owner-definer wrapper can call it and persist accepted-request outcomes.
revoke all on function public.vault_intake_execute_v1(uuid,text,jsonb) from public,anon,authenticated,service_role;
revoke all on public.purchase_lots,public.vault_intake_batches,public.vault_intake_items,public.vault_intake_allocation_events from service_role;
grant select on public.purchase_lots,public.vault_intake_batches,public.vault_intake_items,public.vault_intake_allocation_events to service_role;

create or replace function public.vault_intake_request_v1(p_actor_user_id uuid,p_action text,p_payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path=public as $function$
declare
  operation_id uuid:=gen_random_uuid();
  started timestamptz:=clock_timestamp();
  stage text:='validate_payload';
  result jsonb;
  code text;
  state text;
  message text;
  subject uuid;
  key text;
  safe_action text:=left(coalesce(nullif(p_action,''),'unknown'),80);
  summary jsonb:='{}';
begin
  if auth.role() is distinct from 'service_role' or p_actor_user_id is null then raise exception 'service_role_and_actor_required' using errcode='42501'; end if;
  perform 1 from auth.users where id=p_actor_user_id for key share;
  if not found then raise exception 'actor_not_found' using errcode='42501'; end if;
  perform set_config('request.jwt.claim.sub',p_actor_user_id::text,true);
  key:=encode(sha256(convert_to('collector_reviewed_intake_v1|'||p_actor_user_id::text||'|'||coalesce(p_action,'')||'|'||coalesce(p_payload::text,'null'),'UTF8')),'hex');
  if coalesce(p_payload->>'id','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then subject:=(p_payload->>'id')::uuid; end if;
  begin
    if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'invalid_payload' using errcode='22023'; end if;
    if octet_length(p_payload::text)>4000000 then raise exception 'batch_too_large' using errcode='22023'; end if;
    if p_action is null or char_length(p_action)>80 then raise exception 'unsupported_intake_action' using errcode='22023'; end if;
    stage:='check_controls';
    if p_action in ('lot.save','batch.save','batch.commit','allocation.revise','sale.record') and not public.collector_intake_can_write_v1() then raise exception 'intake_writes_disabled' using errcode='55000'; end if;
    stage:='execute';
    result:=public.vault_intake_execute_v1(p_actor_user_id,p_action,p_payload);
    stage:='persist_success';
    summary:=jsonb_strip_nulls(jsonb_build_object('batch_id',result->'batch'->'id','result_id',case when jsonb_typeof(result)='object' then result->'id' else null end,
      'batch_state',result->'batch'->'state','result_count',case when jsonb_typeof(result)='array' then jsonb_array_length(result) else null end,
      'saved_item_count',case when jsonb_typeof(result->'saved_items')='array' then jsonb_array_length(result->'saved_items') else null end));
  exception when others then
    get stacked diagnostics state=returned_sqlstate,message=message_text;
    code:=case when message ~ '^[a-z][a-z0-9_]{1,79}$' then message else 'intake_request_failed' end;
    result:=null;
  end;
  insert into public.vault_intake_operations_v1(id,user_id,analysis_key,action,subject_id,status,stage,result_summary,error_code,error_detail,started_at,finished_at)
  values(operation_id,p_actor_user_id,key,safe_action,subject,case when code is null then 'succeeded' else 'failed' end,stage,
    case when code is null then summary else '{}'::jsonb end,code,
    case when code is null then '{}'::jsonb else jsonb_build_object('sqlstate',state,'action',safe_action,'stage',stage,'version','collector_reviewed_intake_v1') end,started,clock_timestamp());
  if code is not null then return jsonb_build_object('ok',false,'version',1,'operation_id',operation_id,'error',jsonb_build_object('code',code,'sqlstate',state)); end if;
  return jsonb_build_object('ok',true,'version',1,'operation_id',operation_id,'result',result);
end;
$function$;
revoke all on function public.vault_intake_request_v1(uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.vault_intake_request_v1(uuid,text,jsonb) to service_role;

notify pgrst,'reload schema';

commit;
