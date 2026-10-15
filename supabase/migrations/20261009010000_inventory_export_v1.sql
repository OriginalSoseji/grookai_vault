-- Owner-requested current records. No write, snapshot table, provider or activation.
begin;

create or replace function public.vault_inventory_export_v1()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  result jsonb;
  owned_count bigint;
begin
  if actor is null then
    raise exception 'Sign in required' using errcode='28000';
  end if;

  -- STABLE observes the calling statement's snapshot throughout this function.
  -- Refuse over-limit collections before materializing any export records.
  select count(*) into owned_count from public.vault_item_instances
    where user_id=actor and archived_at is null;
  if owned_count > 20000 then
    raise exception 'inventory_export_too_many_copies' using errcode='54000';
  end if;

  with owned as materialized (
    select i.* from public.vault_item_instances i
    where i.user_id=actor and i.archived_at is null
  ), entries as (
    select i.id, jsonb_build_object(
      'kind',case when i.slab_cert_id is not null then 'slab'
        when i.sealed_product_variant_id is not null then 'sealed' else 'card' end,
      'record',jsonb_build_object(
        'id',i.id,'user_id',i.user_id,'gv_vi_id',i.gv_vi_id,
        'card_print_id',i.card_print_id,'card_printing_id',i.card_printing_id,
        'slab_cert_id',i.slab_cert_id,'sealed_product_variant_id',i.sealed_product_variant_id,
        'legacy_vault_item_id',i.legacy_vault_item_id,
        'acquisition_cost',i.acquisition_cost::text,'acquisition_currency',i.acquisition_currency,
        'condition_label',i.condition_label,'condition_score',i.condition_score,
        'is_graded',i.is_graded,'grade_company',i.grade_company,'grade_value',i.grade_value,
        'grade_label',i.grade_label,'notes',i.notes,'name',i.name,'set_name',i.set_name,
        'intent',i.intent,'pricing_mode',i.pricing_mode,
        'asking_price_amount',i.asking_price_amount::text,
        'asking_price_currency',i.asking_price_currency,'asking_price_note',i.asking_price_note,
        'seal_state',i.seal_state,'package_condition',i.package_condition,
        'photo_url',i.photo_url,'image_source',i.image_source,'image_url',i.image_url,
        'image_back_source',i.image_back_source,'image_back_url',i.image_back_url,
        'image_display_mode',i.image_display_mode,
        'created_at',to_char(i.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
        'updated_at',to_char(i.updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')),
      'card',case when c.id is null then null else jsonb_build_object(
        'id',c.id,'gv_id',c.gv_id,'name',c.name,'number',c.number,
        'set_id',c.set_id,'set_code',c.set_code,'set_name',s.name,'game_id',c.game_id,
        'game_key',g.code,'identity_domain',c.identity_domain,'variant_key',c.variant_key,
        'printed_identity_modifier',c.printed_identity_modifier,
        'set_identity_model',c.set_identity_model,'print_identity_key',c.print_identity_key) end,
      'printing',case when p.id is null then null else jsonb_build_object(
        'id',p.id,'card_print_id',p.card_print_id,'printing_gv_id',p.printing_gv_id,
        'finish_key',p.finish_key,'is_provisional',p.is_provisional) end,
      'certificate',case when cert.id is null then null else jsonb_build_object(
        'id',cert.id,'gv_slab_id',cert.gv_slab_id,'card_print_id',cert.card_print_id,
        'grader',cert.grader,'cert_number',cert.cert_number,'grade',cert.grade::text,
        'qualifiers',cert.qualifiers,'subgrades_json',cert.subgrades::text,
        'label_variant',cert.label_variant,'label_metadata_json',cert.label_metadata::text) end,
      'sealed',case when v.id is null then null else jsonb_build_object(
        'id',v.id,'family_id',v.family_id,'family_name',f.canonical_name,'game_key',f.game_key,
        'variant_key',v.variant_key,'name',v.canonical_name,'package_form',v.package_form,
        'language_code',v.language_code,'region_code',v.region_code,'edition',v.edition,
        'wave',v.wave,'manufacturer_sku',v.manufacturer_sku,'upc',v.upc,
        'release_date',v.release_date::text,'explicit_contents_json',v.explicit_contents::text,
        'identity_contract_version',v.identity_contract_version,
        'identity_fingerprint',v.identity_fingerprint) end,
      'sections',coalesce((select jsonb_agg(jsonb_build_object(
        'id',section.id,'name',section.name,'position',section.position,
        'is_public',section.is_public) order by section.position,section.id)
        from public.wall_section_memberships membership
        join public.wall_sections section on section.id=membership.section_id
        where membership.vault_item_instance_id=i.id and section.user_id=actor
          and section.is_active),'[]'::jsonb)
    ) entry
    from owned i
    left join public.slab_certs cert on cert.id=i.slab_cert_id
    left join public.card_prints c on c.id=coalesce(i.card_print_id,cert.card_print_id)
    left join public.card_printings p on p.id=i.card_printing_id
    left join public.sets s on s.id=c.set_id
    left join public.games g on g.id=c.game_id
    left join public.sealed_product_variants v on v.id=i.sealed_product_variant_id
    left join public.sealed_product_families f on f.id=v.family_id
  )
  select jsonb_build_object('schema','grookai-inventory-export-v1','version',1,
    'ownerId',actor,'scope','all_active_owned_copies','complete',true,
    'capturedAt',to_char(statement_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'copyCount',owned_count,'copies',coalesce(jsonb_agg(entry order by id),'[]'::jsonb))
  into result from entries;

  if jsonb_array_length(result->'copies') <> owned_count then
    raise exception 'inventory_export_incomplete' using errcode='22000';
  end if;
  if octet_length(result::text) > 33554432 then
    raise exception 'inventory_export_too_large' using errcode='54000';
  end if;
  return result;
end $$;

revoke all on function public.vault_inventory_export_v1() from public,anon,authenticated,service_role;
grant execute on function public.vault_inventory_export_v1() to authenticated;
comment on function public.vault_inventory_export_v1() is
  'Private current active-copy record export. Exact numeric strings, no market valuation, no image bytes, no writes. Maximum 20000 copies and 32MiB; no partial payload.';

commit;
