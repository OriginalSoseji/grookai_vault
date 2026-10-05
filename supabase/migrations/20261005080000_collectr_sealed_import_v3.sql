-- Additive mixed-import transaction. No rollout, catalog or inventory activation.
begin;

create table if not exists public.vault_collection_import_receipts_v3 (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  request_sha256 text not null check(request_sha256 ~ '^[a-f0-9]{64}$'),
  payload_sha256 text not null check(payload_sha256 ~ '^[a-f0-9]{64}$'),
  status text not null check(status in ('succeeded','failed')),
  result jsonb not null check(jsonb_typeof(result)='object'),
  completed_at timestamptz not null default now(),
  primary key(user_id,request_id)
);
alter table public.vault_collection_import_receipts_v3 enable row level security;
alter table public.vault_collection_import_receipts_v3 force row level security;
revoke all on public.vault_collection_import_receipts_v3 from public,anon,authenticated,service_role;
grant select on public.vault_collection_import_receipts_v3 to service_role;

create or replace function public.get_collection_import_receipt_v3(p_request_id uuid,p_request_sha256 text)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare prior public.vault_collection_import_receipts_v3%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode='28000'; end if;
  if p_request_id is null or coalesce(p_request_sha256,'') !~ '^[a-f0-9]{64}$' then raise exception 'invalid_import_request'; end if;
  select * into prior from public.vault_collection_import_receipts_v3 where user_id=auth.uid() and request_id=p_request_id;
  if not found then return null; end if;
  if prior.request_sha256<>p_request_sha256 then return jsonb_build_object('success',false,'requestId',p_request_id,'error','import_request_conflict'); end if;
  return prior.result;
end $$;
revoke all on function public.get_collection_import_receipt_v3(uuid,text) from public,anon,service_role;
grant execute on function public.get_collection_import_receipt_v3(uuid,text) to authenticated;

create or replace function public.admin_import_vault_collection_v3(
  p_user_id uuid,p_request_id uuid,p_request_sha256 text,p_source_sha256 text,
  p_source_rows jsonb,p_card_targets jsonb,p_sealed_targets jsonb
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  fingerprint text; prior public.vault_collection_import_receipts_v3%rowtype;
  previous_group public.vault_collection_import_groups_v2%rowtype;
  owner_row public.vault_owners%rowtype; v public.sealed_product_variants%rowtype;
  t jsonb; card_result jsonb; outcome jsonb; returned jsonb:='[]';
  indices integer[]; used integer[]:='{}'; ids uuid[]; group_hash text;
  desired integer; delta integer; new_sealed integer:=0; new_entries integer:=0;
  v_game text; source_record jsonb; failure_code text; copy_id uuid;
  cost numeric; currency text; source_date timestamptz; date_only boolean; source_notes text;
  assigned integer; total_quantity numeric;
begin
  if p_user_id is null or p_request_id is null or coalesce(p_request_sha256,'') !~ '^[a-f0-9]{64}$'
    or coalesce(p_source_sha256,'') !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_source_rows) is distinct from 'array'
    or jsonb_typeof(p_card_targets) is distinct from 'array'
    or jsonb_typeof(p_sealed_targets) is distinct from 'array' then raise exception 'invalid_collection_import'; end if;
  if jsonb_array_length(p_source_rows) not between 1 and 5000
    or jsonb_array_length(p_card_targets)+jsonb_array_length(p_sealed_targets)>5000
    or octet_length(p_source_rows::text)+octet_length(p_card_targets::text)+octet_length(p_sealed_targets::text)>2097152
    then raise exception 'invalid_collection_import'; end if;
  fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object('request',p_request_sha256,'source',p_source_sha256,
    'rows',p_source_rows,'cards',p_card_targets,'sealed',p_sealed_targets)::text,'UTF8'),'sha256'),'hex');
  perform public.ensure_vault_owner_v1(p_user_id);
  select * into owner_row from public.vault_owners where user_id=p_user_id for update;
  select * into prior from public.vault_collection_import_receipts_v3 where user_id=p_user_id and request_id=p_request_id;
  if found then
    if prior.request_sha256<>p_request_sha256 or prior.payload_sha256<>fingerprint then
      return jsonb_build_object('success',false,'requestId',p_request_id,'error','import_request_conflict');
    end if;
    return prior.result;
  end if;
  -- A request from an older client/manual add must never be adopted as a V3 attempt.
  if exists(select 1 from public.vault_collection_import_receipts_v2 where user_id=p_user_id and request_id=p_request_id)
    or exists(select 1 from public.vault_sealed_requests_v1 where user_id=p_user_id and request_id=p_request_id) then
    return jsonb_build_object('success',false,'requestId',p_request_id,'error','import_request_conflict');
  end if;
  begin
    -- Validate the combined source partition before invoking the preserved card writer.
    total_quantity:=0;
    for t in select value from jsonb_array_elements(p_card_targets||p_sealed_targets) loop
      if jsonb_typeof(t->'sourceIndices') is distinct from 'array' or jsonb_array_length(t->'sourceIndices')=0
        or jsonb_typeof(t->'desiredQuantity') is distinct from 'number' or (t->>'desiredQuantity') !~ '^[1-9][0-9]*$'
        then raise exception 'invalid_import_target'; end if;
      select array_agg(value::integer order by value::integer) into indices from jsonb_array_elements_text(t->'sourceIndices');
      if cardinality(indices)<>(select count(distinct i) from unnest(indices) i) or indices&&used
        or exists(select 1 from unnest(indices) i where i<0 or i>=jsonb_array_length(p_source_rows)) then raise exception 'invalid_import_source_indices'; end if;
      used:=used||indices; total_quantity:=total_quantity+(t->>'desiredQuantity')::numeric;
    end loop;
    if total_quantity>50000 then raise exception 'invalid_import_quantity'; end if;
    card_result:=public.admin_import_vault_collection_v2(p_user_id,p_request_id,p_source_sha256,p_source_rows,p_card_targets);
    if card_result->>'success' is distinct from 'true' then
      if card_result->>'error'='vault_paused' then raise exception 'vault_paused' using errcode='GV001'; end if;
      raise exception 'card_import_failed';
    end if;
    for t in select value from jsonb_array_elements(p_sealed_targets) order by value->>'sealedVariantId',value->'sourceIndices' loop
      select array_agg(value::integer order by value::integer) into indices from jsonb_array_elements_text(t->'sourceIndices');
      group_hash:=encode(extensions.digest(convert_to(to_jsonb(indices)::text,'UTF8'),'sha256'),'hex');
      desired:=(t->>'desiredQuantity')::integer;
      if t->>'objectKind' is distinct from 'sealed' or t->>'sealState' is distinct from 'unknown'
        or t->>'packageCondition' is distinct from 'unknown' or t ? 'cardId' or t ? 'cardPrintingId' then raise exception 'invalid_sealed_target'; end if;
      cost:=(t->>'acquisitionCost')::numeric; currency:=t->>'acquisitionCurrency';
      source_date:=(t->>'createdAt')::timestamptz; date_only:=(t->>'createdAtDateOnly')::boolean; source_notes:=t->>'notes';
      if (cost is null)<>(currency is null) or (cost is not null and (cost<0 or cost>9999999999.99 or round(cost,2)<>cost))
        or (currency is not null and currency !~ '^[A-Z]{3}$') or date_only is null or length(coalesce(source_notes,''))>4000
        then raise exception 'invalid_sealed_metadata'; end if;
      for source_record in select p_source_rows->i from unnest(indices) i loop
        if jsonb_typeof(source_record) is distinct from 'object' or exists(select 1 from jsonb_each_text(source_record) f where
          (lower(btrim(f.key)) in ('card number','number') and btrim(f.value)<>'') or
          (lower(btrim(f.key))='grade' and lower(btrim(f.value)) not in ('','ungraded')) or
          (lower(btrim(f.key))='watchlist' and lower(btrim(f.value)) not in ('','false')) or
          (lower(btrim(f.key)) in ('variance','finish') and lower(btrim(f.value)) not in ('','normal')))
          then raise exception 'unsupported_sealed_source'; end if;
      end loop;
      select * into previous_group from public.vault_collection_import_groups_v2 g
        where g.user_id=p_user_id and g.source_sha256=p_source_sha256 and g.group_key=group_hash;
      if found then
        if previous_group.target<>t or previous_group.source_indices<>indices then raise exception 'import_source_conflict'; end if;
        returned:=returned||jsonb_build_array(jsonb_build_object('objectKind','sealed','sourceIndices',indices,'sealedVariantId',t->>'sealedVariantId','instanceIds',previous_group.instance_ids));
        continue;
      end if;
      if exists(select 1 from public.vault_collection_import_groups_v2 g where g.user_id=p_user_id and g.source_sha256=p_source_sha256 and g.source_indices&&indices) then raise exception 'import_source_conflict'; end if;
      -- Initial import supports broad enabled rollout only. Never bypass a
      -- per-account canary budget; previously mapped groups above remain readable.
      perform 1 from public.sealed_ownership_controls_v1 where singleton and enabled for share;
      if not found then raise exception 'sealed_import_disabled'; end if;
      select * into v from public.sealed_product_variants where id=(t->>'sealedVariantId')::uuid for share;
      if not found or v.identity_fingerprint is distinct from t->>'identityFingerprint'
        or v.language_code is distinct from t->>'language' or v.region_code is not null or v.edition is not null or v.wave is not null then raise exception 'sealed_identity_mismatch'; end if;
      select game_key into v_game from public.sealed_product_families where id=v.family_id;
      perform 1 from public.catalog_game_release_controls where game_code=v_game for share;
      perform 1 from public.sealed_product_game_release_controls where game_key=v_game for share;
      if not public.catalog_game_visible_to_request_v1(v_game) or not public.sealed_product_game_visible_to_request_v1(v_game) then raise exception 'sealed_game_unavailable'; end if;
      perform 1 from public.sealed_product_release_pointer p
        join public.sealed_product_releases r on r.id=p.release_id and r.game_key=p.game_key and r.release_state='frozen'
        join public.sealed_product_release_members m on m.release_id=r.id and m.variant_id=v.id
        join public.sealed_product_source_mappings sm on sm.id=m.source_mapping_id and sm.variant_id=v.id
        where p.game_key=v_game and p.release_id=(t->>'releaseId')::uuid and sm.id=(t->>'mappingId')::uuid
          and sm.mapping_status='exact_reviewed' and sm.review_decision='confirmed_sealed' and sm.promotion_authorized
        for share of p,r,m,sm;
      if not found then raise exception 'sealed_identity_not_released'; end if;
      select coalesce(array_agg(c.id order by c.created_at,c.id),'{}'::uuid[]) into ids from (
        select i.id,i.created_at from public.vault_item_instances i where i.user_id=p_user_id and i.archived_at is null
          and i.sealed_product_variant_id=v.id and i.seal_state='unknown' and i.package_condition='unknown'
          and i.acquisition_cost is not distinct from cost and i.acquisition_currency is not distinct from currency
          and i.notes is not distinct from source_notes
          and (source_date is null or case when date_only then (i.created_at at time zone 'UTC')::date=(source_date at time zone 'UTC')::date else i.created_at=source_date end)
          and not exists(select 1 from public.vault_collection_import_groups_v2 g where g.user_id=p_user_id and g.source_sha256=p_source_sha256 and i.id=any(g.instance_ids))
          order by i.created_at,i.id limit desired for update of i
      ) c;
      delta:=desired-cardinality(ids);
      if delta>0 then
        select * into owner_row from public.vault_owners where user_id=p_user_id for update;
        for n in 0..delta-1 loop
          insert into public.vault_item_instances(user_id,gv_vi_id,sealed_product_variant_id,seal_state,package_condition,
            acquisition_cost,acquisition_currency,created_at,notes,name,intent)
          values(p_user_id,public.generate_gv_vi_id_v1(owner_row.owner_code,owner_row.next_instance_index+n),v.id,'unknown','unknown',
            cost,currency,coalesce(source_date,now()),source_notes,v.canonical_name,'hold') returning id into copy_id;
          ids:=array_append(ids,copy_id);
        end loop;
        update public.vault_owners set next_instance_index=owner_row.next_instance_index+delta where user_id=p_user_id;
        new_sealed:=new_sealed+delta;new_entries:=new_entries+1;
      end if;
      insert into public.vault_collection_import_groups_v2(user_id,source_sha256,group_key,source_indices,target,instance_ids,added_count)
        values(p_user_id,p_source_sha256,group_hash,indices,t,ids,delta);
      returned:=returned||jsonb_build_array(jsonb_build_object('objectKind','sealed','sourceIndices',indices,'sealedVariantId',v.id,'instanceIds',ids));
    end loop;
    if new_sealed>0 then
      insert into public.vault_sealed_requests_v1(user_id,request_id,operation,payload,result)
      values(p_user_id,p_request_id,'add',jsonb_build_object('source','collection_import_v3','source_sha256',p_source_sha256),jsonb_build_object('created_count',new_sealed));
    end if;
    select count(distinct i) into assigned from public.vault_collection_import_groups_v2 g,lateral unnest(g.source_indices) i where g.user_id=p_user_id and g.source_sha256=p_source_sha256;
    outcome:=card_result||jsonb_build_object('version',3,'importedSealed',new_sealed,'importedEntries',(card_result->>'importedEntries')::integer+new_entries,
      'reviewRows',jsonb_array_length(p_source_rows)-assigned,'sealedTargets',returned);
  exception when others then
    get stacked diagnostics failure_code=returned_sqlstate;
    outcome:=jsonb_build_object('success',false,'version',3,'requestId',p_request_id,'error',case when failure_code='GV001' then 'vault_paused' else 'import_failed' end);
  end;
  insert into public.vault_collection_import_receipts_v3(user_id,request_id,request_sha256,payload_sha256,status,result)
    values(p_user_id,p_request_id,p_request_sha256,fingerprint,case when failure_code is null then 'succeeded' else 'failed' end,outcome);
  return outcome;
end $$;
revoke all on function public.admin_import_vault_collection_v3(uuid,uuid,text,text,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.admin_import_vault_collection_v3(uuid,uuid,text,text,jsonb,jsonb,jsonb) to service_role;

create or replace function public.get_collection_import_sealed_copies_v3(p_source_sha256 text,p_instance_ids uuid[])
returns table(id uuid,sealed_product_variant_id uuid,seal_state text,package_condition text,acquisition_cost numeric,
  acquisition_currency text,notes text,created_at timestamptz,archived_at timestamptz)
language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode='28000'; end if;
  if coalesce(p_source_sha256,'') !~ '^[a-f0-9]{64}$' or coalesce(cardinality(p_instance_ids),0) not between 1 and 100 then raise exception 'invalid_import_readback'; end if;
  return query select i.id,i.sealed_product_variant_id,i.seal_state,i.package_condition,i.acquisition_cost,i.acquisition_currency,i.notes,i.created_at,i.archived_at
    from public.vault_item_instances i where i.user_id=auth.uid() and i.id=any(p_instance_ids) and i.sealed_product_variant_id is not null
      and exists(select 1 from public.vault_collection_import_groups_v2 g where g.user_id=auth.uid() and g.source_sha256=p_source_sha256 and i.id=any(g.instance_ids)) order by i.id;
end $$;
revoke all on function public.get_collection_import_sealed_copies_v3(text,uuid[]) from public,anon,service_role;
grant execute on function public.get_collection_import_sealed_copies_v3(text,uuid[]) to authenticated;

create or replace function public.get_collection_import_sealed_catalog_v3()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode='28000'; end if;
  with releases as (
    select p.game_key,p.release_id,r.release_state,r.expected_member_count from public.sealed_product_release_pointer p
    join public.sealed_product_releases r on r.id=p.release_id and r.game_key=p.game_key and r.release_state='frozen'
    where public.catalog_game_visible_to_request_v1(p.game_key) and public.sealed_product_game_visible_to_request_v1(p.game_key)
  ) select jsonb_build_object(
    'releases',coalesce((select jsonb_agg(jsonb_build_object('game',game_key,'releaseId',release_id,'state',release_state,'expectedMembers',expected_member_count) order by game_key) from releases),'[]'::jsonb),
    'variants',coalesce((select jsonb_agg(jsonb_build_object('variantId',v.id,'familyId',v.family_id,'name',v.canonical_name,
      'game',f.game_key,'packageForm',v.package_form,'language',v.language_code,'region',v.region_code,'edition',v.edition,'wave',v.wave,
      'identityFingerprint',v.identity_fingerprint,'releaseId',r.release_id,'releaseState',r.release_state,
      'memberMappingId',m.source_mapping_id,'mappingId',sm.id,'mappingVariantId',sm.variant_id,'mappingStatus',sm.mapping_status,
      'reviewDecision',sm.review_decision,'promotionAuthorized',sm.promotion_authorized,'sourceName',sm.source_product_name,'sourceSet',sg.name) order by v.id)
      from releases r join public.sealed_product_release_members m on m.release_id=r.release_id
      join public.sealed_product_variants v on v.id=m.variant_id join public.sealed_product_families f on f.id=v.family_id and f.game_key=r.game_key
      join public.sealed_product_source_mappings sm on sm.id=m.source_mapping_id and sm.variant_id=v.id
      left join public.tcgcsv_source_groups sg on sg.group_id=sm.source_group_id and sg.category_id=sm.source_category_id),'[]'::jsonb)
  ) into result;
  return result;
end $$;
revoke all on function public.get_collection_import_sealed_catalog_v3() from public,anon,service_role;
grant execute on function public.get_collection_import_sealed_catalog_v3() to authenticated;
commit;
