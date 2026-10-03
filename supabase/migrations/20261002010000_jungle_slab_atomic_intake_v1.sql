-- New intake only. Existing certificates/copies are never reassigned.
-- The backend authenticates the owner and obtains the PSA response itself.
begin;

create table public.jungle_slab_intake_receipts_v1 (
  user_id uuid not null,
  request_id uuid not null,
  instance_id uuid not null unique,
  anchor_id uuid not null unique,
  slab_cert_id uuid not null references public.slab_certs(id) on delete restrict,
  card_print_id uuid not null references public.card_prints(id) on delete restrict,
  card_printing_id uuid not null references public.card_printings(id) on delete restrict,
  cert_number text not null check (cert_number ~ '^[0-9]{1,32}$'),
  grade numeric not null check (grade between 1 and 10 and grade * 2 = trunc(grade * 2)),
  provider_payload jsonb not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  created_transaction xid8 not null default pg_current_xact_id(),
  created_at timestamptz not null default now(),
  primary key (user_id,request_id)
);
create index jungle_slab_intake_receipts_cert_v1 on public.jungle_slab_intake_receipts_v1(slab_cert_id);
-- Owner/copy IDs are historical observations, not FKs that block account deletion.
alter table public.jungle_slab_intake_receipts_v1 enable row level security;
revoke all on public.jungle_slab_intake_receipts_v1 from public,anon,authenticated,service_role;

create function public.guard_jungle_slab_receipt_v1()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'JUNGLE_SLAB_RECEIPT_IMMUTABLE'; end;
$$;
create trigger guard_jungle_slab_receipt_v1 before update or delete
  on public.jungle_slab_intake_receipts_v1 for each row
  execute function public.guard_jungle_slab_receipt_v1();

create function public.guard_jungle_slab_certificate_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.grader,new.cert_number,new.card_print_id,new.grade)
      is distinct from (old.grader,old.cert_number,old.card_print_id,old.grade)
    and exists (select 1 from public.jungle_slab_intake_receipts_v1 r where r.slab_cert_id=old.id) then
    raise exception 'JUNGLE_SLAB_CERTIFICATE_REBIND_FORBIDDEN';
  end if;
  return new;
end;
$$;
create trigger guard_jungle_slab_certificate_v1 before update on public.slab_certs
  for each row execute function public.guard_jungle_slab_certificate_v1();

-- Keep ordinary raw-card behavior. A slab printing additionally needs the exact
-- private receipt created by the single transaction below; direct inserts fail.
create or replace function public.assert_vault_item_instance_card_printing_parent_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
declare effective_parent uuid; printing_parent uuid; receipt public.jungle_slab_intake_receipts_v1%rowtype;
begin
  select * into receipt from public.jungle_slab_intake_receipts_v1 r where r.instance_id=case when tg_op='UPDATE' then old.id else new.id end;
  if found then
    if tg_op='INSERT' and receipt.created_transaction<>pg_current_xact_id() then
      raise exception 'JUNGLE_SLAB_RECEIPT_ALREADY_CONSUMED';
    end if;
    if new.id is distinct from receipt.instance_id or new.user_id is distinct from receipt.user_id or new.card_print_id is not null
      or new.slab_cert_id is distinct from receipt.slab_cert_id
      or new.card_printing_id is distinct from receipt.card_printing_id
      or new.legacy_vault_item_id is distinct from receipt.anchor_id
      or new.is_graded is distinct from true or new.grade_company is distinct from 'PSA'
      or new.grade_value is distinct from receipt.grade::text then
      raise exception 'JUNGLE_SLAB_INSTANCE_REBIND_FORBIDDEN';
    end if;
    select c.card_print_id into effective_parent from public.slab_certs c
      where c.id=receipt.slab_cert_id and c.normalized_grader='PSA'
        and c.normalized_cert_number=receipt.cert_number and c.grade=receipt.grade
        and c.card_print_id=receipt.card_print_id;
    if effective_parent is null then raise exception 'JUNGLE_SLAB_CERTIFICATE_DRIFT'; end if;
  else
    if new.card_printing_id is null then return new; end if;
    if new.card_print_id is null then raise exception 'card_printing_id requires card_print_id'; end if;
    effective_parent := new.card_print_id;
  end if;
  select p.card_print_id into printing_parent from public.card_printings p where p.id=new.card_printing_id;
  if printing_parent is distinct from effective_parent then
    raise exception 'card_printing_id does not belong to effective card_print_id';
  end if;
  return new;
end;
$$;
drop trigger trg_vault_item_instances_card_printing_parent_v1 on public.vault_item_instances;
create trigger trg_vault_item_instances_card_printing_parent_v1 before insert or update
  on public.vault_item_instances for each row
  execute function public.assert_vault_item_instance_card_printing_parent_v1();

-- Deliberately conservative supported PSA label grammar. Unknown labels stay
-- held. This checks the supplied observation, not its network authenticity.
create function public.assert_jungle_slab_observation_v1(
  p_card_print_id uuid,p_card_printing_id uuid,p_cert_number text,p_grade numeric,p_payload jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare
  card public.card_prints%rowtype; option jsonb; cert jsonb; k text; value text;
  subject text; variety text; card_name text; subject_finish text; variety_finish text;
  e record; f record; edition text; hits integer:=0; grade_text text;
begin
  select * into card from public.card_prints where id=p_card_print_id;
  select o into option from jsonb_array_elements(public.get_jungle_edition_resolution_v1(p_card_print_id)->'options') o
    where o->>'card_print_id'=p_card_print_id::text and o->>'card_printing_id'=p_card_printing_id::text;
  if option is null or card.identity_domain is distinct from 'pokemon_eng_standard'
    or card.set_code is distinct from 'base2' then raise exception 'JUNGLE_SLAB_SELECTION_INVALID'; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>16384
    or jsonb_typeof(p_payload->'PSACert') is distinct from 'object' then
    raise exception 'JUNGLE_SLAB_OBSERVATION_INVALID'; end if;
  foreach k in array array['IsValidRequest','isValidRequest'] loop
    if p_payload ? k and p_payload->k is distinct from 'true'::jsonb then
      raise exception 'JUNGLE_SLAB_OBSERVATION_INVALID'; end if;
  end loop;
  foreach k in array array['ServerMessage','serverMessage'] loop
    if p_payload ? k and p_payload->k is distinct from '"Request successful"'::jsonb then
      raise exception 'JUNGLE_SLAB_OBSERVATION_INVALID'; end if;
  end loop;
  cert:=p_payload->'PSACert';
  foreach k in array array['CertNumber','Year','Brand','Category','CardNumber','Subject','Variety'] loop
    if jsonb_typeof(cert->k) is distinct from 'string' or length(cert->>k)>512 then
      raise exception 'JUNGLE_SLAB_OBSERVATION_INVALID'; end if;
  end loop;
  if regexp_replace(cert->>'CertNumber','[[:space:]-]','','g') is distinct from p_cert_number
    or btrim(cert->>'Year')<>'1999' or cert->'IsPSADNA' is distinct from 'false'::jsonb
    or cert->'IsDualCert' is distinct from 'false'::jsonb
    or (cert ? 'ItemStatus' and cert->'ItemStatus'<>'null'::jsonb and cert->'ItemStatus'<>'""'::jsonb)
    or upper(regexp_replace(btrim(cert->>'Brand'),'[[:space:]]+',' ','g')) not in ('POKEMON JUNGLE','POKÉMON JUNGLE')
    or upper(regexp_replace(btrim(cert->>'Category'),'[[:space:]]+',' ','g'))<>'TCG CARDS'
    or btrim(cert->>'CardNumber') !~ '^#?0*([1-9]|[1-5][0-9]|6[0-4])([[:space:]]*/[[:space:]]*64)?$'
    or regexp_replace(split_part(btrim(cert->>'CardNumber'),'/',1),'[^0-9]','','g')::integer<>card.number_plain::integer then
    raise exception 'JUNGLE_SLAB_PRINTED_IDENTITY_MISMATCH'; end if;
  grade_text:=null;
  foreach k in array array['CardGrade','GradeDescription'] loop
    if cert ? k and cert->k<>'null'::jsonb and cert->k<>'""'::jsonb then
      if jsonb_typeof(cert->k)<>'string' or length(cert->>k)>512 then
        raise exception 'JUNGLE_SLAB_GRADE_MISMATCH'; end if;
      value:=substring(btrim(cert->>k) from '([0-9]+([.][0-9]+)?)$');
      if value is null or value::numeric<>p_grade then raise exception 'JUNGLE_SLAB_GRADE_MISMATCH'; end if;
      grade_text:=value;
    end if;
  end loop;
  if grade_text is null then raise exception 'JUNGLE_SLAB_GRADE_MISMATCH'; end if;
  card_name:=upper(regexp_replace(btrim(card.name),'[[:space:]]+',' ','g'));
  subject:=upper(regexp_replace(btrim(cert->>'Subject'),'[[:space:]]+',' ','g'));
  variety:=upper(regexp_replace(btrim(cert->>'Variety'),'[[:space:]]+',' ','g'));
  for f in select * from (values ('HOLO','holo'),('NON-HOLO','normal'),('NON HOLO','normal'),('NORMAL','normal')) x(label,finish) loop
    if subject in (card_name||'-'||f.label,card_name||' '||f.label) then subject_finish:=f.finish; end if;
  end loop;
  if subject<>card_name and subject_finish is null then raise exception 'JUNGLE_SLAB_SUBJECT_MISMATCH'; end if;
  for e in select * from (values ('1ST EDITION','first_edition'),('FIRST EDITION','first_edition'),
    ('UNLIMITED','unlimited'),('UNLIMITED EDITION','unlimited')) x(label,edition) loop
    if variety=e.label then hits:=hits+1; edition:=e.edition; end if;
    for f in select * from (values ('HOLO','holo'),('NON-HOLO','normal'),('NON HOLO','normal'),('NORMAL','normal')) x(label,finish) loop
      if variety in (e.label||' '||f.label,f.label||' '||e.label,f.label||'-'||e.label) then
        hits:=hits+1; edition:=e.edition; variety_finish:=f.finish;
      end if;
    end loop;
  end loop;
  if hits<>1 or edition is distinct from option->>'edition'
    or (subject_finish is not null and variety_finish is not null and subject_finish<>variety_finish)
    or coalesce(subject_finish,variety_finish) is distinct from option->>'finish_key' then
    raise exception 'JUNGLE_SLAB_EDITION_FINISH_MISMATCH'; end if;
end;
$$;

create function public.admin_jungle_slab_intake_v1(
  p_user_id uuid,p_request_id uuid,p_card_print_id uuid,p_card_printing_id uuid,
  p_cert_number text,p_grade numeric,p_provider_payload jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_cert_number text:=regexp_replace(p_cert_number,'[[:space:]-]','','g');
  payload_hash text:=encode(extensions.digest(p_provider_payload::text,'sha256'),'hex');
  receipt public.jungle_slab_intake_receipts_v1%rowtype;
  cert public.slab_certs%rowtype; card public.card_prints%rowtype; owner_row public.vault_owners%rowtype;
  instance_id uuid:=gen_random_uuid(); anchor_id uuid:=gen_random_uuid(); gvvi text; legacy_id uuid;
begin
  if p_user_id is null or p_request_id is null or p_card_print_id is null or p_card_printing_id is null
    or v_cert_number is null or v_cert_number !~ '^[0-9]{1,32}$' or p_grade is null
    or p_grade not between 1 and 10 or p_grade*2<>trunc(p_grade*2) or p_provider_payload is null then
    raise exception 'JUNGLE_SLAB_INPUT_INVALID'; end if;
  p_grade:=trim_scale(p_grade);
  -- Serialize retries and same-user allocation. The certificate lock also
  -- serializes intake by different owners without asserting global ownership.
  perform pg_advisory_xact_lock(hashtextextended('jungle-slab-owner:'||p_user_id::text,0));
  perform pg_advisory_xact_lock(hashtextextended('jungle-slab-cert:'||v_cert_number,0));
  perform 1 from auth.users where id=p_user_id for key share;
  if not found then raise exception 'JUNGLE_SLAB_OWNER_NOT_FOUND'; end if;
  select * into receipt from public.jungle_slab_intake_receipts_v1
    where user_id=p_user_id and request_id=p_request_id;
  if found then
    if (receipt.card_print_id,receipt.card_printing_id,receipt.cert_number,receipt.grade,receipt.payload_sha256)
      is distinct from (p_card_print_id,p_card_printing_id,v_cert_number,p_grade,payload_hash) then
      raise exception 'JUNGLE_SLAB_RETRY_CONFLICT'; end if;
    select i.gv_vi_id into gvvi from public.vault_item_instances i
      join public.vault_items a on a.id=i.legacy_vault_item_id
      join public.slab_certs c on c.id=i.slab_cert_id
      where i.id=receipt.instance_id and i.user_id=p_user_id and i.archived_at is null
        and i.card_print_id is null and i.card_printing_id=p_card_printing_id
        and i.slab_cert_id=receipt.slab_cert_id and i.is_graded and i.grade_company='PSA' and i.grade_value=p_grade::text
        and a.id=receipt.anchor_id and a.user_id=p_user_id and a.card_id=p_card_print_id and a.archived_at is null and a.qty=1
        and c.card_print_id=p_card_print_id and c.grade=p_grade and c.normalized_grader='PSA' and c.normalized_cert_number=v_cert_number
      for share of i,a,c;
    if not found then raise exception 'JUNGLE_SLAB_RETRY_STATE_CHANGED'; end if;
    return jsonb_build_object('instance_id',receipt.instance_id,'anchor_id',receipt.anchor_id,
      'slab_cert_id',receipt.slab_cert_id,'gv_vi_id',gvvi,'replayed',true);
  end if;
  -- Lock the whole governed pair while readiness and source labels are checked.
  select l.legacy_card_print_id into legacy_id from public.jungle_edition_identity_links_v1 l
    where l.card_print_id=p_card_print_id and l.card_printing_id=p_card_printing_id and l.state='active';
  if legacy_id is null then raise exception 'JUNGLE_SLAB_SELECTION_INVALID'; end if;
  perform 1 from public.jungle_edition_identity_links_v1 l where l.legacy_card_print_id=legacy_id order by l.id for share;
  perform 1 from public.card_prints c where c.id in (legacy_id,p_card_print_id) order by c.id for share;
  perform 1 from public.card_printings p where p.id=p_card_printing_id for share;
  perform public.assert_jungle_edition_intake_v1(p_card_print_id,p_card_printing_id,true);
  perform public.assert_jungle_slab_observation_v1(p_card_print_id,p_card_printing_id,v_cert_number,p_grade,p_provider_payload);
  select * into card from public.card_prints where id=p_card_print_id;
  insert into public.slab_certs(grader,cert_number,card_print_id,grade)
    values ('PSA',v_cert_number,p_card_print_id,p_grade)
    on conflict (normalized_grader,normalized_cert_number) do nothing;
  select * into cert from public.slab_certs c where c.normalized_grader='PSA' and c.normalized_cert_number=v_cert_number for update;
  if cert.card_print_id is distinct from p_card_print_id or cert.grade is distinct from p_grade then
    raise exception 'JUNGLE_SLAB_EXISTING_CERTIFICATE_MISMATCH'; end if;
  if exists (select 1 from public.vault_item_instances i where i.user_id=p_user_id and i.slab_cert_id=cert.id and i.archived_at is null) then
    raise exception 'JUNGLE_SLAB_ALREADY_OWNED'; end if;
  perform public.ensure_vault_owner_v1(p_user_id);
  select * into owner_row from public.vault_owners where user_id=p_user_id for update;
  gvvi:=public.generate_gv_vi_id_v1(owner_row.owner_code,owner_row.next_instance_index);
  insert into public.jungle_slab_intake_receipts_v1(user_id,request_id,instance_id,anchor_id,slab_cert_id,
    card_print_id,card_printing_id,cert_number,grade,provider_payload,payload_sha256)
    values (p_user_id,p_request_id,instance_id,anchor_id,cert.id,p_card_print_id,p_card_printing_id,v_cert_number,p_grade,p_provider_payload,payload_hash);
  insert into public.vault_items(id,user_id,card_id,gv_id,qty,condition_label,is_graded,grade_company,grade_value,grade_label,name)
    values (anchor_id,p_user_id,p_card_print_id,card.gv_id,1,'SLAB',true,'PSA',p_grade::text,'PSA '||p_grade::text,card.name);
  insert into public.vault_item_instances(id,user_id,gv_vi_id,slab_cert_id,card_printing_id,legacy_vault_item_id,
    is_graded,grade_company,grade_value,grade_label,name)
    values (instance_id,p_user_id,gvvi,cert.id,p_card_printing_id,anchor_id,true,'PSA',p_grade::text,'PSA '||p_grade::text,card.name);
  perform public.admin_slab_event_insert_v1(cert.id,'cert_verification_observed','psa:jungle-intake-v1',
    p_user_id::text||'/'||p_request_id::text,now(),p_card_print_id,null,null,null,
    jsonb_build_object('instance_id',instance_id,'anchor_id',anchor_id,
      'card_printing_id',p_card_printing_id,'payload_sha256',payload_hash));
  update public.vault_owners set next_instance_index=owner_row.next_instance_index+1 where user_id=p_user_id;
  return jsonb_build_object('instance_id',instance_id,'anchor_id',anchor_id,'slab_cert_id',cert.id,'gv_vi_id',gvvi,'replayed',false);
end;
$$;

revoke all on function public.guard_jungle_slab_receipt_v1(),public.guard_jungle_slab_certificate_v1(),
  public.assert_vault_item_instance_card_printing_parent_v1(),
  public.assert_jungle_slab_observation_v1(uuid,uuid,text,numeric,jsonb),
  public.admin_jungle_slab_intake_v1(uuid,uuid,uuid,uuid,text,numeric,jsonb)
  from public,anon,authenticated,service_role;
grant execute on function public.admin_jungle_slab_intake_v1(uuid,uuid,uuid,uuid,text,numeric,jsonb) to service_role;
commit;
