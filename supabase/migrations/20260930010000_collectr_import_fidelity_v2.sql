begin;

-- Private source evidence is separate from canonical catalog and operational
-- receipts. A review row is not owned inventory and never contributes to value.
create table if not exists public.vault_collection_import_documents_v2 (
  user_id uuid not null references auth.users(id) on delete cascade,
  source_sha256 text not null check(source_sha256 ~ '^[0-9a-f]{64}$'),
  source_rows jsonb not null check(jsonb_typeof(source_rows)='array'),
  created_at timestamptz not null default now(),
  primary key(user_id,source_sha256),
  check(jsonb_array_length(source_rows) between 1 and 5000),
  check(octet_length(source_rows::text)<=2097152)
);
create table if not exists public.vault_collection_import_groups_v2 (
  user_id uuid not null,
  source_sha256 text not null,
  group_key text not null check(group_key ~ '^[0-9a-f]{64}$'),
  source_indices integer[] not null check(cardinality(source_indices)>0),
  target jsonb not null check(jsonb_typeof(target)='object'),
  instance_ids uuid[] not null,
  added_count integer not null check(added_count>=0),
  created_at timestamptz not null default now(),
  primary key(user_id,source_sha256,group_key),
  foreign key(user_id,source_sha256) references public.vault_collection_import_documents_v2 on delete cascade
);
create index if not exists vault_collection_import_groups_instances_v2
  on public.vault_collection_import_groups_v2 using gin(instance_ids);
create table if not exists public.vault_collection_import_receipts_v2 (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  payload_sha256 text not null check(payload_sha256 ~ '^[0-9a-f]{64}$'),
  status text not null check(status in ('succeeded','failed')),
  error_code text,
  result jsonb not null check(jsonb_typeof(result)='object'),
  started_at timestamptz not null,
  completed_at timestamptz not null,
  primary key(user_id,request_id),
  check(completed_at>=started_at)
);

alter table public.vault_collection_import_documents_v2 enable row level security;
alter table public.vault_collection_import_documents_v2 force row level security;
alter table public.vault_collection_import_groups_v2 enable row level security;
alter table public.vault_collection_import_groups_v2 force row level security;
alter table public.vault_collection_import_receipts_v2 enable row level security;
alter table public.vault_collection_import_receipts_v2 force row level security;
revoke all on public.vault_collection_import_documents_v2,public.vault_collection_import_groups_v2,
  public.vault_collection_import_receipts_v2 from public,anon,authenticated,service_role;
grant select on public.vault_collection_import_documents_v2,public.vault_collection_import_groups_v2 to authenticated,service_role;
grant select on public.vault_collection_import_receipts_v2 to service_role;
drop policy if exists collection_import_document_owner_v2 on public.vault_collection_import_documents_v2;
create policy collection_import_document_owner_v2 on public.vault_collection_import_documents_v2
  for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists collection_import_group_owner_v2 on public.vault_collection_import_groups_v2;
create policy collection_import_group_owner_v2 on public.vault_collection_import_groups_v2
  for select to authenticated using(user_id=(select auth.uid()));

create or replace function public.admin_import_vault_collection_v2(
  p_user_id uuid,p_request_id uuid,p_source_sha256 text,p_source_rows jsonb,p_targets jsonb
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$
declare
  started timestamptz:=clock_timestamp();
  fingerprint text;
  prior public.vault_collection_import_receipts_v2%rowtype;
  document public.vault_collection_import_documents_v2%rowtype;
  previous_group public.vault_collection_import_groups_v2%rowtype;
  t jsonb;
  source_record jsonb;
  c public.card_prints%rowtype;
  created_copy public.vault_item_instances%rowtype;
  indices integer[];
  all_indices integer[]:='{}';
  v_group_key text;
  printing_id uuid;
  finish text;
  desired integer;
  ids uuid[];
  anchor uuid;
  delta integer;
  total_added integer:=0;
  total_entries integer:=0;
  assigned_rows integer;
  targets jsonb:='[]';
  outcome jsonb;
  failure_code text;
begin
  if p_user_id is null or p_request_id is null or coalesce(p_source_sha256,'') !~ '^[0-9a-f]{64}$'
     or jsonb_typeof(p_source_rows) is distinct from 'array' or jsonb_typeof(p_targets) is distinct from 'array' then
    raise exception 'invalid_collection_import';
  end if;
  if jsonb_array_length(p_source_rows) not between 1 and 5000 or jsonb_array_length(p_targets)>5000
     or octet_length(p_source_rows::text)+octet_length(p_targets::text)>2097152 then
    raise exception 'invalid_collection_import';
  end if;
  fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object('source',p_source_sha256,
    'rows',p_source_rows,'targets',p_targets)::text,'UTF8'),'sha256'),'hex');
  perform public.ensure_vault_owner_v1(p_user_id);
  perform 1 from public.vault_owners where user_id=p_user_id for update;
  if not found then raise exception 'import_owner_unavailable'; end if;
  select * into prior from public.vault_collection_import_receipts_v2 where user_id=p_user_id and request_id=p_request_id;
  if found then
    if prior.payload_sha256<>fingerprint then
      return jsonb_build_object('success',false,'error','import_request_conflict','requestId',p_request_id);
    end if;
    return prior.result;
  end if;

  begin
    select * into document from public.vault_collection_import_documents_v2
      where user_id=p_user_id and source_sha256=p_source_sha256 for update;
    if found then
      if document.source_rows<>p_source_rows then raise exception 'import_source_conflict'; end if;
    else
      insert into public.vault_collection_import_documents_v2(user_id,source_sha256,source_rows)
        values(p_user_id,p_source_sha256,p_source_rows);
    end if;
    if exists(select 1 from jsonb_array_elements(p_targets) r where
      jsonb_typeof(r->'desiredQuantity') is distinct from 'number' or (r->>'desiredQuantity') !~ '^[1-9][0-9]*$')
      or (select coalesce(sum((r->>'desiredQuantity')::numeric),0) from jsonb_array_elements(p_targets) r)>50000 then
      raise exception 'invalid_import_quantity';
    end if;
    for t in select value from jsonb_array_elements(p_targets) order by value->>'cardId',value->>'cardPrintingId',value->'sourceIndices' loop
      if jsonb_typeof(t->'sourceIndices') is distinct from 'array' or jsonb_array_length(t->'sourceIndices')=0 then
        raise exception 'invalid_import_source_indices';
      end if;
      select array_agg(value::integer order by value::integer) into indices from jsonb_array_elements_text(t->'sourceIndices');
      if cardinality(indices)<>(select count(distinct i) from unnest(indices) i)
         or indices&&all_indices or exists(select 1 from unnest(indices) i where i<0 or i>=jsonb_array_length(p_source_rows)) then
        raise exception 'invalid_import_source_indices';
      end if;
      all_indices:=all_indices||indices;
      v_group_key:=encode(extensions.digest(convert_to(to_jsonb(indices)::text,'UTF8'),'sha256'),'hex');
      desired:=(t->>'desiredQuantity')::integer;
      if coalesce(t->>'condition','') not in ('NM','LP','MP','HP','DMG')
         or length(coalesce(t->>'notes',''))>4000
         or (t->>'acquisitionCost')::numeric<0 then raise exception 'invalid_import_metadata'; end if;
      -- Original metadata travels beside normalized values. No graded source
      -- may fall through to this ungraded writer, with or without a certificate.
      for source_record in select p_source_rows->i from unnest(indices) i loop
        if jsonb_typeof(source_record) is distinct from 'object'
           or exists(select 1 from jsonb_each_text(source_record) f
             where (lower(btrim(f.key))='grade' and lower(btrim(f.value)) not in ('','ungraded'))
               or (lower(btrim(f.key))='watchlist' and lower(btrim(f.value)) not in ('','false'))) then
          raise exception 'unsupported_import_source';
        end if;
      end loop;
      select * into previous_group from public.vault_collection_import_groups_v2
        where user_id=p_user_id and source_sha256=p_source_sha256 and vault_collection_import_groups_v2.group_key=v_group_key;
      if found then
        if previous_group.target<>t or previous_group.source_indices<>indices then raise exception 'import_source_conflict'; end if;
        targets:=targets||jsonb_build_array(jsonb_build_object('sourceIndices',indices,'cardId',t->>'cardId',
          'cardPrintingId',t->>'cardPrintingId','instanceIds',previous_group.instance_ids));
        continue; -- A sold/archived/edited imported copy is never recreated.
      end if;
      if exists(select 1 from public.vault_collection_import_groups_v2 g where g.user_id=p_user_id
        and g.source_sha256=p_source_sha256 and g.source_indices&&indices) then raise exception 'import_source_conflict'; end if;
      select * into c from public.card_prints where id=(t->>'cardId')::uuid for share;
      if not found or c.gv_id is distinct from t->>'gvId' or not public.catalog_card_print_visible_to_request_v1(c.id) then
        raise exception 'import_card_identity_mismatch';
      end if;
      printing_id:=nullif(t->>'cardPrintingId','')::uuid;
      if printing_id is not null then
        select p.finish_key into finish from public.card_printings p join public.finish_keys f on f.key=p.finish_key
          where p.id=printing_id and p.card_print_id=c.id and f.is_active
            and not exists(select 1 from public.card_printing_truth_reviews r where r.card_printing_id=p.id
              and r.active and r.public_visibility in ('hidden_pending_review','hidden_unsupported')) for share of p;
        if not found or finish is distinct from t->>'finishKey' then raise exception 'import_printing_identity_mismatch'; end if;
      elsif nullif(t->>'finishKey','') is not null then raise exception 'import_printing_identity_required';
      end if;
      select coalesce(array_agg(candidate.id order by candidate.created_at,candidate.id),'{}'::uuid[]) into ids from (
        select i.id,i.created_at from public.vault_item_instances i
        where i.user_id=p_user_id and i.archived_at is null and i.card_print_id=c.id
          and i.slab_cert_id is null and not i.is_graded
          and i.card_printing_id is not distinct from printing_id
          and i.condition_label is not distinct from t->>'condition'
          and i.acquisition_cost is not distinct from (t->>'acquisitionCost')::numeric
          and i.notes is not distinct from t->>'notes'
          and ((t->>'createdAt') is null or (i.created_at at time zone 'UTC')::date=((t->>'createdAt')::timestamptz at time zone 'UTC')::date)
          and not exists(select 1 from public.vault_collection_import_groups_v2 g
            where g.user_id=p_user_id and g.source_sha256=p_source_sha256 and i.id=any(g.instance_ids))
        order by i.created_at,i.id limit desired for update of i
      ) candidate;
      delta:=desired-cardinality(ids);
      if delta>0 then
        select id into anchor from public.vault_items where user_id=p_user_id and card_id=c.id and archived_at is null
          order by created_at desc nulls last,id desc limit 1 for update;
        if not found then
          insert into public.vault_items(user_id,card_id,gv_id,qty,condition_label,acquisition_cost,created_at,notes,name,set_name)
            values(p_user_id,c.id,c.gv_id,delta,t->>'condition',(t->>'acquisitionCost')::numeric,
              coalesce((t->>'createdAt')::timestamptz,now()),t->>'notes',c.name,
              (select name from public.sets where id=c.set_id)) returning id into anchor;
        end if;
        for copy_index in 1..delta loop
          select * into created_copy from public.admin_vault_instance_create_v1(p_user_id=>p_user_id,p_card_print_id=>c.id,
            p_card_printing_id=>printing_id,p_legacy_vault_item_id=>anchor,p_condition_label=>t->>'condition',
            p_acquisition_cost=>(t->>'acquisitionCost')::numeric,p_created_at=>(t->>'createdAt')::timestamptz,
            p_notes=>t->>'notes',p_name=>c.name,p_set_name=>(select name from public.sets where id=c.set_id));
          ids:=array_append(ids,created_copy.id);
        end loop;
        update public.vault_items set qty=(select count(*) from public.vault_item_instances
          where user_id=p_user_id and legacy_vault_item_id=anchor and archived_at is null) where id=anchor and user_id=p_user_id;
        total_added:=total_added+delta; total_entries:=total_entries+1;
      end if;
      insert into public.vault_collection_import_groups_v2(user_id,source_sha256,group_key,source_indices,target,instance_ids,added_count)
        values(p_user_id,p_source_sha256,v_group_key,indices,t,ids,delta);
      targets:=targets||jsonb_build_array(jsonb_build_object('sourceIndices',indices,'cardId',c.id,'cardPrintingId',printing_id,'instanceIds',ids));
    end loop;
    select count(distinct idx) into assigned_rows from public.vault_collection_import_groups_v2 g,
      lateral unnest(g.source_indices) idx where g.user_id=p_user_id and g.source_sha256=p_source_sha256;
    outcome:=jsonb_build_object('success',true,'requestId',p_request_id,'sourceSha256',p_source_sha256,
      'importedCards',total_added,'importedEntries',total_entries,'sourceRows',jsonb_array_length(p_source_rows),
      'reviewRows',jsonb_array_length(p_source_rows)-assigned_rows,'targets',targets);
  exception when others then
    get stacked diagnostics failure_code=returned_sqlstate;
    outcome:=jsonb_build_object('success',false,'requestId',p_request_id,
      'error',case when failure_code='GV001' then 'vault_paused' else 'import_failed' end);
  end;
  insert into public.vault_collection_import_receipts_v2(user_id,request_id,payload_sha256,status,error_code,result,started_at,completed_at)
    values(p_user_id,p_request_id,fingerprint,case when failure_code is null then 'succeeded' else 'failed' end,
      failure_code,outcome,started,greatest(started,clock_timestamp()));
  return outcome;
end;
$$;
revoke all on function public.admin_import_vault_collection_v2(uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.admin_import_vault_collection_v2(uuid,uuid,text,jsonb,jsonb) to service_role;

commit;
