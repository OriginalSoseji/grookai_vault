-- Accept the current and legacy eBay EPS URL shapes from the pinned eBay CDN.
begin;

do $$
declare actual text;
begin
  select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),
    'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex')
    into actual
  from pg_proc p
  where p.oid='public.ebay_seller_photo_receipt_v1(uuid,uuid,uuid,uuid,text,jsonb)'::regprocedure;
  if actual is distinct from '61f8e92bf269d086675a485dd46cd7c01f040983f701d0320768033ef741c28a' then
    raise exception 'ebay_seller_photo_receipt_source_drift';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.ebay_seller_photos_v1'::regclass
      and conname='ebay_seller_photos_v1_image_url_check'
      and pg_get_constraintdef(oid) = 'CHECK ((image_url ~ ''^https://i[.]ebayimg[.]com/images/[^?#]+$''::text))'
  ) then
    raise exception 'ebay_seller_photo_url_constraint_source_drift';
  end if;
end $$;

alter table public.ebay_seller_photos_v1
  drop constraint if exists ebay_seller_photos_v1_image_url_check;

alter table public.ebay_seller_photos_v1
  add constraint ebay_seller_photos_v1_image_url_check
  check (image_url ~ '^https://i[.]ebayimg[.]com/[^#[:cntrl:][:space:]]+$'
    and char_length(image_url) <= 2048) not valid;

alter table public.ebay_seller_photos_v1
  validate constraint ebay_seller_photos_v1_image_url_check;

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
        or p_receipt->>'imageUrl' is null or char_length(p_receipt->>'imageUrl') > 2048 or p_receipt->>'imageUrl' !~ '^https://i[.]ebayimg[.]com/[^#[:cntrl:][:space:]]+$'
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

do $$
declare p pg_proc; actual text;
begin
  select * into strict p from pg_proc
    where oid='public.ebay_seller_photo_receipt_v1(uuid,uuid,uuid,uuid,text,jsonb)'::regprocedure;
  if pg_get_userbyid(p.proowner) <> 'postgres'
      or p.proacl::text is distinct from '{postgres=X/postgres,service_role=X/postgres}'
      or not p.prosecdef or p.proconfig is distinct from array['search_path=""']::text[]
      or position('^https://i[.]ebayimg[.]com/[^#[:cntrl:][:space:]]+' in pg_get_functiondef(p.oid)) = 0 then
    raise exception 'ebay_seller_photo_receipt_postcondition_failed';
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.ebay_seller_photos_v1'::regclass
      and conname='ebay_seller_photos_v1_image_url_check' and convalidated
      and pg_get_constraintdef(oid) like '%char_length(image_url) <= 2048%'
  ) or exists (
    select 1 from public.ebay_seller_photos_v1
    where image_url is not null
      and (image_url !~ '^https://i[.]ebayimg[.]com/[^#[:cntrl:][:space:]]+$'
        or char_length(image_url) > 2048)
  ) then
    raise exception 'ebay_seller_photo_url_constraint_postcondition_failed';
  end if;
  select encode(sha256(convert_to((jsonb_build_object('definition',pg_get_functiondef(p.oid),
    'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))::text,'UTF8')),'hex') into actual;
  if actual is distinct from '3791d779c7cffa18bfe924c2dbbd6d9e8acc84b9c7cf0d6d77ce1783ebec75eb' then
    raise exception 'ebay_seller_photo_receipt_result_drift';
  end if;
end $$;

commit;
