-- Forward repair for reviewed intake acquisition-date reporting.
-- The original 20261028020000 migration is immutable.
do $acquisition_date_guards$ declare actual text; begin
if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('collector_intake_can_write_v1','collector_intake_set_control_v1','guard_vault_intake_origin_v1','vault_intake_acquisition_instant_v1','vault_intake_execute_v1','vault_intake_request_v1') and format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) not in ('public.collector_intake_can_write_v1()','public.collector_intake_set_control_v1(bigint, boolean, uuid[])','public.guard_vault_intake_origin_v1()','public.vault_intake_acquisition_instant_v1(date, jsonb)','public.vault_intake_execute_v1(uuid, text, jsonb)','public.vault_intake_request_v1(uuid, text, jsonb)')) then raise exception 'reviewed_intake_date_overload_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p where p.oid=to_regprocedure('public.collector_intake_can_write_v1()')); if actual is null or (actual is not null and actual not in ('28586ecc3dff52101f7e9ad35678dd723d37d97bc57e54579b0e68bdc23df91f')) then raise exception 'reviewed_intake_date_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p where p.oid=to_regprocedure('public.collector_intake_set_control_v1(bigint, boolean, uuid[])')); if actual is null or (actual is not null and actual not in ('830ac2418d715c275aeae95fa991115b627745dcf70ae53f89af9cb29884b5ca')) then raise exception 'reviewed_intake_date_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p where p.oid=to_regprocedure('public.guard_vault_intake_origin_v1()')); if actual is null or (actual is not null and actual not in ('935e4a76d53ed456fefdf50e6896e75136f26c1e821b6812948f117cdcc0a46c')) then raise exception 'reviewed_intake_date_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p where p.oid=to_regprocedure('public.vault_intake_acquisition_instant_v1(date, jsonb)')); if (actual is not null and actual not in ('7b20c1db2492818b2923b2b4ecfa8425daf2320db6832cd8ed9d01f125549628')) then raise exception 'reviewed_intake_date_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p where p.oid=to_regprocedure('public.vault_intake_execute_v1(uuid, text, jsonb)')); if actual is null or (actual is not null and actual not in ('f0da35d9f4ad16eb449b92d1d878cceb3d2f187ab9a2be7f92e0a650197e3230','96ca7ccbf301761f343852af8e3a005468e51e03567619e1228474b207ab0be0')) then raise exception 'reviewed_intake_date_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p where p.oid=to_regprocedure('public.vault_intake_request_v1(uuid, text, jsonb)')); if actual is null or (actual is not null and actual not in ('f48b663f0b0df9a884855cb46e6714b84076f02c0ff1670a34e720b3bc8af261')) then raise exception 'reviewed_intake_date_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.collector_intake_control_events_v1_pkey')); if actual is null or (actual is not null and actual not in ('bff21c4bc367fd2b3b01bef6d40a2af1c789e1f153338b095a4f006d94d9b87f')) then raise exception 'reviewed_intake_date_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.collector_intake_controls_v1_pkey')); if actual is null or (actual is not null and actual not in ('2fe629564c2000de0b91df4bd3bd789f468891dfbd845a860af3467a8d9858fe')) then raise exception 'reviewed_intake_date_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.purchase_lots_owner_date_idx')); if actual is null or (actual is not null and actual not in ('fe18bba313e90b9c12022053049ae330d0ec722dba502fc41937277c44db925a')) then raise exception 'reviewed_intake_date_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.purchase_lots_pkey')); if actual is null or (actual is not null and actual not in ('c9a0334bfd265febe53daa3b68827986a155b6a24a9c11d0e5ffec983e7c2946')) then raise exception 'reviewed_intake_date_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.purchase_lots_tags_idx')); if actual is null or (actual is not null and actual not in ('e7db8c441216f1b9635940689ca424009f596bc81d8926d4fcb31f882e4e0605')) then raise exception 'reviewed_intake_date_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_instances_acquired_idx')); if actual is null or (actual is not null and actual not in ('577d749683bafaeb86a2049917fe31eee2d087335ddbf4d094a17cd1b9903df6')) then raise exception 'reviewed_intake_date_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_instances_intake_tags_idx')); if actual is null or (actual is not null and actual not in ('02937fb013547d4ee5f71ae924906aaab1fe988edb66388ef1bfc6b732969f95')) then raise exception 'reviewed_intake_date_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_instances_purchase_lot_idx')); if actual is null or (actual is not null and actual not in ('0f7c463aa123a5fbf0ca4e60ac3eadf3c138cf60ce2c404cb09a6708edf2ffe7')) then raise exception 'reviewed_intake_date_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_allocation_events_pkey')); if actual is null or (actual is not null and actual not in ('326a69a2580e55d90d285f7709baa8ab16e63ff6fe8f97a0a6967d57b3820e6a')) then raise exception 'reviewed_intake_date_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_batches_owner_idx')); if actual is null or (actual is not null and actual not in ('d5fa6b0ca7f0fc2d593f0726abc1440fe67030a6d430fc7e019f5942bc19fd7c')) then raise exception 'reviewed_intake_date_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_batches_pkey')); if actual is null or (actual is not null and actual not in ('d919b21cd5eec71b6f3a21847ea6816b4a300ad012918fc2c40484e431d3dc40')) then raise exception 'reviewed_intake_date_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_commit_receipts_v1_pkey')); if actual is null or (actual is not null and actual not in ('bb755b5fccb9ee6082f6f77a67fd21f6c7d882185177d8a649380deb715fa145')) then raise exception 'reviewed_intake_date_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_items_batch_idx')); if actual is null or (actual is not null and actual not in ('d9328a960144b601c94124d2766b2751a6ce052130873a5819231183f4fff085')) then raise exception 'reviewed_intake_date_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_items_pkey')); if actual is null or (actual is not null and actual not in ('dc3bcb9ffd6be56b85c359c2d82236f410c9de566d6db991ade83e301e4fc323')) then raise exception 'reviewed_intake_date_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_operations_analysis_idx')); if actual is null or (actual is not null and actual not in ('d84ad4ecab9140be29c26b79bbb2e3f7da6a892351737ddf0a1de1fc1ef29faf')) then raise exception 'reviewed_intake_date_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_operations_owner_time_idx')); if actual is null or (actual is not null and actual not in ('b5f7c01eb69e3fdb7acea793fef6e4b144ead6457a85dd7e2c66507a31f6073b')) then raise exception 'reviewed_intake_date_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_operations_v1_pkey')); if actual is null or (actual is not null and actual not in ('432f785c10883441e33b5af4b4e01a4f04d0345737654d7530db9085a370f83b')) then raise exception 'reviewed_intake_date_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_sales_v1_disposition_id_key')); if actual is null or (actual is not null and actual not in ('7ae1a345e1c6e70962b3b2167eade1e9129bea78f9e27874b20c13d6169af4db')) then raise exception 'reviewed_intake_date_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_sales_v1_pkey')); if actual is null or (actual is not null and actual not in ('14dae091de2ae717a51ba0bbbc06872053f4ddbf3f7d77f735747074c3a3fc98')) then raise exception 'reviewed_intake_date_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('command',p.polcmd,'permissive',p.polpermissive,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid),'roles',(select jsonb_agg(case when role_id=0 then 'public' else pg_get_userbyid(role_id) end order by role_id) from unnest(p.polroles) role_id)))::text,'UTF8')),'hex') from pg_policy p where p.polrelid='storage.objects'::regclass and p.polname='vault_intake_private_delete'); if actual is null or (actual is not null and actual not in ('d6fb0cc209d235e00338d390500eaf32e9b18cfbeb4cb66d75e674ee6d440634')) then raise exception 'reviewed_intake_date_policy_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('command',p.polcmd,'permissive',p.polpermissive,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid),'roles',(select jsonb_agg(case when role_id=0 then 'public' else pg_get_userbyid(role_id) end order by role_id) from unnest(p.polroles) role_id)))::text,'UTF8')),'hex') from pg_policy p where p.polrelid='storage.objects'::regclass and p.polname='vault_intake_private_insert'); if actual is null or (actual is not null and actual not in ('83032a35f551942048f826cc6cce03e6350d9515fd48beac6b0949680a82cc5c')) then raise exception 'reviewed_intake_date_policy_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('command',p.polcmd,'permissive',p.polpermissive,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid),'roles',(select jsonb_agg(case when role_id=0 then 'public' else pg_get_userbyid(role_id) end order by role_id) from unnest(p.polroles) role_id)))::text,'UTF8')),'hex') from pg_policy p where p.polrelid='storage.objects'::regclass and p.polname='vault_intake_private_select'); if actual is null or (actual is not null and actual not in ('9d8dea7099d26b59ca48b15cdabddc0e263332f32ae9febb147799137b2b2dca')) then raise exception 'reviewed_intake_date_policy_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('command',p.polcmd,'permissive',p.polpermissive,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid),'roles',(select jsonb_agg(case when role_id=0 then 'public' else pg_get_userbyid(role_id) end order by role_id) from unnest(p.polroles) role_id)))::text,'UTF8')),'hex') from pg_policy p where p.polrelid='storage.objects'::regclass and p.polname='vault_intake_private_update'); if actual is null or (actual is not null and actual not in ('90772c11876397fb32b27c9d033c4f4d555d8551361933ef6675c9c9abe12709')) then raise exception 'reviewed_intake_date_policy_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.collector_intake_control_events_v1')); if actual is null or (actual is not null and actual not in ('a688a9f74a4b6a495d49d727babb72e11dadce969c9418e2092e96e44fe60ed5')) then raise exception 'reviewed_intake_date_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.collector_intake_controls_v1')); if actual is null or (actual is not null and actual not in ('727ee598124f60fd2ff09b8cdfb3cea7dc336757db046b1c9137d8363690fc06')) then raise exception 'reviewed_intake_date_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.purchase_lots')); if actual is null or (actual is not null and actual not in ('f11710dcb06ec52d078680e2b1f74fc3740a6da8057e02f1ee56701db703fe84')) then raise exception 'reviewed_intake_date_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_allocation_events')); if actual is null or (actual is not null and actual not in ('50142e16a73d77eefed59d2b158f42e5d300ce328c675f6425f0c0e6b5a8166b')) then raise exception 'reviewed_intake_date_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_batches')); if actual is null or (actual is not null and actual not in ('ad60d57f850aee56814c05f58f86655ad356a2d495106039da20c086e46d6317')) then raise exception 'reviewed_intake_date_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_commit_receipts_v1')); if actual is null or (actual is not null and actual not in ('80d3e3ffb48c59a2971ab000de91b19013a9e00a00ea709d225ab8afa8f796b1')) then raise exception 'reviewed_intake_date_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_items')); if actual is null or (actual is not null and actual not in ('457572418ca665430c2e165debdd3e3ca60b5081c2d0b5ef4ff30a0f7fe490d7')) then raise exception 'reviewed_intake_date_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_operations_v1')); if actual is null or (actual is not null and actual not in ('3e3b895aac42782ca69c7ec4aa4a8fb02e77dbe2167195ec9c01b239bd4240a1')) then raise exception 'reviewed_intake_date_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.vault_intake_sales_v1')); if actual is null or (actual is not null and actual not in ('59705f5f6f08248c3958fee44a727ff236dcc73d5b41f92c55e04cdfa06f7591')) then raise exception 'reviewed_intake_date_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled))::text,'UTF8')),'hex') from pg_trigger t where t.tgrelid='public.vault_item_instances'::regclass and t.tgname='guard_vault_intake_origin_v1' and not t.tgisinternal); if actual is null or (actual is not null and actual not in ('23d7228ea5e91c8a419800e05225c612bb4ec7edb334217fc0e4c821bf6c5c7f')) then raise exception 'reviewed_intake_date_trigger_drift'; end if;
end $acquisition_date_guards$;

create or replace function public.vault_intake_acquisition_instant_v1(p_acquired_on date,p_snapshot jsonb)
returns timestamptz language plpgsql immutable set search_path=pg_catalog
as $acquisition_date$
declare instant timestamptz; offset_minutes integer; civil timestamp;
begin
  if p_acquired_on is null or not isfinite(p_acquired_on) or jsonb_typeof(p_snapshot) is distinct from 'object' then
    raise exception 'invalid_payload' using errcode='22007';
  end if;
  -- Old snapshots carry a calendar date only; retain their documented UTC basis.
  if not (p_snapshot ? 'acquired_at' or p_snapshot ? 'acquired_utc_offset_minutes') then
    return p_acquired_on::timestamp at time zone 'UTC';
  end if;
  if jsonb_typeof(p_snapshot->'acquired_at') is distinct from 'string' or
     jsonb_typeof(p_snapshot->'acquired_utc_offset_minutes') is distinct from 'number' or
     (p_snapshot->>'acquired_at') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,6})?Z$' or
     (p_snapshot->>'acquired_utc_offset_minutes') !~ '^-?[0-9]{1,4}$' then
    raise exception 'invalid_payload' using errcode='22007';
  end if;
  offset_minutes:=(p_snapshot->>'acquired_utc_offset_minutes')::integer;
  instant:=(p_snapshot->>'acquired_at')::timestamptz;
  civil:=(instant at time zone 'UTC') + make_interval(mins=>offset_minutes);
  if not isfinite(instant) or offset_minutes not between -840 and 840 or
     civil::date is distinct from p_acquired_on then
    raise exception 'invalid_payload' using errcode='22007';
  end if;
  return instant;
end;
$acquisition_date$;
revoke all on function public.vault_intake_acquisition_instant_v1(date,jsonb) from public,anon,authenticated,service_role;

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
          acquired_on=batch.acquired_on,acquisition_date=public.vault_intake_acquisition_instant_v1(batch.acquired_on,batch.snapshot),acquisition_currency=batch.currency,acquisition_cost=case when cents is null then null else cents::numeric/100 end,
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

-- Repair only committed reviewed-intake copies. Existing non-intake copies and
-- explicit established acquisition dates remain unchanged; the original writer
-- initialized acquisition_date to created_at, so that unchanged default is repairable.
do $acquisition_date_backfill$
begin
  if exists(select 1 from public.vault_item_instances i
    where i.intake_item_id is not null and (i.acquisition_date is null or i.acquisition_date=i.created_at) and
      (i.acquired_on is null or not exists(select 1 from public.vault_intake_items item
        join public.vault_intake_batches b on b.id=item.batch_id and b.user_id=item.user_id
        where item.id=i.intake_item_id and item.user_id=i.user_id and item.saved_at is not null
          and i.id=any(item.saved_instance_ids)))) then
    raise exception 'reviewed_intake_date_origin_drift';
  end if;
end;
$acquisition_date_backfill$;
update public.vault_item_instances i
set acquisition_date=public.vault_intake_acquisition_instant_v1(i.acquired_on,b.snapshot)
from public.vault_intake_items item
join public.vault_intake_batches b on b.id=item.batch_id and b.user_id=item.user_id
where i.intake_item_id=item.id and i.user_id=item.user_id and item.saved_at is not null
  and i.id=any(item.saved_instance_ids) and (i.acquisition_date is null or i.acquisition_date=i.created_at)
  and i.acquisition_date is distinct from public.vault_intake_acquisition_instant_v1(i.acquired_on,b.snapshot);
notify pgrst,'reload schema';
