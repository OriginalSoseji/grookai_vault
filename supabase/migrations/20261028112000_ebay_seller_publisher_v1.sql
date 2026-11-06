-- Isolated candidate. All provider write controls start off. No existing copy
-- or seller credential is migrated, published, disposed, or reclassified.
begin;

-- BEGIN EXACT SELLER OBJECT GUARDS
set local search_path=pg_catalog,public,extensions;
do $ebay_seller_object_guards$ declare actual text; begin
if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'ebay_seller_%_v1' and format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) not in ('public.ebay_seller_account_status_v1()','public.ebay_seller_assert_enabled_v1(uuid, text)','public.ebay_seller_copy_identity_v1(vault_item_instances)','public.ebay_seller_draft_action_v1(uuid, uuid, uuid, bigint, text)','public.ebay_seller_draft_status_v1(uuid)','public.ebay_seller_guard_disposition_v1()','public.ebay_seller_guard_parent_delete_v1()','public.ebay_seller_guard_reserved_copy_v1()','public.ebay_seller_guard_reserved_slab_v1()','public.ebay_seller_oauth_claim_v1(text, text, uuid, boolean)','public.ebay_seller_oauth_complete_v1(uuid, uuid, text, text, text, text, timestamp with time zone, text[], timestamp with time zone)','public.ebay_seller_oauth_fail_v1(uuid, uuid, boolean, text)','public.ebay_seller_oauth_launch_v1(text, text, text)','public.ebay_seller_oauth_start_v1(uuid, text)','public.ebay_seller_operation_checkpoint_v1(uuid, uuid, uuid, text, text, jsonb)','public.ebay_seller_operation_claim_v1(uuid, uuid, uuid, text, bigint, text, uuid)','public.ebay_seller_operation_complete_v1(uuid, uuid, uuid, jsonb, text)','public.ebay_seller_operation_fail_v1(uuid, uuid, uuid, boolean, text)','public.ebay_seller_operation_lock_v1(uuid, uuid, uuid)','public.ebay_seller_operation_resume_v1(uuid, uuid, uuid)','public.ebay_seller_operation_yield_v1(uuid, uuid, uuid)','public.ebay_seller_photo_path_authorized_v1(text, boolean)','public.ebay_seller_photo_receipt_v1(uuid, uuid, uuid, uuid, text, jsonb)','public.ebay_seller_photo_uploaded_v1(ebay_seller_photos_v1)','public.ebay_seller_record_sale_v1(uuid, uuid, bigint, integer, boolean)','public.ebay_seller_register_photo_v1(uuid, uuid, uuid, bigint)','public.ebay_seller_remove_photo_v1(uuid, uuid, uuid, bigint)','public.ebay_seller_require_actor_v1(uuid)','public.ebay_seller_require_service_v1()','public.ebay_seller_save_draft_v1(uuid, uuid, uuid, uuid, bigint, jsonb)','public.ebay_seller_set_control_v1(bigint, boolean, boolean, boolean, uuid[])','public.ebay_seller_slab_evidence_v1(uuid)','public.ebay_seller_token_claim_v1(uuid, uuid, uuid)','public.ebay_seller_token_complete_v1(uuid, uuid, uuid, bigint, text, timestamp with time zone, text, timestamp with time zone)','public.ebay_seller_token_fail_v1(uuid, uuid, uuid, bigint, boolean, text)','public.ebay_seller_workspace_v1(uuid)')) then raise exception 'ebay_seller_function_overload_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_account_status_v1()'); if actual is not null and actual not in ('d99a8d48e8347d2d3fbf14e7559b82e1af620fb09d24a0558d86ce171bfc1a66') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_assert_enabled_v1(uuid, text)'); if actual is not null and actual not in ('270ae4f2f89985dea6eb1bacb87be21f105524d0313035677b7dcb063736c005') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_copy_identity_v1(vault_item_instances)'); if actual is not null and actual not in ('641cd0011466f2393b13fdc709a61084a00dff31584a7d05ff9e2dfdba749359') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_draft_action_v1(uuid, uuid, uuid, bigint, text)'); if actual is not null and actual not in ('bf1cd43579484b8e207fe345f58aa6805b9777df4d82f3460ebde8dc1611499c') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_draft_status_v1(uuid)'); if actual is not null and actual not in ('6aaf7f9fc2034c44560f9ff99dcec0b9a399414f5e7bd8e9b54bf9a2ea890bf2') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_guard_disposition_v1()'); if actual is not null and actual not in ('7d68a4b6f1b905b7d878c714c1fadef1e265c7772aed57dafc361b2d1891e407') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_guard_parent_delete_v1()'); if actual is not null and actual not in ('5217481320adf8cd574f81a998d8da62389f3c8f046fe4da9da82a87dde4f027') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_guard_reserved_copy_v1()'); if actual is not null and actual not in ('adc24a3dad056e34f6fddc5a71f21fc1f59fdfbf60821a1265a84dac1acca47a') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_guard_reserved_slab_v1()'); if actual is not null and actual not in ('dbc1432bbc1a6b3d6176fd194a3eab5fd30c53c496e6cb3f8cca227e936e31cb') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_oauth_claim_v1(text, text, uuid, boolean)'); if actual is not null and actual not in ('d0e9e9ed6de148818581f2e37a6bd40d1b9c449e6f706d874d26598ce0865458') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_oauth_complete_v1(uuid, uuid, text, text, text, text, timestamp with time zone, text[], timestamp with time zone)'); if actual is not null and actual not in ('d0f6709775f2ab5e11f859b90c0b4e573416bea59791e9f9cd33ffa462cf2bdc') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_oauth_fail_v1(uuid, uuid, boolean, text)'); if actual is not null and actual not in ('5472f6d8dc16449ea5088b588704540c6dd87828d7de7b19204193779f799d78') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_oauth_launch_v1(text, text, text)'); if actual is not null and actual not in ('69a530047109cb7f3771dd57e8b3c112d4691447c7c11c34c596fbff14aa4c0d') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_oauth_start_v1(uuid, text)'); if actual is not null and actual not in ('d3b51c404be3db398858de50ac76896fc775965553eb5de4843233553b8fb6f9') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_operation_checkpoint_v1(uuid, uuid, uuid, text, text, jsonb)'); if actual is not null and actual not in ('d56c1b2e5a32e331725fe1d56b690ff625c003cba243b0a2b4ae8c5adb902eba') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_operation_claim_v1(uuid, uuid, uuid, text, bigint, text, uuid)'); if actual is not null and actual not in ('b77af0d86178832cc2368abadefc4c4806abca1e45c728bcc697a373cde16828') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_operation_complete_v1(uuid, uuid, uuid, jsonb, text)'); if actual is not null and actual not in ('242fdebc08baa304460d764ae0b8e8eec17530393b83454028bd550d2b227bad') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_operation_fail_v1(uuid, uuid, uuid, boolean, text)'); if actual is not null and actual not in ('4347a1d6b00bb5b19720401b5d108cf4393bf55f8fc831341299cd126cfa2755') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_operation_lock_v1(uuid, uuid, uuid)'); if actual is not null and actual not in ('138d271a9f1205b39a92a3fb95e5517d379f8e366cdff16ed5d97d8db08069b7') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_operation_resume_v1(uuid, uuid, uuid)'); if actual is not null and actual not in ('3bfadec28e1aa107a7b506dd6fee8602c679af238eb2100b14da125d72924b59') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_operation_yield_v1(uuid, uuid, uuid)'); if actual is not null and actual not in ('7ae1dff98d7de9c6d892b02ef00f8ad8ce4c95f65c51bb82155164fba39db2e3') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_photo_path_authorized_v1(text, boolean)'); if actual is not null and actual not in ('e5790862dd4da532e1328f94b11140a916bd20804aa29faf4028565ca4d18f2f') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_photo_receipt_v1(uuid, uuid, uuid, uuid, text, jsonb)'); if actual is not null and actual not in ('61f8e92bf269d086675a485dd46cd7c01f040983f701d0320768033ef741c28a') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_photo_uploaded_v1(ebay_seller_photos_v1)'); if actual is not null and actual not in ('f6cbe8c489b73856ae6a91c2bf266e163276dd66eee66f42c42e077268a60b21') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_record_sale_v1(uuid, uuid, bigint, integer, boolean)'); if actual is not null and actual not in ('a3376ac709e2dbba2d949f778054f2123b9f0bf3e9624487c83d46f706a3b534') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_register_photo_v1(uuid, uuid, uuid, bigint)'); if actual is not null and actual not in ('f5547cef11479d84774de7eb32f13a6a5cc41813142d6119a7ad0df5c5d5413a') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_remove_photo_v1(uuid, uuid, uuid, bigint)'); if actual is not null and actual not in ('dceb5f39ed1d827647fa01565849b7b2d6aaffbdc3ff4e5b98c59390e0a4e586') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_require_actor_v1(uuid)'); if actual is not null and actual not in ('3d7507139836cc9b510828d9d048a90b2b6e24cd2aee4815300c49c2db17450a') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_require_service_v1()'); if actual is not null and actual not in ('b08c65c60c21249e0383e059a6983bf0a48347907c41dacd2c0f3fc1b6adff4c') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_save_draft_v1(uuid, uuid, uuid, uuid, bigint, jsonb)'); if actual is not null and actual not in ('a6195833a050a6f66824f017dbeec3ce461d3054d4e88ecaceb79ede76bf6029') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_set_control_v1(bigint, boolean, boolean, boolean, uuid[])'); if actual is not null and actual not in ('2d69dd45be510bbee6d81bb854f6029ef02bc05fc4b6a8e61d38cd1f90b496f9') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_slab_evidence_v1(uuid)'); if actual is not null and actual not in ('1d0a4401f1772a1ce25df21e2488c4aaca3a4f0b3e45c24d2d5565b2c3dddae4') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_token_claim_v1(uuid, uuid, uuid)'); if actual is not null and actual not in ('2ba7e0a5d355c5d01a5709f1e97796600dd9bc096cd7654589944a770aa74b97') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_token_complete_v1(uuid, uuid, uuid, bigint, text, timestamp with time zone, text, timestamp with time zone)'); if actual is not null and actual not in ('9c5ea828dec381108c0eb77856765aa85f8c6c57732813ae72068af337656d48') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_token_fail_v1(uuid, uuid, uuid, bigint, boolean, text)'); if actual is not null and actual not in ('1efa03d80c09022adf88d8df2b148b9f80354bc6ab08291ce6af98695038c2db') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes))='public.ebay_seller_workspace_v1(uuid)'); if actual is not null and actual not in ('449bbfe678f84eac180dc739f70a69f74cc29e8419eb450a2f136b27fb1652ce') then raise exception 'ebay_seller_function_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_accounts_active_last_sync_idx')); if actual is not null and actual not in ('b0e8105155548954b32d11a9760719dda384005345496299194be13bec68e02d') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_accounts_pkey')); if actual is not null and actual not in ('fda4bbb632b1956bd6dd3ec3522fa9f71fbed2e703b27fb920aa7882f8ceab2c') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_accounts_provider_identity_v1')); if actual is not null and actual not in ('bfced1b3fb9016065d005421cb94ca9853de7ac0a52f124079c044e08ee21795') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_accounts_user_id_idx')); if actual is not null and actual not in ('8daabc268a74512bdd476893ad5335e3066c9e6ae3795c98a173c0b90d787bfd') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_accounts_verified_owner_v1')); if actual is not null and actual not in ('59d88377693c1627776614aaa263d3ca6691f875c22f9b7665804ca318349ba5') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_control_events_v1_pkey')); if actual is not null and actual not in ('6a8f1bb3c094b9339128512f0652099a24cd28d4a27076e2ef6e30b0fa02facd') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_controls_v1_pkey')); if actual is not null and actual not in ('2e590653caf29f595012b25a30a7cef683322fe52439b43299657a441e0ecae2') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_draft_owner_v1')); if actual is not null and actual not in ('9d08229981412bad5bd80280754f4da5c3879a90e00f28003457124d8c32922b') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_drafts_v1_id_user_id_key')); if actual is not null and actual not in ('39d6d8fc9991c9fdc247f8dfbcb8737186b59a552aa3e7c94d71b2a842e80921') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_drafts_v1_pkey')); if actual is not null and actual not in ('0c31f9bc8e8c3b90f1470c26b37b144d07a7919ad51bdbc2f91fa3fffa6837d0') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_oauth_attempts_v1_launch_hash_key')); if actual is not null and actual not in ('bf1aa23efb862e5650b37f209e8169702f3f5a0257d7c186ab85dd5ff6344671') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_oauth_attempts_v1_pkey')); if actual is not null and actual not in ('5d1b2d726f2142e9df6e421bd3c87a7d3a76d068cc7d0a3845eb27fed38874dc') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_oauth_attempts_v1_state_hash_key')); if actual is not null and actual not in ('05983d6779c9f3600a3f9e5c81cfa4c07a668b7e7f205755996259741ec43456') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_one_active_draft_v1')); if actual is not null and actual not in ('035ae4deec7507c812cf57fe44e64f18a6a57829723116518650f763f5dddc14') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_one_active_oauth_v1')); if actual is not null and actual not in ('f27efb64198e537a261c7242f522f120442c7d937563adde0d2dfba42a38f877') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_one_copy_reservation_v1')); if actual is not null and actual not in ('e7503ffc04ee2683bc30f43e87fc40b3df1890344a412ecd285e02150129e7bd') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_one_running_account_v1')); if actual is not null and actual not in ('2616674acbde246a61bd328c9d240f7e5f0220c273023744c74893f57f05a203') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_one_running_draft_v1')); if actual is not null and actual not in ('f5994f1acafd7a46e5cbaa1fa9c3f406f352d94d5b2277bf42d5a2d56f1ca730') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_operations_v1_pkey')); if actual is not null and actual not in ('e6f7d435d90e2d6653e42741dee9aa3e91b5b4f7a1376735dec8b799b8c81933') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_operations_v1_user_id_request_id_key')); if actual is not null and actual not in ('555e51740c7eb2911a80306824939c862ed1bc3f49be19eda5f147e975506f81') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_photo_draft_v1')); if actual is not null and actual not in ('1fa6b2cfc9841ed0d9277b0461aa849666d7e1c0e8d5f4812871f4203a166dc0') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_photos_v1_pkey')); if actual is not null and actual not in ('264297d432c90945bdf56ed293ea07a92700f2e7ca227f2a7310cd57707b3757') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_reservations_v1_pkey')); if actual is not null and actual not in ('080b4045a70515a35398430b0c78bacf02cef71c007dd98663b8717127cf9e2e') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_indexdef(c.oid),'owner',pg_get_userbyid(c.relowner)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_token_refreshes_v1_pkey')); if actual is not null and actual not in ('aa46624f0cf1c244f5e0b0ec36db5cfb2042719ba1a2a21f508e726f9aa2cc44') then raise exception 'ebay_seller_index_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('command',p.polcmd,'permissive',p.polpermissive,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid),'roles',(select jsonb_agg(case when role_id=0 then 'public' else pg_get_userbyid(role_id) end order by role_id) from unnest(p.polroles) role_id)))::text,'UTF8')),'hex') from pg_policy p where p.polrelid='storage.objects'::regclass and p.polname='ebay_seller_photo_delete_v1'); if actual is not null and actual not in ('6e9f3e6fcb71cef98fb3e3f895b1f2091f4bfe45c2a0f49139043541cbea317d') then raise exception 'ebay_seller_policy_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('command',p.polcmd,'permissive',p.polpermissive,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid),'roles',(select jsonb_agg(case when role_id=0 then 'public' else pg_get_userbyid(role_id) end order by role_id) from unnest(p.polroles) role_id)))::text,'UTF8')),'hex') from pg_policy p where p.polrelid='storage.objects'::regclass and p.polname='ebay_seller_photo_insert_v1'); if actual is not null and actual not in ('95f20aa4b203457724a58e7baf6abf17c982827078fe8229ff15835a1e609573') then raise exception 'ebay_seller_policy_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('command',p.polcmd,'permissive',p.polpermissive,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid),'roles',(select jsonb_agg(case when role_id=0 then 'public' else pg_get_userbyid(role_id) end order by role_id) from unnest(p.polroles) role_id)))::text,'UTF8')),'hex') from pg_policy p where p.polrelid='storage.objects'::regclass and p.polname='ebay_seller_photo_read_v1'); if actual is not null and actual not in ('3aba61f2a0a92dd86203dc3800850fa40aa2796fa9182a6e9b7c34ae8278ef26') then raise exception 'ebay_seller_policy_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('command',p.polcmd,'permissive',p.polpermissive,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid),'roles',(select jsonb_agg(case when role_id=0 then 'public' else pg_get_userbyid(role_id) end order by role_id) from unnest(p.polroles) role_id)))::text,'UTF8')),'hex') from pg_policy p where p.polrelid='storage.objects'::regclass and p.polname='ebay_seller_photo_update_v1'); if actual is not null and actual not in ('844da67153e4cc26893393b0e153050538389c954ad3066de59001af17760244') then raise exception 'ebay_seller_policy_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_accounts')); if actual is not null and actual not in ('954f750f63fde005d7f3c97639a50ee6a38e4b8e124a421a9672c4d97c54da8e','97568ea0752074877bb3c08b5e68e4ab9e1a83e1ec41796965f346f0e3a706bd') then raise exception 'ebay_seller_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_control_events_v1')); if actual is not null and actual not in ('d50143d5bb737dc4d6bbbfab72d187a765d82df74121f8cc5a149afeb3b7d655') then raise exception 'ebay_seller_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_controls_v1')); if actual is not null and actual not in ('6fe8d317158ef37ac2a2697a9f7f363dd1597dd36c9041a66dee1bbe78b5fb09') then raise exception 'ebay_seller_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_drafts_v1')); if actual is not null and actual not in ('4290154eddb543da2c6bbb1ef4e83598bf7b93c4780e081cc6d543607ab22bb7') then raise exception 'ebay_seller_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_oauth_attempts_v1')); if actual is not null and actual not in ('147807a4dd5a8c26568b4f8d3e86e53174f5d069e5abb0ef22a8e02814d20c04') then raise exception 'ebay_seller_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_operations_v1')); if actual is not null and actual not in ('c18292226152c9c5b44ea964241d11dbbbe6a9a4fb886e97f64a1c190b8a575e') then raise exception 'ebay_seller_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_photos_v1')); if actual is not null and actual not in ('d63f95fa01511dc5e619bf06bd16d095416119729722f37c05154ff1b49ea574') then raise exception 'ebay_seller_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_reservations_v1')); if actual is not null and actual not in ('bc4f3e1e028dd987d2684345bc3c1e314987335f0d737bf4458d0afb4b292e12') then raise exception 'ebay_seller_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',case when a.attcollation=0 then null else a.attcollation::regcollation::text end,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),
    'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)))::text,'UTF8')),'hex') from pg_class c where c.oid=to_regclass('public.ebay_seller_token_refreshes_v1')); if actual is not null and actual not in ('480636737d402d3e5179ea88e9a9f6181f4da50b26f5c205b1dbc34d4f239ada') then raise exception 'ebay_seller_table_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled))::text,'UTF8')),'hex') from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname||'.'||c.relname||'.'||t.tgname='auth.users.guard_ebay_seller_owner_delete_v1' and not t.tgisinternal); if actual is not null and actual not in ('e1e2ff50d5f5167518e89899ce5aca2b35020bca19a7d67902803a5528faae89') then raise exception 'ebay_seller_trigger_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled))::text,'UTF8')),'hex') from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname||'.'||c.relname||'.'||t.tgname='public.ebay_accounts.guard_ebay_seller_account_delete_v1' and not t.tgisinternal); if actual is not null and actual not in ('d947a7d85e3018651a68dfd23be0adf0959a35d2e3d247ad66b233b4ff8dadea') then raise exception 'ebay_seller_trigger_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled))::text,'UTF8')),'hex') from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname||'.'||c.relname||'.'||t.tgname='public.ebay_seller_drafts_v1.guard_ebay_seller_draft_delete_v1' and not t.tgisinternal); if actual is not null and actual not in ('2487e1f866cdc219df67e07b49517ea186e80f090401a634469427c9af8dd2f8') then raise exception 'ebay_seller_trigger_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled))::text,'UTF8')),'hex') from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname||'.'||c.relname||'.'||t.tgname='public.slab_certs.guard_ebay_seller_reserved_slab_v1' and not t.tgisinternal); if actual is not null and actual not in ('1df47bc8edff72e62f3d88eede2ee91823781cddc9443eef8f27f59d054e5a04') then raise exception 'ebay_seller_trigger_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled))::text,'UTF8')),'hex') from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname||'.'||c.relname||'.'||t.tgname='public.vault_item_instance_dispositions.guard_ebay_seller_disposition_v1' and not t.tgisinternal); if actual is not null and actual not in ('a6e9a64862fb9a29cbb74223b7708a1903022c34f5b51e9ccae731abc106bec9') then raise exception 'ebay_seller_trigger_drift'; end if;
actual:=(select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled))::text,'UTF8')),'hex') from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname||'.'||c.relname||'.'||t.tgname='public.vault_item_instances.guard_ebay_seller_reserved_copy_v1' and not t.tgisinternal); if actual is not null and actual not in ('9111a8cbec27ab4f9ad7ef15372e5089825e51ed7505a5abbbad44c87eba62ab') then raise exception 'ebay_seller_trigger_drift'; end if;
end $ebay_seller_object_guards$;
-- END EXACT SELLER OBJECT GUARDS


create table if not exists public.ebay_seller_controls_v1 (
  singleton boolean primary key default true check (singleton),
  linking_enabled boolean not null default false,
  preparation_enabled boolean not null default false,
  publication_enabled boolean not null default false,
  canary_actor_ids uuid[] not null default '{}',
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default clock_timestamp(),
  check (cardinality(canary_actor_ids) <= 10),
  check (not publication_enabled or preparation_enabled),
  check (not preparation_enabled or linking_enabled)
);
insert into public.ebay_seller_controls_v1(singleton) values(true) on conflict do nothing;

create table if not exists public.ebay_seller_control_events_v1 (
  id uuid primary key default gen_random_uuid(),
  previous_state jsonb not null,
  next_state jsonb not null,
  created_at timestamptz not null default clock_timestamp()
);

alter table public.ebay_accounts
  add column if not exists provider_user_id text,
  add column if not exists environment text not null default 'production',
  add column if not exists token_revision bigint not null default 1,
  add column if not exists token_state text not null default 'ready',
  add column if not exists refresh_token_expires_at timestamptz,
  add column if not exists refresh_claim uuid,
  add column if not exists refresh_lease_until timestamptz;

-- Legacy bindings with no verified immutable provider ID remain intact and
-- cannot be silently adopted by the new linking authority.
create unique index if not exists ebay_accounts_provider_identity_v1
  on public.ebay_accounts(environment, provider_user_id)
  where provider_user_id is not null;
create unique index if not exists ebay_accounts_verified_owner_v1
  on public.ebay_accounts(user_id, environment)
  where provider_user_id is not null;
revoke all on public.ebay_accounts from public, anon, authenticated;

create table if not exists public.ebay_seller_oauth_attempts_v1 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  environment text not null check (environment = 'production'),
  launch_hash text not null unique check (launch_hash ~ '^[a-f0-9]{64}$'),
  state_hash text unique check (state_hash ~ '^[a-f0-9]{64}$'),
  browser_hash text check (browser_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'created' check (status in
    ('created','launched','exchanging','linked','denied','failed','uncertain','superseded','expired')),
  expires_at timestamptz not null,
  claim_nonce uuid,
  lease_until timestamptz,
  account_id uuid references public.ebay_accounts(id) on delete set null,
  error_code text check (error_code is null or error_code ~ '^[a-z_]{1,80}$'),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (expires_at > created_at and expires_at <= created_at + interval '10 minutes 5 seconds'),
  check ((status = 'exchanging') = (claim_nonce is not null and lease_until is not null))
);
create unique index if not exists ebay_seller_one_active_oauth_v1
  on public.ebay_seller_oauth_attempts_v1(user_id, environment)
  where status in ('created','launched','exchanging');

create table if not exists public.ebay_seller_token_refreshes_v1 (
  claim_nonce uuid primary key,
  account_id uuid not null references public.ebay_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'running' check (status in ('running','succeeded','failed','uncertain')),
  started_revision bigint not null check (started_revision>0),
  completed_revision bigint,
  error_code text check (error_code ~ '^[a-z_]{1,80}$'),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check ((status in ('running','succeeded') and error_code is null)
    or (status in ('failed','uncertain') and error_code is not null))
);

create table if not exists public.ebay_seller_drafts_v1 (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  instance_id uuid not null references public.vault_item_instances(id) on delete cascade,
  account_id uuid not null references public.ebay_accounts(id) on delete cascade,
  sku text generated always as ('gv-' || id::text) stored,
  revision bigint not null default 1 check (revision > 0),
  state text not null default 'editing' check (state in ('editing','preparing','prepared',
    'publishing','live','withdrawn','ended','sale_reported','sold','uncertain','abandoned')),
  input jsonb not null default '{}' check (jsonb_typeof(input)='object' and octet_length(input::text)<=100000),
  copy_identity jsonb not null check (jsonb_typeof(copy_identity)='object'),
  prepared_snapshot jsonb check (jsonb_typeof(prepared_snapshot)='object' and octet_length(prepared_snapshot::text)<=1000000),
  review_hash text check (review_hash ~ '^[a-f0-9]{64}$'),
  prepared_revision bigint,
  fee_quote jsonb check (jsonb_typeof(fee_quote)='object' and octet_length(fee_quote::text)<=100000),
  offer_id text check (offer_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  listing_id text check (listing_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  error_code text check (error_code is null or error_code ~ '^[a-z_]{1,80}$'),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique(id,user_id),
  check (state not in ('prepared','publishing','live','sale_reported')
    or (offer_id is not null and review_hash is not null and prepared_snapshot is not null
      and fee_quote is not null and prepared_revision is not null and prepared_revision=revision)),
  check (state not in ('live','withdrawn','ended','sale_reported') or listing_id is not null)
);
create unique index if not exists ebay_seller_one_active_draft_v1
  on public.ebay_seller_drafts_v1(instance_id)
  where state not in ('withdrawn','ended','sold','abandoned');
create index if not exists ebay_seller_draft_owner_v1
  on public.ebay_seller_drafts_v1(user_id,updated_at desc);

create table if not exists public.ebay_seller_photos_v1 (
  id uuid primary key,
  draft_id uuid not null,
  user_id uuid not null,
  storage_path text generated always as (user_id::text||'/'||draft_id::text||'/'||id::text||'.jpg') stored,
  state text not null default 'awaiting_upload' check (state in
    ('awaiting_upload','ready','uploading','hosted','uncertain','removed')),
  source_sha256 text check (source_sha256 ~ '^[a-f0-9]{64}$'),
  image_id text check (char_length(image_id) between 1 and 512),
  image_url text check (image_url ~ '^https://i[.]ebayimg[.]com/images/[^?#]+$'),
  expires_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  foreign key(draft_id,user_id) references public.ebay_seller_drafts_v1(id,user_id) on delete cascade,
  check (state<>'hosted' or (source_sha256 is not null and image_id is not null
    and image_url is not null and expires_at is not null))
);
create index if not exists ebay_seller_photo_draft_v1 on public.ebay_seller_photos_v1(draft_id);

-- Registration alone is not an uploaded photo. Only Storage's committed,
-- owner-bound object metadata can make a registered private photo ready.
-- Decoding, dimensions and content hashes are still validated by the worker.
create or replace function public.ebay_seller_photo_uploaded_v1(p_photo public.ebay_seller_photos_v1)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from storage.objects o
    where o.bucket_id='ebay-listing-private' and o.name=p_photo.storage_path
      and coalesce(nullif(o.owner_id,''),o.owner::text)=p_photo.user_id::text
      and o.metadata->>'mimetype' in ('image/jpeg','image/png')
      and case when o.metadata->>'size' ~ '^[0-9]{1,10}$'
        then (o.metadata->>'size')::bigint between 1 and 16777216 else false end)
$$;

create table if not exists public.ebay_seller_operations_v1 (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  draft_id uuid not null,
  user_id uuid not null,
  account_id uuid not null references public.ebay_accounts(id) on delete cascade,
  kind text not null check (kind in ('prepare','publish','withdraw','reconcile','edit','abandon','record_sale')),
  status text not null default 'running' check (status in ('running','succeeded','failed','uncertain')),
  expected_revision bigint not null check (expected_revision>0),
  expected_hash text check (expected_hash ~ '^[a-f0-9]{64}$'),
  claim_nonce uuid not null default gen_random_uuid(),
  handoff_ready boolean not null default false,
  lease_until timestamptz not null,
  stage text not null default 'claimed' check (stage ~ '^[a-z_]{1,80}$'),
  snapshot jsonb not null check (jsonb_typeof(snapshot)='object' and octet_length(snapshot::text)<=1000000),
  receipts jsonb not null default '[]' check (jsonb_typeof(receipts)='array' and octet_length(receipts::text)<=1000000),
  error_code text check (error_code is null or error_code ~ '^[a-z_]{1,80}$'),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique(user_id,request_id),
  foreign key(draft_id,user_id) references public.ebay_seller_drafts_v1(id,user_id) on delete cascade
);
create unique index if not exists ebay_seller_one_running_draft_v1
  on public.ebay_seller_operations_v1(draft_id) where status='running';
create unique index if not exists ebay_seller_one_running_account_v1
  on public.ebay_seller_operations_v1(account_id) where status='running';

create table if not exists public.ebay_seller_reservations_v1 (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null,
  user_id uuid not null,
  instance_id uuid not null references public.vault_item_instances(id) on delete cascade,
  publication_operation_id uuid not null references public.ebay_seller_operations_v1(id) on delete cascade,
  released_at timestamptz,
  release_operation_id uuid references public.ebay_seller_operations_v1(id) on delete cascade,
  release_evidence jsonb check (jsonb_typeof(release_evidence)='object'),
  created_at timestamptz not null default clock_timestamp(),
  foreign key(draft_id,user_id) references public.ebay_seller_drafts_v1(id,user_id) on delete cascade,
  check ((released_at is null and release_operation_id is null and release_evidence is null)
    or (released_at is not null and release_operation_id is not null and release_evidence is not null))
);
create unique index if not exists ebay_seller_one_copy_reservation_v1
  on public.ebay_seller_reservations_v1(instance_id) where released_at is null;

create or replace function public.ebay_seller_copy_identity_v1(p_copy public.vault_item_instances)
returns jsonb language sql immutable security invoker set search_path = '' as $$
  select jsonb_build_object('id',p_copy.id,'card_print_id',p_copy.card_print_id,
    'card_printing_id',p_copy.card_printing_id,'slab_cert_id',p_copy.slab_cert_id,
    'condition_label',p_copy.condition_label,'is_graded',p_copy.is_graded,
    'grade_company',p_copy.grade_company,'grade_value',p_copy.grade_value,
    'grade_label',p_copy.grade_label,'gv_vi_id',p_copy.gv_vi_id)
$$;

create or replace function public.ebay_seller_guard_reserved_copy_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.ebay_seller_reservations_v1 r
      where r.instance_id=old.id and r.released_at is null)
    and (tg_op='DELETE' or (new.archived_at is distinct from old.archived_at
      or new.user_id is distinct from old.user_id or new.intent is distinct from old.intent
      or public.ebay_seller_copy_identity_v1(new) is distinct from public.ebay_seller_copy_identity_v1(old))) then
    raise exception 'seller_copy_reserved' using errcode='55000';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists guard_ebay_seller_reserved_copy_v1 on public.vault_item_instances;
create trigger guard_ebay_seller_reserved_copy_v1 before update or delete
  on public.vault_item_instances for each row execute function public.ebay_seller_guard_reserved_copy_v1();

create or replace function public.ebay_seller_slab_evidence_v1(p_slab_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',id,'grader',grader,'cert_number',cert_number,
    'card_print_id',card_print_id,'grade',grade,'qualifiers',qualifiers)
  from public.slab_certs where id=p_slab_id
$$;

create or replace function public.ebay_seller_guard_reserved_slab_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.ebay_seller_reservations_v1 r
      join public.vault_item_instances i on i.id=r.instance_id
      where i.slab_cert_id=old.id and r.released_at is null)
      and (tg_op='DELETE' or row(new.grader,new.cert_number,new.card_print_id,new.grade,new.qualifiers)
        is distinct from row(old.grader,old.cert_number,old.card_print_id,old.grade,old.qualifiers)) then
    raise exception 'seller_copy_reserved' using errcode='55000';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists guard_ebay_seller_reserved_slab_v1 on public.slab_certs;
create trigger guard_ebay_seller_reserved_slab_v1 before update or delete
  on public.slab_certs for each row execute function public.ebay_seller_guard_reserved_slab_v1();

create or replace function public.ebay_seller_guard_disposition_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.vault_item_instances where id=new.vault_item_instance_id for update;
  if exists(select 1 from public.ebay_seller_reservations_v1 r
      where r.instance_id=new.vault_item_instance_id and r.released_at is null) then
    raise exception 'seller_copy_reserved' using errcode='55000';
  end if;
  return new;
end $$;
drop trigger if exists guard_ebay_seller_disposition_v1 on public.vault_item_instance_dispositions;
create trigger guard_ebay_seller_disposition_v1 before insert
  on public.vault_item_instance_dispositions for each row execute function public.ebay_seller_guard_disposition_v1();

create or replace function public.ebay_seller_guard_parent_delete_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
declare held boolean;
begin
  if tg_table_schema='auth' and tg_table_name='users' then
    select exists(select 1 from public.ebay_seller_reservations_v1
      where user_id=old.id and released_at is null) into held;
  elsif tg_table_schema='public' and tg_table_name='ebay_accounts' then
    select exists(select 1 from public.ebay_seller_reservations_v1 r
      join public.ebay_seller_drafts_v1 d on d.id=r.draft_id
      where d.account_id=old.id and r.released_at is null) into held;
  elsif tg_table_schema='public' and tg_table_name='ebay_seller_drafts_v1' then
    select exists(select 1 from public.ebay_seller_reservations_v1
      where draft_id=old.id and released_at is null) into held;
  else
    raise exception 'seller_guard_target_invalid' using errcode='55000';
  end if;
  if held then raise exception 'seller_copy_reserved' using errcode='55000'; end if;
  return old;
end $$;
drop trigger if exists guard_ebay_seller_owner_delete_v1 on auth.users;
create trigger guard_ebay_seller_owner_delete_v1 before delete on auth.users
  for each row execute function public.ebay_seller_guard_parent_delete_v1();
drop trigger if exists guard_ebay_seller_account_delete_v1 on public.ebay_accounts;
create trigger guard_ebay_seller_account_delete_v1 before delete on public.ebay_accounts
  for each row execute function public.ebay_seller_guard_parent_delete_v1();
drop trigger if exists guard_ebay_seller_draft_delete_v1 on public.ebay_seller_drafts_v1;
create trigger guard_ebay_seller_draft_delete_v1 before delete on public.ebay_seller_drafts_v1
  for each row execute function public.ebay_seller_guard_parent_delete_v1();

create or replace function public.ebay_seller_require_service_v1()
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'seller_service_required' using errcode = '42501';
  end if;
end $$;

create or replace function public.ebay_seller_assert_enabled_v1(p_actor uuid, p_lane text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare c public.ebay_seller_controls_v1;
begin
  perform public.ebay_seller_require_service_v1();
  if p_actor is null or p_lane is null or p_lane not in ('linking','preparation','publication') then
    raise exception 'seller_request_invalid' using errcode = '22023';
  end if;
  select * into strict c from public.ebay_seller_controls_v1 where singleton for share;
  if not (case p_lane when 'linking' then c.linking_enabled
       when 'preparation' then c.preparation_enabled else c.publication_enabled end)
     or (cardinality(c.canary_actor_ids)>0 and not (p_actor = any(c.canary_actor_ids))) then
    raise exception 'seller_temporarily_paused' using errcode = '55000';
  end if;
  return c.revision;
end $$;

create or replace function public.ebay_seller_require_actor_v1(p_actor uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.ebay_seller_require_service_v1();
  perform 1 from auth.users where id=p_actor for key share;
  if not found then raise exception 'seller_actor_required' using errcode='42501'; end if;
end $$;

create or replace function public.ebay_seller_save_draft_v1(
  p_actor uuid, p_draft_id uuid, p_instance_id uuid, p_account_id uuid,
  p_expected_revision bigint, p_input jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owned public.vault_item_instances; draft public.ebay_seller_drafts_v1;
  identity jsonb;
begin
  perform public.ebay_seller_require_actor_v1(p_actor);
  perform public.ebay_seller_assert_enabled_v1(p_actor,'preparation');
  if p_draft_id is null or p_instance_id is null or p_account_id is null
      or p_expected_revision is null or p_expected_revision<0
      or p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>100000 then
    raise exception 'seller_request_invalid' using errcode='22023';
  end if;
  -- Canonical writers and publication all lock the exact copy before draft or
  -- reservation rows. The actor lock also serializes account deletion.
  select * into owned from public.vault_item_instances
    where id=p_instance_id and user_id=p_actor and archived_at is null for update;
  if not found or owned.card_print_id is null or owned.card_printing_id is null then
    raise exception 'seller_exact_active_copy_required' using errcode='22023';
  end if;
  if exists(select 1 from public.vault_item_instance_dispositions where vault_item_instance_id=owned.id)
      or exists(select 1 from public.ebay_seller_reservations_v1 where instance_id=owned.id and released_at is null) then
    raise exception 'seller_copy_reserved' using errcode='55000';
  end if;
  perform 1 from public.ebay_accounts where id=p_account_id and user_id=p_actor
    and environment='production' and marketplace_id='EBAY_US'
    and provider_user_id is not null and is_active for key share;
  if not found then raise exception 'seller_authorization_required' using errcode='42501'; end if;
  identity := public.ebay_seller_copy_identity_v1(owned);
  select * into draft from public.ebay_seller_drafts_v1 where id=p_draft_id for update;
  if found then
    if draft.user_id<>p_actor or draft.instance_id<>p_instance_id or draft.account_id<>p_account_id then
      raise exception 'seller_draft_not_owned' using errcode='42501';
    end if;
    if draft.state<>'editing' then raise exception 'seller_draft_not_editable' using errcode='55000'; end if;
    if draft.input=p_input and draft.copy_identity=identity then
      return jsonb_build_object('id',draft.id,'revision',draft.revision,'state',draft.state,'recovered',true);
    end if;
    if draft.revision<>p_expected_revision then
      raise exception 'seller_draft_revision_conflict' using errcode='40001';
    end if;
    update public.ebay_seller_drafts_v1 set input=p_input,copy_identity=identity,
      revision=revision+1,prepared_snapshot=null,review_hash=null,prepared_revision=null,
      fee_quote=null,error_code=null,updated_at=clock_timestamp() where id=draft.id returning * into draft;
  else
    if p_expected_revision<>0 then raise exception 'seller_draft_revision_conflict' using errcode='40001'; end if;
    if exists(select 1 from public.ebay_seller_drafts_v1 where instance_id=p_instance_id
        and state not in ('withdrawn','ended','abandoned')) then
      raise exception 'seller_draft_exists' using errcode='23505';
    end if;
    insert into public.ebay_seller_drafts_v1(id,user_id,instance_id,account_id,input,copy_identity)
      values(p_draft_id,p_actor,p_instance_id,p_account_id,p_input,identity) returning * into draft;
  end if;
  return jsonb_build_object('id',draft.id,'revision',draft.revision,'state',draft.state,'recovered',false);
end $$;

create or replace function public.ebay_seller_register_photo_v1(
  p_actor uuid,p_draft_id uuid,p_photo_id uuid,p_expected_revision bigint
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare draft public.ebay_seller_drafts_v1; photo public.ebay_seller_photos_v1;
begin
  perform public.ebay_seller_require_actor_v1(p_actor);
  perform public.ebay_seller_assert_enabled_v1(p_actor,'preparation');
  if p_photo_id is null or p_expected_revision is null then
    raise exception 'seller_request_invalid' using errcode='22023';
  end if;
  select * into draft from public.ebay_seller_drafts_v1 where id=p_draft_id and user_id=p_actor;
  if not found then raise exception 'seller_draft_not_owned' using errcode='42501'; end if;
  perform 1 from public.vault_item_instances where id=draft.instance_id and user_id=p_actor
    and archived_at is null for update;
  if not found then raise exception 'seller_exact_active_copy_required' using errcode='22023'; end if;
  select * into strict draft from public.ebay_seller_drafts_v1 where id=p_draft_id for update;
  if draft.state<>'editing' then raise exception 'seller_draft_not_editable' using errcode='55000'; end if;
  select * into photo from public.ebay_seller_photos_v1 where id=p_photo_id;
  if found then
    if photo.draft_id<>draft.id or photo.user_id<>p_actor or photo.state='removed' then
      raise exception 'seller_photo_not_owned' using errcode='42501';
    end if;
    return jsonb_build_object('id',photo.id,'path',photo.storage_path,'revision',draft.revision,'recovered',true);
  end if;
  if draft.revision<>p_expected_revision then
    raise exception 'seller_draft_revision_conflict' using errcode='40001';
  end if;
  if (select count(*) from public.ebay_seller_photos_v1 where draft_id=draft.id and state<>'removed')>=12 then
    raise exception 'seller_photo_limit' using errcode='22023';
  end if;
  insert into public.ebay_seller_photos_v1(id,draft_id,user_id) values(p_photo_id,draft.id,p_actor)
    returning * into photo;
  update public.ebay_seller_drafts_v1 set revision=revision+1,prepared_snapshot=null,
    review_hash=null,prepared_revision=null,fee_quote=null,error_code=null,updated_at=clock_timestamp()
    where id=draft.id returning * into draft;
  return jsonb_build_object('id',photo.id,'path',photo.storage_path,'revision',draft.revision,'recovered',false);
end $$;

create or replace function public.ebay_seller_remove_photo_v1(
  p_actor uuid,p_draft_id uuid,p_photo_id uuid,p_expected_revision bigint
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare d public.ebay_seller_drafts_v1; photo public.ebay_seller_photos_v1;
begin
  perform public.ebay_seller_require_actor_v1(p_actor);
  if p_photo_id is null or p_expected_revision is null or p_expected_revision<1 then
    raise exception 'seller_request_invalid' using errcode='22023';
  end if;
  select * into d from public.ebay_seller_drafts_v1 where id=p_draft_id and user_id=p_actor;
  if not found then raise exception 'seller_draft_not_owned' using errcode='42501'; end if;
  perform 1 from public.vault_item_instances where id=d.instance_id and user_id=p_actor
    and archived_at is null for update;
  if not found then raise exception 'seller_exact_active_copy_required' using errcode='22023'; end if;
  select * into strict d from public.ebay_seller_drafts_v1 where id=p_draft_id for update;
  select * into photo from public.ebay_seller_photos_v1 where id=p_photo_id and draft_id=d.id and user_id=p_actor;
  if not found then raise exception 'seller_photo_not_owned' using errcode='42501'; end if;
  if photo.state='removed' then
    return jsonb_build_object('id',photo.id,'revision',d.revision,'recovered',true);
  end if;
  if d.state<>'editing' then raise exception 'seller_draft_not_editable' using errcode='55000'; end if;
  if d.revision<>p_expected_revision then raise exception 'seller_draft_revision_conflict' using errcode='40001'; end if;
  update public.ebay_seller_photos_v1 set state='removed',updated_at=clock_timestamp() where id=photo.id;
  update public.ebay_seller_drafts_v1 set revision=revision+1,prepared_snapshot=null,
    review_hash=null,prepared_revision=null,fee_quote=null,error_code=null,updated_at=clock_timestamp()
    where id=d.id returning * into d;
  return jsonb_build_object('id',photo.id,'revision',d.revision,'recovered',false);
end $$;

create or replace function public.ebay_seller_photo_path_authorized_v1(p_path text,p_write boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and p_write is not null and exists(
    select 1 from public.ebay_seller_photos_v1 p
    join public.ebay_seller_drafts_v1 d on d.id=p.draft_id and d.user_id=p.user_id
    where p.storage_path=p_path and p.user_id=auth.uid()
      and (not p_write or (d.state='editing' and p.state in ('awaiting_upload','ready','removed'))))
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('ebay-listing-private','ebay-listing-private',false,16777216,array['image/jpeg','image/png'])
  on conflict(id) do nothing;
do $seller_bucket_guard$
begin
  if not exists(select 1 from storage.buckets where id='ebay-listing-private'
      and name='ebay-listing-private' and public=false and file_size_limit=16777216
      and allowed_mime_types=array['image/jpeg','image/png']) then
    raise exception 'seller_private_bucket_drift';
  end if;
end $seller_bucket_guard$;
drop policy if exists ebay_seller_photo_read_v1 on storage.objects;
create policy ebay_seller_photo_read_v1 on storage.objects for select to authenticated
  using(bucket_id='ebay-listing-private' and public.ebay_seller_photo_path_authorized_v1(name,false));
drop policy if exists ebay_seller_photo_insert_v1 on storage.objects;
create policy ebay_seller_photo_insert_v1 on storage.objects for insert to authenticated
  with check(bucket_id='ebay-listing-private' and public.ebay_seller_photo_path_authorized_v1(name,true));
drop policy if exists ebay_seller_photo_update_v1 on storage.objects;
create policy ebay_seller_photo_update_v1 on storage.objects for update to authenticated
  using(bucket_id='ebay-listing-private' and public.ebay_seller_photo_path_authorized_v1(name,true))
  with check(bucket_id='ebay-listing-private' and public.ebay_seller_photo_path_authorized_v1(name,true));
drop policy if exists ebay_seller_photo_delete_v1 on storage.objects;
create policy ebay_seller_photo_delete_v1 on storage.objects for delete to authenticated
  using(bucket_id='ebay-listing-private' and public.ebay_seller_photo_path_authorized_v1(name,true));

create or replace function public.ebay_seller_set_control_v1(
  p_expected_revision bigint, p_linking boolean, p_preparation boolean,
  p_publication boolean, p_canary_actor_ids uuid[]
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare old_state public.ebay_seller_controls_v1; new_state public.ebay_seller_controls_v1;
begin
  perform public.ebay_seller_require_service_v1();
  if p_linking is null or p_preparation is null or p_publication is null
     or p_canary_actor_ids is null or cardinality(p_canary_actor_ids) > 10
     or array_position(p_canary_actor_ids, null) is not null
     or (p_publication and not p_preparation) or (p_preparation and not p_linking)
     or (select count(distinct x) from unnest(p_canary_actor_ids) x) <> cardinality(p_canary_actor_ids)
     or exists(select 1 from unnest(p_canary_actor_ids) x where not exists(select 1 from auth.users u where u.id=x)) then
    raise exception 'seller_control_invalid' using errcode = '22023';
  end if;
  select * into strict old_state from public.ebay_seller_controls_v1 where singleton for update;
  if old_state.revision is distinct from p_expected_revision then
    raise exception 'seller_control_revision_conflict' using errcode = '40001';
  end if;
  update public.ebay_seller_controls_v1 set linking_enabled=p_linking,
    preparation_enabled=p_preparation, publication_enabled=p_publication,
    canary_actor_ids=p_canary_actor_ids, revision=revision+1, updated_at=clock_timestamp()
    where singleton returning * into new_state;
  insert into public.ebay_seller_control_events_v1(previous_state,next_state)
    values(to_jsonb(old_state),to_jsonb(new_state));
  return to_jsonb(new_state);
end $$;

create or replace function public.ebay_seller_oauth_start_v1(p_actor uuid, p_launch_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.ebay_seller_oauth_attempts_v1; instant timestamptz := clock_timestamp();
begin
  perform public.ebay_seller_assert_enabled_v1(p_actor,'linking');
  if p_launch_hash is null or p_launch_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'seller_request_invalid' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('ebay-seller:'||p_actor::text,0));
  if exists(select 1 from public.ebay_seller_oauth_attempts_v1 where user_id=p_actor
      and status='exchanging' and lease_until>instant) then
    raise exception 'seller_link_in_progress' using errcode = '55000';
  end if;
  update public.ebay_seller_oauth_attempts_v1 set
    status=case when status='exchanging' then 'uncertain' else 'superseded' end,
    claim_nonce=null, lease_until=null, updated_at=instant
    where user_id=p_actor and status in ('created','launched','exchanging');
  insert into public.ebay_seller_oauth_attempts_v1(user_id,environment,launch_hash,expires_at)
    values(p_actor,'production',p_launch_hash,instant+interval '10 minutes') returning * into a;
  return jsonb_build_object('attemptId',a.id,'expiresAt',a.expires_at);
end $$;

create or replace function public.ebay_seller_oauth_launch_v1(
  p_launch_hash text, p_state_hash text, p_browser_hash text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.ebay_seller_oauth_attempts_v1;
begin
  perform public.ebay_seller_require_service_v1();
  if p_launch_hash is null or p_launch_hash !~ '^[a-f0-9]{64}$'
     or p_state_hash is null or p_state_hash !~ '^[a-f0-9]{64}$'
     or p_browser_hash is null or p_browser_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'seller_link_expired' using errcode = '22023';
  end if;
  select * into a from public.ebay_seller_oauth_attempts_v1 where launch_hash=p_launch_hash;
  if not found then raise exception 'seller_link_expired' using errcode = '22023'; end if;
  perform public.ebay_seller_assert_enabled_v1(a.user_id,'linking');
  perform pg_advisory_xact_lock(hashtextextended('ebay-seller:'||a.user_id::text,0));
  update public.ebay_seller_oauth_attempts_v1 set state_hash=p_state_hash,
    browser_hash=p_browser_hash,status='launched',updated_at=clock_timestamp()
    where id=a.id and status='created' and expires_at>clock_timestamp() returning * into a;
  if not found then raise exception 'seller_link_expired' using errcode = '22023'; end if;
  return jsonb_build_object('attemptId',a.id,'environment',a.environment,'expiresAt',a.expires_at);
end $$;

create or replace function public.ebay_seller_oauth_claim_v1(
  p_state_hash text, p_browser_hash text, p_claim_nonce uuid, p_denied boolean
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.ebay_seller_oauth_attempts_v1;
begin
  perform public.ebay_seller_require_service_v1();
  if p_state_hash is null or p_state_hash !~ '^[a-f0-9]{64}$'
     or p_browser_hash is null or p_browser_hash !~ '^[a-f0-9]{64}$'
     or p_claim_nonce is null or p_denied is null then
    raise exception 'seller_callback_invalid' using errcode = '22023';
  end if;
  select * into a from public.ebay_seller_oauth_attempts_v1 where state_hash=p_state_hash;
  if not found then raise exception 'seller_callback_invalid' using errcode = '22023'; end if;
  perform public.ebay_seller_assert_enabled_v1(a.user_id,'linking');
  perform pg_advisory_xact_lock(hashtextextended('ebay-seller:'||a.user_id::text,0));
  update public.ebay_seller_oauth_attempts_v1 set
    status=case when p_denied then 'denied' else 'exchanging' end,
    claim_nonce=case when p_denied then null else p_claim_nonce end,
    lease_until=case when p_denied then null else clock_timestamp()+interval '60 seconds' end,
    updated_at=clock_timestamp()
    where id=a.id and status='launched' and browser_hash=p_browser_hash
      and expires_at>clock_timestamp() returning * into a;
  if not found then raise exception 'seller_callback_invalid' using errcode = '22023'; end if;
  return jsonb_build_object('attemptId',a.id,'actorId',a.user_id,'environment',a.environment,'denied',p_denied);
end $$;

create or replace function public.ebay_seller_oauth_fail_v1(
  p_attempt_id uuid, p_claim_nonce uuid, p_uncertain boolean, p_error_code text
)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform public.ebay_seller_require_service_v1();
  if p_uncertain is null or p_error_code is null or p_error_code !~ '^[a-z_]{1,80}$' then
    raise exception 'seller_request_invalid' using errcode='22023';
  end if;
  update public.ebay_seller_oauth_attempts_v1 set status=case when p_uncertain then 'uncertain' else 'failed' end,
    error_code=p_error_code,claim_nonce=null,lease_until=null,updated_at=clock_timestamp()
    where id=p_attempt_id and status='exchanging' and claim_nonce=p_claim_nonce;
  return found;
end $$;

create or replace function public.ebay_seller_oauth_complete_v1(
  p_attempt_id uuid, p_claim_nonce uuid, p_provider_user_id text, p_username text,
  p_access_token text, p_refresh_token text, p_access_expires_at timestamptz,
  p_scopes text[], p_refresh_expires_at timestamptz default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.ebay_seller_oauth_attempts_v1; account public.ebay_accounts;
begin
  perform public.ebay_seller_require_service_v1();
  if p_provider_user_id is null or char_length(p_provider_user_id) not between 1 and 512
     or p_provider_user_id ~ '[[:cntrl:]]' or p_username is null or char_length(p_username) not between 1 and 256
     or p_username ~ '[[:cntrl:]]'
     or p_access_token is null or char_length(p_access_token) not between 20 and 32768 or p_access_token ~ '[[:cntrl:]]'
     or p_refresh_token is null or char_length(p_refresh_token) not between 20 and 32768 or p_refresh_token ~ '[[:cntrl:]]'
     or p_access_expires_at is null or p_access_expires_at <= clock_timestamp()
     or p_access_expires_at > clock_timestamp()+interval '1 day 5 minutes'
     or p_refresh_expires_at is null or p_refresh_expires_at <= clock_timestamp()
     or p_refresh_expires_at > clock_timestamp()+interval '600 days'
     or p_scopes is null or cardinality(p_scopes)<>4 or array_position(p_scopes,null) is not null
     or not (p_scopes @> array[
       'https://api.ebay.com/oauth/api_scope','https://api.ebay.com/oauth/api_scope/sell.inventory',
       'https://api.ebay.com/oauth/api_scope/sell.account.readonly','https://api.ebay.com/oauth/api_scope/commerce.identity.readonly']) then
    raise exception 'seller_token_receipt_invalid' using errcode='22023';
  end if;
  select * into a from public.ebay_seller_oauth_attempts_v1 where id=p_attempt_id;
  if not found then raise exception 'seller_callback_invalid' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('ebay-seller:'||a.user_id::text,0));
  select * into strict a from public.ebay_seller_oauth_attempts_v1 where id=p_attempt_id for update;
  if a.status<>'exchanging' or a.claim_nonce is distinct from p_claim_nonce or a.lease_until<=clock_timestamp() then
    raise exception 'seller_callback_invalid' using errcode='22023';
  end if;
  -- Lock ordering is owner then immutable provider identity. Both unique indexes
  -- independently protect simultaneous attempts made by different owners.
  perform pg_advisory_xact_lock(hashtextextended('ebay-provider:'||a.environment||':'||p_provider_user_id,0));
  if exists(select 1 from public.ebay_accounts where environment=a.environment
      and ((provider_user_id=p_provider_user_id and user_id<>a.user_id)
       or (user_id=a.user_id and provider_user_id is distinct from p_provider_user_id))) then
    raise exception 'seller_binding_conflict' using errcode='23505';
  end if;
  select * into account from public.ebay_accounts where user_id=a.user_id and environment=a.environment for update;
  if found then
    update public.ebay_seller_token_refreshes_v1 set status='uncertain',
      error_code='seller_token_claim_superseded',updated_at=clock_timestamp()
      where account_id=account.id and status='running';
    update public.ebay_accounts set ebay_username=p_username,access_token=p_access_token,
      refresh_token=p_refresh_token,access_token_expires_at=p_access_expires_at,
      refresh_token_expires_at=p_refresh_expires_at,scopes=p_scopes,is_active=true,
      token_state='ready',token_revision=token_revision+1,refresh_claim=null,
      refresh_lease_until=null,updated_at=clock_timestamp() where id=account.id returning * into account;
  else
    insert into public.ebay_accounts(user_id,provider_user_id,environment,ebay_username,
      marketplace_id,access_token,refresh_token,access_token_expires_at,refresh_token_expires_at,scopes)
      values(a.user_id,p_provider_user_id,a.environment,p_username,'EBAY_US',p_access_token,
        p_refresh_token,p_access_expires_at,p_refresh_expires_at,p_scopes) returning * into account;
  end if;
  update public.ebay_seller_oauth_attempts_v1 set status='linked',account_id=account.id,
    claim_nonce=null,lease_until=null,updated_at=clock_timestamp() where id=a.id;
  return jsonb_build_object('accountId',account.id,'username',account.ebay_username,'linked',true);
end $$;

create or replace function public.ebay_seller_token_claim_v1(
  p_actor uuid,p_account_id uuid,p_claim_nonce uuid
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare account public.ebay_accounts; instant timestamptz:=clock_timestamp();
begin
  perform public.ebay_seller_require_actor_v1(p_actor);
  if p_claim_nonce is null then raise exception 'seller_request_invalid' using errcode='22023'; end if;
  select * into account from public.ebay_accounts where id=p_account_id and user_id=p_actor for update;
  if not found or account.environment<>'production' or account.provider_user_id is null or not account.is_active then
    raise exception 'seller_authorization_required' using errcode='42501';
  end if;
  if account.token_state='refreshing' then
    if account.refresh_lease_until>instant then
      return jsonb_build_object('status','refresh_in_progress');
    end if;
    -- Expired leases never authorize provider writes using an unobserved result.
    update public.ebay_accounts set token_state='uncertain',refresh_claim=null,
      refresh_lease_until=null,token_revision=token_revision+1,updated_at=instant where id=account.id;
    update public.ebay_seller_token_refreshes_v1 set status='uncertain',
      error_code='seller_token_refresh_result_uncertain',updated_at=instant
      where claim_nonce=account.refresh_claim and account_id=account.id and status='running';
    return jsonb_build_object('status','reconnect_required');
  end if;
  if account.token_state<>'ready' then return jsonb_build_object('status','reconnect_required'); end if;
  if account.access_token_expires_at>instant+interval '60 seconds' then
    return jsonb_build_object('status','ready','accessToken',account.access_token,
      'revision',account.token_revision,'environment',account.environment);
  end if;
  if account.refresh_token is null or account.refresh_token_expires_at is null
      or account.refresh_token_expires_at<=instant then
    update public.ebay_accounts set token_state='reconnect_required',token_revision=token_revision+1,
      updated_at=instant where id=account.id;
    return jsonb_build_object('status','reconnect_required');
  end if;
  update public.ebay_accounts set token_state='refreshing',refresh_claim=p_claim_nonce,
    refresh_lease_until=instant+interval '60 seconds',token_revision=token_revision+1,
    updated_at=instant where id=account.id returning * into account;
  insert into public.ebay_seller_token_refreshes_v1(claim_nonce,account_id,user_id,started_revision)
    values(p_claim_nonce,account.id,p_actor,account.token_revision);
  return jsonb_build_object('status','refresh_claimed','revision',account.token_revision,
    'refreshToken',account.refresh_token,'environment',account.environment);
end $$;

create or replace function public.ebay_seller_token_complete_v1(
  p_actor uuid,p_account_id uuid,p_claim_nonce uuid,p_expected_revision bigint,
  p_access_token text,p_access_expires_at timestamptz,
  p_refresh_token text default null,p_refresh_expires_at timestamptz default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare account public.ebay_accounts; instant timestamptz:=clock_timestamp();
begin
  perform public.ebay_seller_require_actor_v1(p_actor);
  if p_access_token is null or char_length(p_access_token) not between 20 and 32768
      or p_access_token ~ '[[:cntrl:]]' or p_access_expires_at is null
      or p_access_expires_at<=instant or p_access_expires_at>instant+interval '1 day 5 minutes'
      or (p_refresh_token is null)<>(p_refresh_expires_at is null)
      or (p_refresh_token is not null and (char_length(p_refresh_token) not between 20 and 32768
        or p_refresh_token ~ '[[:cntrl:]]' or p_refresh_expires_at<=instant
        or p_refresh_expires_at>instant+interval '600 days')) then
    raise exception 'seller_token_receipt_invalid' using errcode='22023';
  end if;
  select * into account from public.ebay_accounts where id=p_account_id and user_id=p_actor for update;
  if not found or not account.is_active or account.token_state<>'refreshing'
      or account.refresh_claim is distinct from p_claim_nonce or account.token_revision is distinct from p_expected_revision then
    return jsonb_build_object('status','superseded');
  end if;
  if account.refresh_lease_until<=instant then
    update public.ebay_accounts set token_state='uncertain',refresh_claim=null,
      refresh_lease_until=null,token_revision=token_revision+1,updated_at=instant where id=account.id;
    update public.ebay_seller_token_refreshes_v1 set status='uncertain',
      error_code='seller_token_refresh_result_uncertain',updated_at=instant
      where claim_nonce=p_claim_nonce and account_id=account.id and status='running';
    return jsonb_build_object('status','reconnect_required');
  end if;
  update public.ebay_accounts set access_token=p_access_token,access_token_expires_at=p_access_expires_at,
    refresh_token=coalesce(p_refresh_token,refresh_token),
    refresh_token_expires_at=coalesce(p_refresh_expires_at,refresh_token_expires_at),
    token_state='ready',refresh_claim=null,refresh_lease_until=null,
    token_revision=token_revision+1,updated_at=instant where id=account.id returning * into account;
  update public.ebay_seller_token_refreshes_v1 set status='succeeded',
    completed_revision=account.token_revision,updated_at=instant
    where claim_nonce=p_claim_nonce and account_id=account.id and status='running'
      and started_revision=p_expected_revision;
  if not found then raise exception 'seller_token_claim_invalid' using errcode='22023'; end if;
  return jsonb_build_object('status','ready','revision',account.token_revision);
end $$;

create or replace function public.ebay_seller_token_fail_v1(
  p_actor uuid,p_account_id uuid,p_claim_nonce uuid,p_expected_revision bigint,
  p_uncertain boolean,p_error_code text
)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform public.ebay_seller_require_actor_v1(p_actor);
  if p_uncertain is null or p_error_code is null or p_error_code !~ '^[a-z_]{1,80}$' then
    raise exception 'seller_request_invalid' using errcode='22023';
  end if;
  update public.ebay_accounts set token_state=case when p_uncertain then 'uncertain' else 'reconnect_required' end,
    refresh_claim=null,refresh_lease_until=null,token_revision=token_revision+1,updated_at=clock_timestamp()
    where id=p_account_id and user_id=p_actor and token_state='refreshing'
      and refresh_claim=p_claim_nonce and token_revision=p_expected_revision;
  if not found then return false; end if;
  update public.ebay_seller_token_refreshes_v1 set status=case when p_uncertain then 'uncertain' else 'failed' end,
    error_code=p_error_code,completed_revision=p_expected_revision+1,updated_at=clock_timestamp()
    where claim_nonce=p_claim_nonce and account_id=p_account_id and user_id=p_actor
      and status='running' and started_revision=p_expected_revision;
  if not found then raise exception 'seller_token_claim_invalid' using errcode='22023'; end if;
  return true;
end $$;

-- Claim before provider access. A retry of a request reads the existing receipt;
-- it never grants a second worker the original mutation capability.
create or replace function public.ebay_seller_operation_claim_v1(
  p_actor uuid,p_draft_id uuid,p_request_id uuid,p_kind text,
  p_expected_revision bigint,p_expected_hash text,p_claim_nonce uuid
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare d public.ebay_seller_drafts_v1; owned public.vault_item_instances;
  op public.ebay_seller_operations_v1; existing public.ebay_seller_operations_v1;
  instant timestamptz:=clock_timestamp(); frozen jsonb;
begin
  perform public.ebay_seller_require_actor_v1(p_actor);
  if p_request_id is null or p_claim_nonce is null or p_kind is null
      or p_kind not in ('prepare','publish','withdraw','reconcile')
      or p_expected_revision is null or p_expected_revision<1
      or (p_expected_hash is not null and p_expected_hash !~ '^[a-f0-9]{64}$') then
    raise exception 'seller_request_invalid' using errcode='22023';
  end if;
  select * into d from public.ebay_seller_drafts_v1 where id=p_draft_id and user_id=p_actor;
  if not found then raise exception 'seller_draft_not_owned' using errcode='42501'; end if;
  -- Same copy-before-draft order as the canonical disposition and photo writers.
  select * into owned from public.vault_item_instances
    where id=d.instance_id and user_id=p_actor for update;
  if not found then raise exception 'seller_exact_active_copy_required' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('ebay-seller-account:'||d.account_id::text,0));
  select * into strict d from public.ebay_seller_drafts_v1 where id=p_draft_id for update;
  select * into existing from public.ebay_seller_operations_v1
    where user_id=p_actor and request_id=p_request_id for update;
  if found then
    if existing.draft_id<>d.id or existing.kind<>p_kind
        or existing.expected_revision<>p_expected_revision
        or existing.expected_hash is distinct from p_expected_hash then
      raise exception 'seller_request_id_conflict' using errcode='22023';
    end if;
    if existing.status='running' and not existing.handoff_ready and existing.lease_until<=instant then
      update public.ebay_seller_operations_v1 set status='uncertain',
        error_code='seller_operation_result_uncertain',updated_at=instant
        where id=existing.id returning * into existing;
      if existing.kind<>'reconcile' then
        update public.ebay_seller_drafts_v1 set state='uncertain',
          error_code='seller_operation_result_uncertain',updated_at=instant where id=d.id;
      end if;
    end if;
    return jsonb_build_object('operationId',existing.id,'status',existing.status,
      'stage',existing.stage,'recovered',true,'claimGranted',false);
  end if;
  if exists(select 1 from public.ebay_seller_operations_v1
      where account_id=d.account_id and status='running') then
    raise exception 'seller_operation_in_progress' using errcode='55000';
  end if;
  if d.revision<>p_expected_revision then
    raise exception 'seller_draft_revision_conflict' using errcode='40001';
  end if;
  if p_kind in ('prepare','publish') then
    perform public.ebay_seller_assert_enabled_v1(p_actor,
      case p_kind when 'prepare' then 'preparation' else 'publication' end);
    if owned.archived_at is not null or d.copy_identity<>public.ebay_seller_copy_identity_v1(owned)
        or exists(select 1 from public.vault_item_instance_dispositions where vault_item_instance_id=owned.id) then
      raise exception 'seller_copy_changed' using errcode='40001';
    end if;
    perform 1 from public.ebay_accounts where id=d.account_id and user_id=p_actor
      and is_active and environment='production' and provider_user_id is not null for key share;
    if not found then raise exception 'seller_authorization_required' using errcode='42501'; end if;
  end if;
  if p_kind='prepare' then
    if d.state<>'editing' or p_expected_hash is not null then
      raise exception 'seller_draft_not_editable' using errcode='55000';
    end if;
    if not exists(select 1 from public.ebay_seller_photos_v1 where draft_id=d.id and state<>'removed') then
      raise exception 'seller_physical_copy_photos_required' using errcode='22023';
    end if;
    if exists(select 1 from public.ebay_seller_photos_v1 p where p.draft_id=d.id and p.state<>'removed'
        and not public.ebay_seller_photo_uploaded_v1(p)) then
      raise exception 'seller_photo_upload_required' using errcode='22023';
    end if;
    update public.ebay_seller_photos_v1 p set state='ready',updated_at=instant
      where p.draft_id=d.id and p.state='awaiting_upload';
    frozen:=jsonb_build_object('draftId',d.id,'actorId',p_actor,'revision',d.revision,
      'sellerAccountId',d.account_id,'sku',d.sku,'input',d.input,'copyIdentity',d.copy_identity);
    update public.ebay_seller_drafts_v1 set state='preparing',error_code=null,updated_at=instant where id=d.id;
  elsif p_kind='publish' then
    if owned.slab_cert_id is not null then
      perform 1 from public.slab_certs where id=owned.slab_cert_id for share;
      if not found then raise exception 'seller_copy_changed' using errcode='40001'; end if;
    end if;
    if d.state<>'prepared' or p_expected_hash is null or d.review_hash<>p_expected_hash
        or d.prepared_revision is distinct from d.revision
        or (d.prepared_snapshot->'slabEvidence') is distinct from
          coalesce(public.ebay_seller_slab_evidence_v1(owned.slab_cert_id),'null'::jsonb)
        or jsonb_typeof(d.fee_quote->'requestedAt') is distinct from 'number'
        or (d.fee_quote->>'requestedAt')::numeric>extract(epoch from instant)*1000
        or (d.fee_quote->>'requestedAt')::numeric<extract(epoch from instant-interval '120 seconds')*1000 then
      raise exception 'seller_review_changed_or_expired' using errcode='40001';
    end if;
    if exists(select 1 from public.ebay_seller_reservations_v1 where instance_id=owned.id and released_at is null) then
      raise exception 'seller_copy_reserved' using errcode='55000';
    end if;
    frozen:=d.prepared_snapshot;
    update public.ebay_seller_drafts_v1 set state='publishing',error_code=null,updated_at=instant where id=d.id;
  elsif p_kind='withdraw' then
    -- Stopping an existing listing remains available while publication is paused.
    if d.state not in ('live','sale_reported','uncertain') or d.offer_id is null or d.listing_id is null then
      raise exception 'seller_known_listing_required' using errcode='55000';
    end if;
    frozen:=jsonb_build_object('draftId',d.id,'revision',d.revision,'sku',d.sku,
      'offerId',d.offer_id,'listingId',d.listing_id);
  else
    if d.state in ('editing','abandoned','withdrawn','ended','sold') then
      raise exception 'seller_reconciliation_not_required' using errcode='55000';
    end if;
    frozen:=jsonb_build_object('draftId',d.id,'revision',d.revision,'sku',d.sku,
      'offerId',d.offer_id,'listingId',d.listing_id);
  end if;
  insert into public.ebay_seller_operations_v1(request_id,draft_id,user_id,account_id,
    kind,expected_revision,expected_hash,claim_nonce,lease_until,snapshot)
    values(p_request_id,d.id,p_actor,d.account_id,p_kind,d.revision,p_expected_hash,
      p_claim_nonce,instant+interval '60 seconds',frozen) returning * into op;
  if p_kind='publish' then
    insert into public.ebay_seller_reservations_v1(draft_id,user_id,instance_id,publication_operation_id)
      values(d.id,p_actor,owned.id,op.id);
  end if;
  return jsonb_build_object('operationId',op.id,'status',op.status,'stage',op.stage,
    'claimGranted',true,'recovered',false,'accountId',d.account_id,'instanceId',owned.id,
    'sku',d.sku,'snapshot',op.snapshot,'offerId',d.offer_id,'listingId',d.listing_id);
end $$;

-- Internal locking helper. The nonce is issued by the worker, not the client.
create or replace function public.ebay_seller_operation_lock_v1(
  p_actor uuid,p_operation_id uuid,p_claim_nonce uuid
)
returns public.ebay_seller_operations_v1 language plpgsql security definer set search_path = '' as $$
declare op public.ebay_seller_operations_v1; copy_id uuid;
begin
  perform public.ebay_seller_require_actor_v1(p_actor);
  select * into op from public.ebay_seller_operations_v1 where id=p_operation_id and user_id=p_actor;
  if not found or op.claim_nonce is distinct from p_claim_nonce then
    raise exception 'seller_operation_claim_invalid' using errcode='42501';
  end if;
  select instance_id into strict copy_id from public.ebay_seller_drafts_v1 where id=op.draft_id;
  perform 1 from public.vault_item_instances where id=copy_id for update;
  perform pg_advisory_xact_lock(hashtextextended('ebay-seller-account:'||op.account_id::text,0));
  perform 1 from public.ebay_seller_drafts_v1 where id=op.draft_id for update;
  select * into strict op from public.ebay_seller_operations_v1 where id=p_operation_id for update;
  if op.claim_nonce is distinct from p_claim_nonce then
    raise exception 'seller_operation_claim_invalid' using errcode='42501';
  end if;
  return op;
end $$;

-- A preparation request yields only between acknowledged provider calls.
-- Rotating the nonce retires the prior worker before a later request resumes.
create or replace function public.ebay_seller_operation_yield_v1(
  p_actor uuid,p_operation_id uuid,p_claim_nonce uuid
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare op public.ebay_seller_operations_v1;
begin
  op:=public.ebay_seller_operation_lock_v1(p_actor,p_operation_id,p_claim_nonce);
  if op.status<>'running' or op.kind<>'prepare' or op.handoff_ready
      or op.stage not in ('claimed','photos_ready','inventory_written','offer_created','fees_started')
      or exists(select 1 from public.ebay_seller_photos_v1 where draft_id=op.draft_id and state in ('uploading','uncertain')) then
    raise exception 'seller_operation_handoff_invalid' using errcode='55000';
  end if;
  if op.lease_until<=clock_timestamp() then
    raise exception 'seller_operation_lease_expired' using errcode='55000';
  end if;
  update public.ebay_seller_operations_v1 set handoff_ready=true,claim_nonce=gen_random_uuid(),
    updated_at=clock_timestamp() where id=op.id;
  return jsonb_build_object('status','running','operationId',op.id,'stage',op.stage,'continuationReady',true);
end $$;

create or replace function public.ebay_seller_operation_resume_v1(
  p_actor uuid,p_operation_id uuid,p_claim_nonce uuid
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare op public.ebay_seller_operations_v1; d public.ebay_seller_drafts_v1;
begin
  perform public.ebay_seller_require_actor_v1(p_actor);
  if p_claim_nonce is null then raise exception 'seller_request_invalid' using errcode='22023'; end if;
  select * into op from public.ebay_seller_operations_v1 where id=p_operation_id and user_id=p_actor;
  if not found then raise exception 'seller_operation_not_owned' using errcode='42501'; end if;
  select * into strict d from public.ebay_seller_drafts_v1 where id=op.draft_id;
  perform 1 from public.vault_item_instances where id=d.instance_id for update;
  perform pg_advisory_xact_lock(hashtextextended('ebay-seller-account:'||op.account_id::text,0));
  select * into strict d from public.ebay_seller_drafts_v1 where id=op.draft_id for update;
  select * into strict op from public.ebay_seller_operations_v1 where id=p_operation_id for update;
  if op.status<>'running' or not op.handoff_ready then
    if op.status='running' and op.lease_until<=clock_timestamp() then
      perform public.ebay_seller_operation_fail_v1(p_actor,op.id,op.claim_nonce,true,'seller_operation_result_uncertain');
      op.status:='uncertain';
    end if;
    return jsonb_build_object('operationId',op.id,'status',op.status,'claimGranted',false,'recovered',true);
  end if;
  if op.kind<>'prepare' or d.state<>'preparing' or d.revision<>op.expected_revision then
    raise exception 'seller_operation_handoff_invalid' using errcode='55000';
  end if;
  perform public.ebay_seller_assert_enabled_v1(p_actor,'preparation');
  update public.ebay_seller_operations_v1 set handoff_ready=false,claim_nonce=p_claim_nonce,
    lease_until=clock_timestamp()+interval '60 seconds',updated_at=clock_timestamp()
    where id=op.id returning * into op;
  return jsonb_build_object('operationId',op.id,'status',op.status,'stage',op.stage,
    'claimGranted',true,'recovered',false,'accountId',d.account_id,'instanceId',d.instance_id,
    'draftId',d.id,'revision',d.revision,'sku',d.sku,'snapshot',op.snapshot,
    'offerId',d.offer_id,'listingId',d.listing_id);
end $$;

create or replace function public.ebay_seller_operation_fail_v1(
  p_actor uuid,p_operation_id uuid,p_claim_nonce uuid,p_uncertain boolean,p_error_code text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare op public.ebay_seller_operations_v1; uncertain boolean; no_publish_intent boolean;
begin
  op:=public.ebay_seller_operation_lock_v1(p_actor,p_operation_id,p_claim_nonce);
  if p_uncertain is null or p_error_code is null or p_error_code !~ '^[a-z_]{1,80}$' then
    raise exception 'seller_request_invalid' using errcode='22023';
  end if;
  if op.status<>'running' then return jsonb_build_object('status',op.status); end if;
  -- A pre-call failure can prove there was no committed publish intent. Once
  -- intent exists, failures and lease expiry cannot release the copy.
  uncertain:=p_uncertain or op.lease_until<=clock_timestamp()
    or (op.kind='publish' and op.stage<>'claimed')
    or (op.kind='withdraw' and op.stage<>'claimed');
  no_publish_intent:=op.kind='publish' and op.stage='claimed' and not uncertain;
  update public.ebay_seller_operations_v1 set status=case when uncertain then 'uncertain' else 'failed' end,
    error_code=p_error_code,receipts=receipts||case when no_publish_intent then
      jsonb_build_array(jsonb_build_object('stage','not_published','at',clock_timestamp(),
        'evidence',jsonb_build_object('kind','no_publish_intent'))) else '[]'::jsonb end,
    updated_at=clock_timestamp() where id=op.id returning * into op;
  if no_publish_intent then
    update public.ebay_seller_reservations_v1 set released_at=clock_timestamp(),release_operation_id=op.id,
      release_evidence=jsonb_build_object('kind','no_publish_intent','operationId',op.id)
      where publication_operation_id=op.id and released_at is null;
    if not found then raise exception 'seller_reservation_required' using errcode='55000'; end if;
    update public.ebay_seller_drafts_v1 set state='prepared',error_code=p_error_code,
      updated_at=clock_timestamp() where id=op.draft_id;
  elsif op.kind<>'reconcile' then
    update public.ebay_seller_drafts_v1 set state='uncertain',error_code=p_error_code,
      updated_at=clock_timestamp() where id=op.draft_id;
  end if;
  return jsonb_build_object('status',op.status);
end $$;

-- Persist intent before each provider call and its minimal receipt afterwards.
create or replace function public.ebay_seller_operation_checkpoint_v1(
  p_actor uuid,p_operation_id uuid,p_claim_nonce uuid,p_expected_stage text,
  p_next_stage text,p_receipt jsonb default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare op public.ebay_seller_operations_v1; allowed boolean; receipt jsonb;
  preparation jsonb; preparation_json text; preparation_hash text; d public.ebay_seller_drafts_v1;
begin
  op:=public.ebay_seller_operation_lock_v1(p_actor,p_operation_id,p_claim_nonce);
  if op.status<>'running' then return jsonb_build_object('status',op.status,'advanced',false); end if;
  if op.lease_until<=clock_timestamp() then
    return public.ebay_seller_operation_fail_v1(p_actor,op.id,p_claim_nonce,true,'seller_operation_result_uncertain');
  end if;
  if op.stage is distinct from p_expected_stage then
    raise exception 'seller_operation_stage_conflict' using errcode='40001';
  end if;
  allowed:=case op.kind
    when 'prepare' then (op.stage,p_next_stage) in (('claimed','photos_ready'),
      ('photos_ready','inventory_started'),('inventory_started','inventory_written'),
      ('inventory_written','offer_started'),('offer_started','offer_created'),('offer_created','fees_started'))
    when 'publish' then (op.stage,p_next_stage)=('claimed','publish_started')
    when 'withdraw' then (op.stage,p_next_stage)=('claimed','withdraw_started')
    when 'reconcile' then (op.stage,p_next_stage)=('claimed','observing') else false end;
  if allowed is distinct from true or (p_receipt is not null and
      (jsonb_typeof(p_receipt)<>'object' or octet_length(p_receipt::text)>900000)) then
    raise exception 'seller_operation_stage_invalid' using errcode='22023';
  end if;
  if p_next_stage='photos_ready' then
    select * into strict d from public.ebay_seller_drafts_v1 where id=op.draft_id;
    preparation_json:=p_receipt->>'preparationJson';
    if preparation_json is null or octet_length(preparation_json)>800000 then
      raise exception 'seller_preparation_receipt_invalid' using errcode='22023';
    end if;
    preparation:=preparation_json::jsonb;
    preparation_hash:=encode(extensions.digest(convert_to(preparation_json,'UTF8'),'sha256'),'hex');
    if preparation->>'actorId' is distinct from p_actor::text
        or preparation->>'draftId' is distinct from d.id::text
        or preparation->>'sellerAccountId' is distinct from d.account_id::text
        or preparation->'revision' is distinct from to_jsonb(d.revision)
        or preparation->'copyIdentity' is distinct from d.copy_identity
        or preparation#>>'{offer,sku}' is distinct from d.sku
        or preparation_hash is distinct from p_receipt->>'preparationHash'
        or jsonb_typeof(preparation->'photos') is distinct from 'array' then
      raise exception 'seller_preparation_receipt_invalid' using errcode='22023';
    end if;
    if jsonb_array_length(preparation->'photos') not between 1 and 12
        or jsonb_array_length(preparation->'photos')<>(select count(*) from public.ebay_seller_photos_v1
          where draft_id=d.id and state<>'removed')
        or (select count(distinct v->>'id') from jsonb_array_elements(preparation->'photos') v)
          <>jsonb_array_length(preparation->'photos')
        or exists(select 1 from jsonb_array_elements(preparation->'photos') v where not exists(
          select 1 from public.ebay_seller_photos_v1 p where p.draft_id=d.id and p.state='hosted'
            and p.id::text=v->>'id' and p.source_sha256=v->>'sha256' and p.image_url=v->>'imageUrl'
            and p.expires_at=(v->>'expiresAt')::timestamptz
            and p.expires_at>clock_timestamp()+interval '1 hour')) then
      raise exception 'seller_physical_copy_photos_required' using errcode='22023';
    end if;
    update public.ebay_seller_operations_v1 set snapshot=snapshot||jsonb_build_object(
      'preparation',preparation,'preparationHash',preparation_hash) where id=op.id;
    -- Keep the journal minimal; the frozen preparation is stored once above.
    p_receipt:=jsonb_build_object('preparationHash',preparation_hash);
  end if;
  if p_next_stage='offer_created' then
    if p_receipt->>'offerId' is null or p_receipt->>'offerId' !~ '^[A-Za-z0-9_-]{1,100}$' then
      raise exception 'seller_offer_receipt_invalid' using errcode='22023';
    end if;
    update public.ebay_seller_drafts_v1 set offer_id=p_receipt->>'offerId',updated_at=clock_timestamp()
      where id=op.draft_id and (offer_id is null or offer_id=p_receipt->>'offerId');
    if not found then raise exception 'seller_offer_identity_conflict' using errcode='40001'; end if;
  end if;
  receipt:=jsonb_build_object('stage',p_next_stage,'at',clock_timestamp(),'evidence',coalesce(p_receipt,'{}'));
  update public.ebay_seller_operations_v1 set stage=p_next_stage,receipts=receipts||jsonb_build_array(receipt),
    lease_until=clock_timestamp()+interval '60 seconds',updated_at=clock_timestamp()
    where id=op.id returning * into op;
  return jsonb_build_object('status',op.status,'stage',op.stage,'advanced',true);
end $$;

-- Upload intent and EPS identity are committed before later reads. Original
-- Storage bytes cannot be replaced while this draft is preparing.
create or replace function public.ebay_seller_photo_receipt_v1(
  p_actor uuid,p_operation_id uuid,p_claim_nonce uuid,p_photo_id uuid,
  p_transition text,p_receipt jsonb default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare op public.ebay_seller_operations_v1; photo public.ebay_seller_photos_v1;
begin
  op:=public.ebay_seller_operation_lock_v1(p_actor,p_operation_id,p_claim_nonce);
  if op.status<>'running' or op.kind<>'prepare' or op.stage<>'claimed' then
    raise exception 'seller_photo_operation_invalid' using errcode='55000';
  end if;
  if op.lease_until<=clock_timestamp() then
    return public.ebay_seller_operation_fail_v1(p_actor,op.id,p_claim_nonce,true,'seller_operation_result_uncertain');
  end if;
  if p_transition is null or p_transition not in ('start_upload','uploaded','hosted','uncertain')
      or (p_receipt is not null and (jsonb_typeof(p_receipt)<>'object' or octet_length(p_receipt::text)>4096)) then
    raise exception 'seller_photo_receipt_invalid' using errcode='22023';
  end if;
  select * into photo from public.ebay_seller_photos_v1
    where id=p_photo_id and draft_id=op.draft_id and user_id=p_actor for update;
  if not found then raise exception 'seller_photo_not_owned' using errcode='42501'; end if;
  if p_transition='start_upload' then
    if photo.state not in ('awaiting_upload','ready') then
      raise exception 'seller_photo_upload_not_repeatable' using errcode='55000';
    end if;
    update public.ebay_seller_photos_v1 set state='uploading',updated_at=clock_timestamp() where id=photo.id;
  elsif p_transition='uploaded' then
    if photo.state<>'uploading' or photo.image_id is not null
        or p_receipt->>'imageId' is null or char_length(p_receipt->>'imageId') not between 1 and 512
        or p_receipt->>'imageId' ~ '[[:cntrl:][:space:]/\\]'
        or p_receipt->>'imageId' in ('.','..')
        or p_receipt->>'sourceSha256' is null or p_receipt->>'sourceSha256' !~ '^[a-f0-9]{64}$' then
      raise exception 'seller_photo_receipt_invalid' using errcode='22023';
    end if;
    update public.ebay_seller_photos_v1 set image_id=p_receipt->>'imageId',
      source_sha256=p_receipt->>'sourceSha256',updated_at=clock_timestamp() where id=photo.id;
  elsif p_transition='hosted' then
    if photo.state<>'uploading' or photo.image_id is null
        or p_receipt->>'imageId' is distinct from photo.image_id
        or p_receipt->>'imageUrl' is null or p_receipt->>'imageUrl' !~ '^https://i[.]ebayimg[.]com/images/[^?#[:cntrl:][:space:]]+$'
        or p_receipt->>'expiresAt' is null
        or (p_receipt->>'expiresAt')::timestamptz<=clock_timestamp()+interval '1 hour' then
      raise exception 'seller_photo_receipt_invalid' using errcode='22023';
    end if;
    update public.ebay_seller_photos_v1 set state='hosted',image_url=p_receipt->>'imageUrl',
      expires_at=(p_receipt->>'expiresAt')::timestamptz,updated_at=clock_timestamp() where id=photo.id;
  else
    if photo.state<>'uploading' then raise exception 'seller_photo_operation_invalid' using errcode='55000'; end if;
    update public.ebay_seller_photos_v1 set state='uncertain',updated_at=clock_timestamp() where id=photo.id;
  end if;
  update public.ebay_seller_operations_v1 set lease_until=clock_timestamp()+interval '60 seconds',
    updated_at=clock_timestamp() where id=op.id;
  return jsonb_build_object('status','running','photoId',photo.id,'transition',p_transition,'advanced',true);
end $$;

-- Local draft actions are idempotent and never mutate a provider resource or
-- canonical inventory. An active/uncertain publication cannot be discarded.
create or replace function public.ebay_seller_draft_action_v1(
  p_actor uuid,p_draft_id uuid,p_request_id uuid,p_expected_revision bigint,p_action text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare d public.ebay_seller_drafts_v1; op public.ebay_seller_operations_v1;
begin
  perform public.ebay_seller_require_actor_v1(p_actor);
  if p_request_id is null or p_expected_revision is null or p_expected_revision<1
      or p_action is null or p_action not in ('edit','abandon') then
    raise exception 'seller_request_invalid' using errcode='22023';
  end if;
  select * into d from public.ebay_seller_drafts_v1 where id=p_draft_id and user_id=p_actor;
  if not found then raise exception 'seller_draft_not_owned' using errcode='42501'; end if;
  perform 1 from public.vault_item_instances where id=d.instance_id and user_id=p_actor for update;
  perform pg_advisory_xact_lock(hashtextextended('ebay-seller-account:'||d.account_id::text,0));
  select * into strict d from public.ebay_seller_drafts_v1 where id=p_draft_id for update;
  select * into op from public.ebay_seller_operations_v1 where user_id=p_actor and request_id=p_request_id;
  if found then
    if op.kind<>p_action or op.draft_id<>d.id or op.expected_revision<>p_expected_revision then
      raise exception 'seller_request_id_conflict' using errcode='22023';
    end if;
    return jsonb_build_object('operationId',op.id,'state',op.snapshot->>'resultState',
      'revision',op.snapshot->'resultRevision','recovered',true);
  end if;
  if d.revision<>p_expected_revision then raise exception 'seller_draft_revision_conflict' using errcode='40001'; end if;
  if exists(select 1 from public.ebay_seller_operations_v1 where draft_id=d.id and status='running')
      or exists(select 1 from public.ebay_seller_reservations_v1 where draft_id=d.id and released_at is null)
      or exists(select 1 from public.ebay_seller_operations_v1 where draft_id=d.id and kind='publish'
        and not (status='failed' and stage='claimed'
          and receipts @> '[{"stage":"not_published","evidence":{"kind":"no_publish_intent"}}]'::jsonb)) then
    raise exception 'seller_draft_requires_reconciliation' using errcode='55000';
  end if;
  if (p_action='edit' and d.state<>'prepared') or (p_action='abandon' and d.state not in ('editing','prepared','uncertain')) then
    raise exception 'seller_draft_action_invalid' using errcode='55000';
  end if;
  update public.ebay_seller_drafts_v1 set state=case p_action when 'edit' then 'editing' else 'abandoned' end,
    revision=revision+1,prepared_snapshot=null,review_hash=null,prepared_revision=null,
    fee_quote=null,error_code=null,updated_at=clock_timestamp() where id=d.id returning * into d;
  insert into public.ebay_seller_operations_v1(request_id,draft_id,user_id,account_id,kind,status,
    expected_revision,lease_until,stage,snapshot)
    values(p_request_id,d.id,p_actor,d.account_id,p_action,'succeeded',p_expected_revision,
      clock_timestamp(),'completed',jsonb_build_object('resultState',d.state,'resultRevision',d.revision)) returning * into op;
  return jsonb_build_object('operationId',op.id,'state',d.state,'revision',d.revision,'recovered',false);
end $$;

create or replace function public.ebay_seller_operation_complete_v1(
  p_actor uuid,p_operation_id uuid,p_claim_nonce uuid,p_receipt jsonb,
  p_review_json text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare op public.ebay_seller_operations_v1; d public.ebay_seller_drafts_v1;
  owned public.vault_item_instances; reviewed jsonb; review_digest text; next_state text;
begin
  op:=public.ebay_seller_operation_lock_v1(p_actor,p_operation_id,p_claim_nonce);
  if op.status<>'running' then return jsonb_build_object('status',op.status,'recovered',true); end if;
  if op.lease_until<=clock_timestamp() then
    return public.ebay_seller_operation_fail_v1(p_actor,op.id,p_claim_nonce,true,'seller_operation_result_uncertain');
  end if;
  if p_receipt is null or jsonb_typeof(p_receipt)<>'object' or octet_length(p_receipt::text)>100000 then
    raise exception 'seller_operation_receipt_invalid' using errcode='22023';
  end if;
  select * into strict d from public.ebay_seller_drafts_v1 where id=op.draft_id;
  select * into strict owned from public.vault_item_instances where id=d.instance_id;
  if d.revision<>op.expected_revision then raise exception 'seller_draft_revision_conflict' using errcode='40001'; end if;
  if op.kind='prepare' then
    if op.stage<>'fees_started' or p_review_json is null or octet_length(p_review_json)>1000000
        or d.state<>'preparing' or owned.archived_at is not null
        or d.copy_identity<>public.ebay_seller_copy_identity_v1(owned)
        or exists(select 1 from public.vault_item_instance_dispositions where vault_item_instance_id=owned.id) then
      raise exception 'seller_review_changed' using errcode='40001';
    end if;
    reviewed:=p_review_json::jsonb;
    review_digest:=encode(extensions.digest(convert_to(p_review_json,'UTF8'),'sha256'),'hex');
    if jsonb_typeof(reviewed) is distinct from 'object'
        or reviewed->>'actorId' is distinct from p_actor::text
        or reviewed->>'draftId' is distinct from d.id::text
        or reviewed->>'sellerAccountId' is distinct from d.account_id::text
        or reviewed->'revision' is distinct from to_jsonb(d.revision)
        or reviewed->'copyIdentity' is distinct from d.copy_identity
        or reviewed->'slabEvidence' is distinct from
          coalesce(public.ebay_seller_slab_evidence_v1(owned.slab_cert_id),'null'::jsonb)
        or (reviewed-'offerId'-'feeQuote') is distinct from op.snapshot->'preparation'
        or reviewed->>'offerId' is distinct from d.offer_id
        or reviewed#>>'{offer,sku}' is distinct from d.sku
        or reviewed#>>'{offer,marketplaceId}' is distinct from 'EBAY_US'
        or reviewed#>>'{offer,format}' is distinct from 'FIXED_PRICE'
        or reviewed#>'{offer,availableQuantity}' is distinct from '1'::jsonb
        or reviewed#>>'{feeQuote,offerId}' is distinct from d.offer_id
        or jsonb_typeof(reviewed->'feeQuote') is distinct from 'object'
        or reviewed->'feeQuote' is distinct from p_receipt->'feeQuote'
        or p_receipt->>'reviewHash' is distinct from review_digest then
      raise exception 'seller_review_receipt_invalid' using errcode='22023';
    end if;
    update public.ebay_seller_drafts_v1 set state='prepared',prepared_snapshot=reviewed,
      review_hash=review_digest,prepared_revision=revision,fee_quote=reviewed->'feeQuote',
      error_code=null,updated_at=clock_timestamp() where id=d.id;
    next_state:='prepared';
  elsif op.kind='publish' then
    if op.stage<>'publish_started' or d.state<>'publishing'
        or d.review_hash is distinct from op.expected_hash
        or p_receipt->>'offerId' is distinct from d.offer_id
        or p_receipt->>'listingId' is null or p_receipt->>'listingId' !~ '^[A-Za-z0-9_-]{1,100}$'
        or not exists(select 1 from public.ebay_seller_reservations_v1
          where draft_id=d.id and publication_operation_id=op.id and released_at is null) then
      raise exception 'seller_publication_receipt_invalid' using errcode='22023';
    end if;
    update public.ebay_seller_drafts_v1 set state='live',listing_id=p_receipt->>'listingId',
      error_code=null,updated_at=clock_timestamp() where id=d.id;
    next_state:='live';
  elsif op.kind='withdraw' then
    if op.stage<>'withdraw_started' or p_receipt->>'offerId' is distinct from d.offer_id
        or p_receipt->>'listingId' is distinct from d.listing_id
        or p_receipt->>'listingId' is null or p_receipt->>'evidence' is distinct from 'withdraw_response' then
      raise exception 'seller_withdrawal_receipt_invalid' using errcode='22023';
    end if;
    update public.ebay_seller_reservations_v1 set released_at=clock_timestamp(),
      release_operation_id=op.id,release_evidence=p_receipt where draft_id=d.id and released_at is null;
    if not found then raise exception 'seller_reservation_required' using errcode='55000'; end if;
    update public.ebay_seller_drafts_v1 set state='withdrawn',error_code=null,updated_at=clock_timestamp() where id=d.id;
    next_state:='withdrawn';
  else
    -- Read evidence alone never releases a publication reservation. A matching
    -- observed listing can recover its identity after a lost publish response.
    if op.stage<>'observing' or p_receipt->>'sku' is distinct from d.sku
        or p_receipt->>'offerId' is null or p_receipt->>'offerId' !~ '^[A-Za-z0-9_-]{1,100}$'
        or (d.offer_id is not null and p_receipt->>'offerId'<>d.offer_id)
        or (d.listing_id is not null and p_receipt->>'listingId' is distinct from d.listing_id)
        or p_receipt->>'releasesReservation' is distinct from 'false'
        or p_receipt->>'state' is null
        or p_receipt->>'state' not in ('unpublished','active','out_of_stock','inactive',
          'ended','ebay_ended','not_listed','sale_reported','on_hold') then
      raise exception 'seller_observation_invalid' using errcode='22023';
    end if;
    update public.ebay_seller_drafts_v1 set offer_id=p_receipt->>'offerId',updated_at=clock_timestamp() where id=d.id;
    if p_receipt->>'listingId' is not null then
      if p_receipt->>'listingId' !~ '^[A-Za-z0-9_-]{1,100}$' then
        raise exception 'seller_observation_invalid' using errcode='22023';
      end if;
      update public.ebay_seller_drafts_v1 set offer_id=p_receipt->>'offerId',listing_id=p_receipt->>'listingId',
        state=case when p_receipt->>'state'='sale_reported' then 'sale_reported'
          when p_receipt->>'state'='active' and exists(select 1 from public.ebay_seller_reservations_v1
            where draft_id=d.id and released_at is null) then 'live' else state end,
        error_code=null,updated_at=clock_timestamp() where id=d.id;
    end if;
    if d.listing_id is not null and p_receipt->>'listingId'=d.listing_id
        and p_receipt->>'providerEnded'='true' and p_receipt->>'soldQuantity'='0'
        and p_receipt->>'providerStatus' in ('ENDED','EBAY_ENDED') then
      update public.ebay_seller_reservations_v1 set released_at=clock_timestamp(),
        release_operation_id=op.id,release_evidence=p_receipt where draft_id=d.id and released_at is null;
      if found then
        update public.ebay_seller_drafts_v1 set state='ended',updated_at=clock_timestamp() where id=d.id;
      end if;
    end if;
    select state into next_state from public.ebay_seller_drafts_v1 where id=d.id;
  end if;
  update public.ebay_seller_operations_v1 set status='succeeded',stage='completed',
    receipts=receipts||jsonb_build_array(jsonb_build_object('stage','completed','at',clock_timestamp(),'evidence',p_receipt)),
    updated_at=clock_timestamp() where id=op.id;
  return jsonb_build_object('status','succeeded','state',next_state,'recovered',false);
end $$;

-- This owner-authenticated closeout calls the existing canonical sale writer.
-- It neither impersonates an owner with a service token nor writes a second
-- disposition implementation. Release, sale and archive commit atomically.
create or replace function public.ebay_seller_record_sale_v1(
  p_draft_id uuid,p_request_id uuid,p_expected_revision bigint,
  p_sale_price_cents integer,p_confirmed boolean
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid(); d public.ebay_seller_drafts_v1;
  op public.ebay_seller_operations_v1; proof public.ebay_seller_operations_v1;
  owned public.vault_item_instances; evidence jsonb; result jsonb; instant timestamptz:=clock_timestamp();
begin
  if actor is null or coalesce(auth.role(),'')<>'authenticated' then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  perform 1 from auth.users where id=actor for key share;
  if not found then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_request_id is null or p_expected_revision is null or p_expected_revision<1
      or p_sale_price_cents is null or p_sale_price_cents not between 1 and 100000000
      or p_confirmed is distinct from true then
    raise exception 'seller_confirmed_sale_amount_required' using errcode='22023';
  end if;
  select * into d from public.ebay_seller_drafts_v1 where id=p_draft_id and user_id=actor;
  if not found then raise exception 'seller_draft_not_owned' using errcode='42501'; end if;
  select * into strict owned from public.vault_item_instances where id=d.instance_id and user_id=actor for update;
  perform pg_advisory_xact_lock(hashtextextended('ebay-seller-account:'||d.account_id::text,0));
  select * into strict d from public.ebay_seller_drafts_v1 where id=d.id for update;
  select * into op from public.ebay_seller_operations_v1 where user_id=actor and request_id=p_request_id;
  if found then
    if op.kind<>'record_sale' or op.draft_id<>d.id or op.expected_revision<>p_expected_revision
        or op.snapshot->'salePriceCents' is distinct from to_jsonb(p_sale_price_cents) then
      raise exception 'seller_request_id_conflict' using errcode='22023';
    end if;
    return jsonb_build_object('status',op.status,'state','sold','result',op.snapshot->'result','recovered',true);
  end if;
  if d.revision<>p_expected_revision or d.state<>'sale_reported' or d.listing_id is null
      or owned.archived_at is not null or d.copy_identity<>public.ebay_seller_copy_identity_v1(owned)
      or exists(select 1 from public.ebay_seller_operations_v1 where account_id=d.account_id and status='running') then
    raise exception 'seller_sale_closeout_not_ready' using errcode='55000';
  end if;
  select * into proof from public.ebay_seller_operations_v1 where draft_id=d.id and kind='reconcile'
    and status='succeeded' and expected_revision=d.revision and updated_at>=instant-interval '120 seconds'
    order by updated_at desc,id desc limit 1;
  if not found then raise exception 'seller_fresh_ended_sale_receipt_required' using errcode='55000'; end if;
  select entry->'evidence' into evidence from jsonb_array_elements(proof.receipts) entry
    where entry->>'stage'='completed';
  if evidence->>'offerId' is distinct from d.offer_id or evidence->>'listingId' is distinct from d.listing_id
      or evidence->>'sku' is distinct from d.sku or evidence->>'state' is distinct from 'sale_reported'
      or evidence->>'providerEnded' is distinct from 'true' or evidence->>'soldQuantity' is distinct from '1'
      or evidence->>'providerStatus' is null or evidence->>'providerStatus' not in ('ENDED','EBAY_ENDED') then
    raise exception 'seller_fresh_ended_sale_receipt_required' using errcode='55000';
  end if;
  insert into public.ebay_seller_operations_v1(request_id,draft_id,user_id,account_id,kind,status,
    expected_revision,lease_until,stage,snapshot)
    values(p_request_id,d.id,actor,d.account_id,'record_sale','succeeded',d.revision,instant,'completed',
      jsonb_build_object('source','collector_recorded_ebay_sale','salePriceCents',p_sale_price_cents,
        'currency','USD','providerObservationId',proof.id,'listingId',d.listing_id)) returning * into op;
  update public.ebay_seller_reservations_v1 set released_at=instant,release_operation_id=op.id,
    release_evidence=evidence||jsonb_build_object('collectorConfirmedSale',true,'salePriceCents',p_sale_price_cents)
    where draft_id=d.id and released_at is null;
  if not found then raise exception 'seller_reservation_required' using errcode='55000'; end if;
  result:=public.vault_record_exact_instance_disposition_v2(d.instance_id,'sale',
    p_sale_price_cents::numeric/100,'USD','eBay',null,null,null,null);
  if result->>'archived_instance_id' is distinct from d.instance_id::text
      or result->>'disposition_type' is distinct from 'sale' or result->>'disposition_id' is null then
    raise exception 'seller_sale_readback_invalid' using errcode='55000';
  end if;
  update public.ebay_seller_operations_v1 set snapshot=snapshot||jsonb_build_object('result',result),
    receipts=jsonb_build_array(jsonb_build_object('stage','completed','at',instant,'evidence',evidence)) where id=op.id;
  update public.ebay_seller_drafts_v1 set state='sold',error_code=null,updated_at=instant where id=d.id;
  return jsonb_build_object('status','succeeded','state','sold','result',result,'recovered',false);
end $$;

-- Explicit owner projection: no tokens, OAuth capabilities, nonces, leases or
-- provider identity containers. Prepared data is the owner's reviewed listing.
create or replace function public.ebay_seller_draft_status_v1(p_draft_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare d public.ebay_seller_drafts_v1; photos jsonb; operations jsonb; recorded_sale jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into d from public.ebay_seller_drafts_v1 where id=p_draft_id and user_id=auth.uid();
  if not found then raise exception 'seller_draft_not_owned' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'state',
    case when state in ('awaiting_upload','ready') then
      case when public.ebay_seller_photo_uploaded_v1(p) then 'ready' else 'awaiting_upload' end
      else state end,'path',storage_path)
    order by created_at,id),'[]') into photos from public.ebay_seller_photos_v1
    p where draft_id=d.id and state<>'removed';
  select coalesce(jsonb_agg(item order by created_at desc,id desc),'[]') into operations from (
    select id,created_at,jsonb_build_object('id',id,'requestId',request_id,'kind',kind,'status',status,
      'stage',stage,'errorCode',error_code,'continuationReady',status='running' and handoff_ready,
      'expectedRevision',expected_revision,'createdAt',created_at,'updatedAt',updated_at) as item
    from public.ebay_seller_operations_v1 where draft_id=d.id order by created_at desc,id desc limit 20
  ) recent;
  select jsonb_build_object('priceCents',snapshot->'salePriceCents','currency','USD',
    'recordedAt',snapshot#>'{result,recorded_at}','dispositionId',snapshot#>'{result,disposition_id}')
    into recorded_sale from public.ebay_seller_operations_v1 where draft_id=d.id
      and kind='record_sale' and status='succeeded' order by created_at desc,id desc limit 1;
  return jsonb_build_object('id',d.id,'instanceId',d.instance_id,'accountId',d.account_id,
    'revision',d.revision,'state',d.state,'input',d.input,'copyIdentity',d.copy_identity,
    'prepared',d.prepared_snapshot,'reviewHash',d.review_hash,'feeQuote',d.fee_quote,
    'offerId',d.offer_id,'listingId',d.listing_id,'errorCode',d.error_code,
    'photos',photos,'operations',operations,'recordedSale',recorded_sale,'updatedAt',d.updated_at);
end $$;

-- Safe owner status is the only authenticated seller-account projection.
create or replace function public.ebay_seller_account_status_v1()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb; c public.ebay_seller_controls_v1; admitted boolean;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select jsonb_build_object('accountId',id,'username',ebay_username,'environment',environment,
    'linked',is_active and provider_user_id is not null,
    'reconnectRequired',not is_active or provider_user_id is null
      or token_state in ('uncertain','reconnect_required')
      or (token_state='refreshing' and refresh_lease_until<=now()),
    'updatedAt',updated_at) into result from public.ebay_accounts
    where user_id=auth.uid() and environment='production' order by created_at desc limit 1;
  select * into strict c from public.ebay_seller_controls_v1 where singleton;
  admitted:=cardinality(c.canary_actor_ids)=0 or auth.uid()=any(c.canary_actor_ids);
  return coalesce(result,jsonb_build_object('linked',false,'reconnectRequired',false))
    ||jsonb_build_object('linkingEnabled',c.linking_enabled and admitted,
      'preparationEnabled',c.preparation_enabled and admitted,
      'publicationEnabled',c.publication_enabled and admitted);
end $$;

create or replace function public.ebay_seller_workspace_v1(p_instance_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare copies jsonb; drafts jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_instance_id is not null then
    select jsonb_build_object('id',i.id,'gvviId',i.gv_vi_id,'condition',i.condition_label,
      'isGraded',i.is_graded,'grader',i.grade_company,'grade',i.grade_value,'isArchived',i.archived_at is not null,
      'cardPrintId',coalesce(i.card_print_id,sc.card_print_id),'cardPrintingId',i.card_printing_id,
      'name',cp.name,'gvId',cp.gv_id,'setCode',cp.set_code,'number',cp.number)
      into copies from public.vault_item_instances i left join public.slab_certs sc on sc.id=i.slab_cert_id
        join public.card_prints cp on cp.id=coalesce(i.card_print_id,sc.card_print_id)
      where i.id=p_instance_id and i.user_id=auth.uid();
    if copies is null then raise exception 'seller_exact_active_copy_required' using errcode='42501'; end if;
  end if;
  select coalesce(jsonb_agg(item order by updated_at desc,id desc),'[]') into drafts from (
    select id,updated_at,jsonb_build_object('id',id,'instanceId',instance_id,'state',state,
      'revision',revision,'title',input->>'title','updatedAt',updated_at) item
    from public.ebay_seller_drafts_v1 where user_id=auth.uid()
      and (p_instance_id is null or instance_id=p_instance_id)
    order by updated_at desc,id desc limit 50
  ) recent;
  return jsonb_build_object('account',public.ebay_seller_account_status_v1(),'copy',copies,'drafts',drafts);
end $$;

alter table public.ebay_seller_controls_v1 enable row level security;
alter table public.ebay_seller_control_events_v1 enable row level security;
alter table public.ebay_seller_oauth_attempts_v1 enable row level security;
alter table public.ebay_seller_token_refreshes_v1 enable row level security;
alter table public.ebay_seller_drafts_v1 enable row level security;
alter table public.ebay_seller_photos_v1 enable row level security;
alter table public.ebay_seller_operations_v1 enable row level security;
alter table public.ebay_seller_reservations_v1 enable row level security;
revoke all on public.ebay_seller_controls_v1,public.ebay_seller_control_events_v1,
  public.ebay_seller_oauth_attempts_v1,public.ebay_seller_drafts_v1,
  public.ebay_seller_photos_v1,public.ebay_seller_operations_v1,
  public.ebay_seller_reservations_v1,public.ebay_seller_token_refreshes_v1 from public,anon,authenticated;
revoke all on public.ebay_seller_controls_v1,public.ebay_seller_control_events_v1,
  public.ebay_seller_oauth_attempts_v1,public.ebay_seller_drafts_v1,
  public.ebay_seller_photos_v1,public.ebay_seller_operations_v1,
  public.ebay_seller_reservations_v1,public.ebay_seller_token_refreshes_v1 from service_role;
grant select on public.ebay_seller_controls_v1,
  public.ebay_seller_control_events_v1,public.ebay_seller_oauth_attempts_v1,
  public.ebay_seller_drafts_v1,public.ebay_seller_photos_v1,
  public.ebay_seller_operations_v1,public.ebay_seller_reservations_v1,
  public.ebay_seller_token_refreshes_v1 to service_role;

do $seller_permissions$
declare f record;
begin
  for f in select p.oid::regprocedure as signature from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'ebay_seller_%_v1'
  loop
    execute format('revoke all on function %s from public, anon, authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $seller_permissions$;
grant execute on function public.ebay_seller_account_status_v1() to authenticated;
grant execute on function public.ebay_seller_draft_status_v1(uuid) to authenticated;
grant execute on function public.ebay_seller_workspace_v1(uuid) to authenticated;
grant execute on function public.ebay_seller_record_sale_v1(uuid,uuid,bigint,integer,boolean) to authenticated;
grant execute on function public.ebay_seller_photo_path_authorized_v1(text,boolean) to authenticated;

commit;
