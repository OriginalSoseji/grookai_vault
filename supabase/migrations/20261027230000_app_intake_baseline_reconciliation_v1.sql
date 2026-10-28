begin;
-- APP_INTAKE_BASELINE_RECONCILIATION_V1
-- Reconcile the 476-version source replay with already-deployed public metadata.
-- Preserve exact captured function text, including CRLF inside function bodies.
-- No function text is normalized in the qualification comparison.
-- No new grants, ownership, RLS, table/data/identity/pricing writes are included.
set local search_path=pg_catalog,public,extensions;
do $guard$
declare v record; v_acl jsonb;
begin
  select p.oid,p.proacl,pg_get_userbyid(p.proowner) as owner,encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex') as definition_hash
    into v from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='lot_label_public_read_v1' and pg_get_function_identity_arguments(p.oid)='p_public_id uuid';
  if not found then raise exception 'baseline_reconciliation_function_missing'; end if;
  select coalesce(jsonb_agg(value order by value),'[]'::jsonb) into v_acl from (select a::text value from unnest(v.proacl) a) q;
  if v.definition_hash not in ('cfa826888834dbe6861a7ddf52c86fd9d5474e8d2e614b67bec98307bf28a6c2','8955ff443a08dd273ff012c8558339261a0b9b51f926a31c51530bd377e97b5b') or v.owner<>'postgres' or v_acl is distinct from '["anon=X/postgres","authenticated=X/postgres","postgres=X/postgres","service_role=X/postgres"]'::jsonb then
    raise exception 'baseline_reconciliation_function_drift';
  end if;
  select p.oid,p.proacl,pg_get_userbyid(p.proowner) as owner,encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex') as definition_hash
    into v from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='lot_label_record_sale_v1' and pg_get_function_identity_arguments(p.oid)='p_public_id uuid, p_amount_cents integer, p_condition_label text, p_quantity integer, p_notes text';
  if not found then raise exception 'baseline_reconciliation_function_missing'; end if;
  select coalesce(jsonb_agg(value order by value),'[]'::jsonb) into v_acl from (select a::text value from unnest(v.proacl) a) q;
  if v.definition_hash not in ('d35346960ca98caac4b03c2c029ecfdac7318ca0dfbf422fc9505e998434c8cd','1156db178c43be772f8b42e746c4f7a5ae7f45d2763f0b5e32401c43d68a0b52') or v.owner<>'postgres' or v_acl is distinct from '["anon=X/postgres","authenticated=X/postgres","postgres=X/postgres","service_role=X/postgres"]'::jsonb then
    raise exception 'baseline_reconciliation_function_drift';
  end if;
  select p.oid,p.proacl,pg_get_userbyid(p.proowner) as owner,encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex') as definition_hash
    into v from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='vendor_receipt_delivery_capabilities_v1' and pg_get_function_identity_arguments(p.oid)='';
  if not found then raise exception 'baseline_reconciliation_function_missing'; end if;
  select coalesce(jsonb_agg(value order by value),'[]'::jsonb) into v_acl from (select a::text value from unnest(v.proacl) a) q;
  if v.definition_hash not in ('7571473f1984c01225295b6ebb75e2e1d1665fc3d855a9b6475072c4758a9222','8652f23fc3e48f8d2f1a093c25a35d02674bab36be61f8cffb82c58d5433782e') or v.owner<>'postgres' or v_acl is distinct from '["authenticated=X/postgres","postgres=X/postgres","service_role=X/postgres"]'::jsonb then
    raise exception 'baseline_reconciliation_function_drift';
  end if;
  select p.oid,p.proacl,pg_get_userbyid(p.proowner) as owner,encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex') as definition_hash
    into v from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='vendor_receipt_delivery_claim_v1' and pg_get_function_identity_arguments(p.oid)='p_owner_id uuid, p_id uuid';
  if not found then raise exception 'baseline_reconciliation_function_missing'; end if;
  select coalesce(jsonb_agg(value order by value),'[]'::jsonb) into v_acl from (select a::text value from unnest(v.proacl) a) q;
  if v.definition_hash not in ('c157cfe7889c82033fa86acbf0bd76d71c37ed475a0673e639b847274616203b','66caec50a08b9a0b7c5b298464092b0959b39adfba0a50c8eeeaf1aea02240ae') or v.owner<>'postgres' or v_acl is distinct from '["postgres=X/postgres","service_role=X/postgres"]'::jsonb then
    raise exception 'baseline_reconciliation_function_drift';
  end if;
  select p.oid,p.proacl,pg_get_userbyid(p.proowner) as owner,encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex') as definition_hash
    into v from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='vendor_receipt_delivery_finish_v1' and pg_get_function_identity_arguments(p.oid)='p_id uuid, p_claim_token uuid, p_status text, p_provider_id text, p_failure_code text';
  if not found then raise exception 'baseline_reconciliation_function_missing'; end if;
  select coalesce(jsonb_agg(value order by value),'[]'::jsonb) into v_acl from (select a::text value from unnest(v.proacl) a) q;
  if v.definition_hash not in ('b2f5fe0a1592cabc5b59bfd263999d1110c7943c47dbaf5f13a8b519c13b8341','313d07c57daed85f5793b46d4e3af9e2a6931596c6b87a71595788fe9074ff06') or v.owner<>'postgres' or v_acl is distinct from '["postgres=X/postgres","service_role=X/postgres"]'::jsonb then
    raise exception 'baseline_reconciliation_function_drift';
  end if;
  select p.oid,p.proacl,pg_get_userbyid(p.proowner) as owner,encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex') as definition_hash
    into v from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='vendor_receipt_delivery_poll_v1' and pg_get_function_identity_arguments(p.oid)='p_owner_id uuid, p_id uuid';
  if not found then raise exception 'baseline_reconciliation_function_missing'; end if;
  select coalesce(jsonb_agg(value order by value),'[]'::jsonb) into v_acl from (select a::text value from unnest(v.proacl) a) q;
  if v.definition_hash not in ('b23095afebb0a46785eff252524609fc096318c450c5e01d6c74262e378e96cd','dca6733026bb1148a91fb4765023d8047b35ebfc1964b3d4b29296b291a1fdf6') or v.owner<>'postgres' or v_acl is distinct from '["postgres=X/postgres","service_role=X/postgres"]'::jsonb then
    raise exception 'baseline_reconciliation_function_drift';
  end if;
  select p.oid,p.proacl,pg_get_userbyid(p.proowner) as owner,encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex') as definition_hash
    into v from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='vendor_receipt_delivery_read_v1' and pg_get_function_identity_arguments(p.oid)='p_receipt_id uuid';
  if not found then raise exception 'baseline_reconciliation_function_missing'; end if;
  select coalesce(jsonb_agg(value order by value),'[]'::jsonb) into v_acl from (select a::text value from unnest(v.proacl) a) q;
  if v.definition_hash not in ('eecbfd8448f991d15bc8d20075cefee2144356bdb19301c7ecae4ebe136a8da7','1f14ca270a30bf4020ac92acbcdc413efa3b28f63016240735f41fca9c0b7a40') or v.owner<>'postgres' or v_acl is distinct from '["authenticated=X/postgres","postgres=X/postgres","service_role=X/postgres"]'::jsonb then
    raise exception 'baseline_reconciliation_function_drift';
  end if;
  select p.oid,p.proacl,pg_get_userbyid(p.proowner) as owner,encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex') as definition_hash
    into v from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='vendor_receipt_delivery_request_v1' and pg_get_function_identity_arguments(p.oid)='p_request_id uuid, p_receipt_id uuid, p_channel text, p_destination text';
  if not found then raise exception 'baseline_reconciliation_function_missing'; end if;
  select coalesce(jsonb_agg(value order by value),'[]'::jsonb) into v_acl from (select a::text value from unnest(v.proacl) a) q;
  if v.definition_hash not in ('a69bd7030de18fdaf44015fee50c0289ba5afdc4b5321d1cbd1c76933cbd184c','219eb2a9274054ddf3021ac35e6f0751ae8abbf8cbb44c486d2fa9f658a5e0de') or v.owner<>'postgres' or v_acl is distinct from '["authenticated=X/postgres","postgres=X/postgres","service_role=X/postgres"]'::jsonb then
    raise exception 'baseline_reconciliation_function_drift';
  end if;
  select p.oid,p.proacl,pg_get_userbyid(p.proowner) as owner,encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex') as definition_hash
    into v from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='vendor_receipt_delivery_settle_v1' and pg_get_function_identity_arguments(p.oid)='p_owner_id uuid, p_id uuid, p_provider_id text, p_status text';
  if not found then raise exception 'baseline_reconciliation_function_missing'; end if;
  select coalesce(jsonb_agg(value order by value),'[]'::jsonb) into v_acl from (select a::text value from unnest(v.proacl) a) q;
  if v.definition_hash not in ('3ef6bfd1a58c1279b5ac88228095659041b1850484c38df6cc8be2dd5e98f0b9','abfc2b8c07088cf31bd9bc586cd2e77064699db738486ba006c4c913d6ccc5f6') or v.owner<>'postgres' or v_acl is distinct from '["postgres=X/postgres","service_role=X/postgres"]'::jsonb then
    raise exception 'baseline_reconciliation_function_drift';
  end if;
  select p.oid,p.proacl,pg_get_userbyid(p.proowner) as owner,encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex') as definition_hash
    into v from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='vendor_receipt_delivery_view_v1' and pg_get_function_identity_arguments(p.oid)='d vendor_receipt_deliveries';
  if not found then raise exception 'baseline_reconciliation_function_missing'; end if;
  select coalesce(jsonb_agg(value order by value),'[]'::jsonb) into v_acl from (select a::text value from unnest(v.proacl) a) q;
  if v.definition_hash not in ('dc10ee56bf0d6746584ed6b8d14109463b2ce88e5f19b2ac280db02e941f2dda','ddfa26bd6dba05f542dd7d4f5b9af37ccd2199f5056a8fd1ca4d827e719f3c09') or v.owner<>'postgres' or v_acl is distinct from '["postgres=X/postgres","service_role=X/postgres"]'::jsonb then
    raise exception 'baseline_reconciliation_function_drift';
  end if;
  if to_regclass('public.market_listing_price_events_slab_identity_idx') is not null and pg_get_indexdef(to_regclass('public.market_listing_price_events_slab_identity_idx'))<>'CREATE INDEX market_listing_price_events_slab_identity_idx ON public.market_listing_price_events USING btree (((event_payload ->> ''listing_evidence_class''::text))) WHERE ((event_payload ->> ''listing_evidence_class''::text) = ''slab''::text)' then
    raise exception 'baseline_reconciliation_index_drift';
  end if;
end;
$guard$;
CREATE INDEX IF NOT EXISTS market_listing_price_events_slab_identity_idx ON public.market_listing_price_events USING btree (((event_payload ->> 'listing_evidence_class'::text))) WHERE ((event_payload ->> 'listing_evidence_class'::text) = 'slab'::text);

CREATE OR REPLACE FUNCTION public.lot_label_public_read_v1(p_public_id uuid)
 RETURNS TABLE(public_id uuid, name text, slug text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select lots.public_id, lots.name, lots.slug, lots.created_at
  from public.lot_label_lots lots
  where lots.public_id = p_public_id;
$function$;

CREATE OR REPLACE FUNCTION public.lot_label_record_sale_v1(p_public_id uuid, p_amount_cents integer, p_condition_label text DEFAULT 'NM'::text, p_quantity integer DEFAULT 1, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_sale_id uuid;
begin
  if auth.uid() is null then
    raise exception 'lot_label_auth_required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.lot_label_lots
    where public_id = p_public_id and owner_user_id = auth.uid()
  ) then
    raise exception 'lot_label_not_owned' using errcode = '42501';
  end if;
  insert into public.lot_label_sales (
    lot_public_id, recorded_by_user_id, amount_cents, condition_label, quantity, notes
  ) values (
    p_public_id, auth.uid(), p_amount_cents, upper(coalesce(p_condition_label, 'NM')),
    coalesce(p_quantity, 1), nullif(btrim(p_notes), '')
  ) returning id into v_sale_id;
  return v_sale_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.vendor_receipt_delivery_capabilities_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 return (select jsonb_build_object('email',c.email_enabled and b.enabled,'sms',c.sms_enabled and b.enabled)
   from public.vendor_receipt_delivery_control c cross join public.vendor_receipt_cloud_control b where c.singleton and b.singleton);
end; $function$;

CREATE OR REPLACE FUNCTION public.vendor_receipt_delivery_claim_v1(p_owner_id uuid, p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.vendor_receipt_deliveries;
begin
 select * into d from public.vendor_receipt_deliveries where id=p_id and owner_id=p_owner_id for update;
 if not found or d.status<>'queued' then return null; end if;
 if not exists(select 1 from public.vendor_receipt_delivery_control c cross join public.vendor_receipt_cloud_control b
   where c.singleton and b.singleton and b.enabled and case d.channel when 'email' then c.email_enabled else c.sms_enabled end) then return null; end if;
 update public.vendor_receipt_deliveries set status='sending',claim_token=gen_random_uuid(),attempted_at=now(),updated_at=now()
   where id=d.id returning * into d;
 return to_jsonb(d);
end; $function$;

CREATE OR REPLACE FUNCTION public.vendor_receipt_delivery_finish_v1(p_id uuid, p_claim_token uuid, p_status text, p_provider_id text DEFAULT NULL::text, p_failure_code text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if p_status is null or p_status not in ('accepted','failed','uncertain')
   or (p_status='accepted' and (p_provider_id is null or length(p_provider_id) not between 1 and 100))
   or length(p_failure_code)>80 then raise exception 'Invalid delivery outcome' using errcode='22023'; end if;
 update public.vendor_receipt_deliveries set status=p_status,provider_id=p_provider_id,failure_code=p_failure_code,updated_at=now()
   where id=p_id and claim_token=p_claim_token and status='sending';
end; $function$;

CREATE OR REPLACE FUNCTION public.vendor_receipt_delivery_poll_v1(p_owner_id uuid, p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.vendor_receipt_deliveries;
begin
 update public.vendor_receipt_deliveries set checked_at=now()
   where id=p_id and owner_id=p_owner_id and status='accepted'
   and (checked_at is null or checked_at<now()-interval '30 seconds') returning * into d;
 if not found then return null; end if;
 return to_jsonb(d);
end; $function$;

CREATE OR REPLACE FUNCTION public.vendor_receipt_delivery_read_v1(p_receipt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(public.vendor_receipt_delivery_view_v1(d) order by d.created_at desc),'[]'::jsonb)
   from public.vendor_receipt_deliveries d where d.owner_id=auth.uid() and d.receipt_id=p_receipt_id);
end; $function$;

CREATE OR REPLACE FUNCTION public.vendor_receipt_delivery_request_v1(p_request_id uuid, p_receipt_id uuid, p_channel text, p_destination text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare actor uuid:=auth.uid(); saved jsonb; existing public.vendor_receipt_deliveries; target text:=btrim(p_destination); book jsonb;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_request_id is null or p_receipt_id is null or p_channel is null or p_channel not in ('email','sms') or target is null then
   raise exception 'Invalid receipt delivery' using errcode='22023'; end if;
 if (p_channel='email' and (length(target)>254 or target !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'))
   or (p_channel='sms' and target !~ '^\+[1-9][0-9]{7,14}$') or target ~ '[[:cntrl:]]' then
   raise exception 'Invalid destination' using errcode='22023'; end if;
 -- Serialize per-owner requests, including quota and different request IDs for the same receipt.
 select b.book into book from public.vendor_receipt_books b where b.owner_id=actor for update;
 select d.* into existing from public.vendor_receipt_deliveries d where d.owner_id=actor and d.request_id=p_request_id;
 if found then
   if existing.receipt_id<>p_receipt_id or existing.channel<>p_channel or existing.destination<>target then
     raise exception 'Request identity already used' using errcode='PT409'; end if;
   return public.vendor_receipt_delivery_view_v1(existing);
 end if;
 select d.* into existing from public.vendor_receipt_deliveries d
   where d.owner_id=actor and d.receipt_id=p_receipt_id and d.channel=p_channel and d.destination=target;
 if found then return public.vendor_receipt_delivery_view_v1(existing); end if;
 if not coalesce((public.vendor_receipt_delivery_capabilities_v1()->>p_channel)::boolean,false) then
   raise exception 'Receipt sending is unavailable' using errcode='42501'; end if;
 select entry->'receipt' into saved from jsonb_array_elements(book->'receipts') entry where entry->'receipt'->>'id'=p_receipt_id::text;
 if saved is null then raise exception 'Receipt unavailable' using errcode='42501'; end if;
 if (select count(*) from public.vendor_receipt_deliveries d where d.owner_id=actor and d.created_at>now()-interval '1 hour')>=100
   or (select count(*) from public.vendor_receipt_deliveries d where d.owner_id=actor and d.created_at>now()-interval '1 day')>=500 then
   raise exception 'Receipt sending limit reached' using errcode='PT429'; end if;
 insert into public.vendor_receipt_deliveries(owner_id,request_id,receipt_id,channel,destination,receipt)
   values(actor,p_request_id,p_receipt_id,p_channel,target,saved) returning * into existing;
 return public.vendor_receipt_delivery_view_v1(existing);
end; $function$;

CREATE OR REPLACE FUNCTION public.vendor_receipt_delivery_settle_v1(p_owner_id uuid, p_id uuid, p_provider_id text, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if p_status is null or p_status not in ('delivered','failed') then raise exception 'Invalid delivery status' using errcode='22023'; end if;
 update public.vendor_receipt_deliveries set status=p_status,updated_at=now()
   where id=p_id and owner_id=p_owner_id and provider_id=p_provider_id and status='accepted';
end; $function$;

CREATE OR REPLACE FUNCTION public.vendor_receipt_delivery_view_v1(d vendor_receipt_deliveries)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select jsonb_build_object('id',d.id,'receiptId',d.receipt_id,'channel',d.channel,
   'destination',d.destination,'status',case when d.status='sending' and d.attempted_at<now()-interval '2 minutes' then 'uncertain' else d.status end,
   'createdAt',d.created_at,'updatedAt',d.updated_at);
$function$;

commit;
