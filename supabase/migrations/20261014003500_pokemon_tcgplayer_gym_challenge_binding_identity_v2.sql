-- Correct the Gym Challenge binding's current-product identity check.
-- The reviewed source SHA remains immutable provenance; current daily catalog
-- rows use the ingestion payload hash and are validated by exact product identity.
begin;

create or replace function public.pokemon_tcgplayer_gym_challenge_binding_valid_v1(
  binding_id uuid,
  require_active boolean default true
) returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1
    from public.tcgplayer_gym_challenge_edition_bindings_v1 binding
    join public.tcgcsv_source_products product on product.product_id = binding.product_id
    join public.tcgcsv_source_price_daily_observations observation
      on observation.id = binding.source_observation_id
    join public.tcgcsv_source_sync_runs source_run on source_run.id = binding.source_sync_run_id
    join public.external_mappings mapping
      on mapping.source = 'tcgplayer' and mapping.external_id = binding.product_id::text
     and mapping.active
    join public.card_prints legacy on legacy.id = mapping.card_print_id
    join public.card_prints card on card.id = binding.card_print_id
    join public.sets card_set on card_set.id = card.set_id
    join public.card_print_identity identity
      on identity.card_print_id = card.id and identity.is_active
     and identity.identity_domain = 'pokemon_eng_standard'
    join public.card_printings printing
      on printing.id = binding.card_printing_id and printing.card_print_id = card.id
    where binding.id = pokemon_tcgplayer_gym_challenge_binding_valid_v1.binding_id
      and binding.state <> 'retired'
      and (not require_active or binding.state = 'active')
      and binding.source_products_payload_sha256 =
        'f2a97bb05a14091116a78d469b9282abbc58aa024a537d47391983312e3cdc59'
      and binding.authority_plan_fingerprint =
        'ced09a10c3194b404452b360a932e79b32e8e11c3c69d18989ca5f1f6d93e495'
      and product.category_id = 3 and product.group_id = 1440
      and product.source_active and product.catalog_metadata_status = 'current'
      and (
        (binding.product_id = 85720
          and product.name = 'Giovanni''s Nidoran F'
          and (select count(*) from jsonb_array_elements(case
            when jsonb_typeof(product.extended_data) = 'array'
              then product.extended_data else '[]'::jsonb end) item
            where item->>'name' = 'Number') = 1
          and exists (select 1 from jsonb_array_elements(case
            when jsonb_typeof(product.extended_data) = 'array'
              then product.extended_data else '[]'::jsonb end) item
            where item->>'name' = 'Number'
              and item->>'value' in ('75/132','075/132')))
        or
        (binding.product_id = 85721
          and product.name = 'Giovanni''s Nidoran M'
          and (select count(*) from jsonb_array_elements(case
            when jsonb_typeof(product.extended_data) = 'array'
              then product.extended_data else '[]'::jsonb end) item
            where item->>'name' = 'Number') = 1
          and exists (select 1 from jsonb_array_elements(case
            when jsonb_typeof(product.extended_data) = 'array'
              then product.extended_data else '[]'::jsonb end) item
            where item->>'name' = 'Number'
              and item->>'value' in ('76/132','076/132')))
      )
      and observation.product_id = binding.product_id
      and observation.category_id = 3 and observation.group_id = 1440
      and observation.subtype_name = binding.source_subtype
      and observation.subtype_name_normalized = lower(binding.source_subtype)
      and observation.last_seen_run_id = binding.source_sync_run_id
      and observation.payload_hash = binding.source_price_row_hash
      and observation.currency = 'USD' and observation.market_price > 0
      and source_run.status = 'completed' and source_run.sync_mode = 'current_full_sync'
      and source_run.failed_count = 0 and source_run.finished_at is not null
      and legacy.set_code = 'gym2' and legacy.number = card.number
      and legacy.name = card.name and legacy.printed_identity_modifier is null
      and card_set.code = 'gym2' and card_set.game = 'pokemon'
      and card.set_code = 'gym2' and card.identity_domain = 'pokemon_eng_standard'
      and card.set_identity_model = 'standard' and coalesce(card.variant_key,'') = ''
      and card.printed_identity_modifier = 'edition:' || binding.assigned_edition
      and identity.set_code_identity = 'gym2'
      and identity.printed_number = card.number
      and identity.identity_key_version = 'pokemon_eng_standard:v1'
      and identity.identity_payload->>'variant_key_current' = 'edition:' || binding.assigned_edition
      and identity.identity_payload->>'printed_set_abbrev' = 'G2'
      and identity.identity_payload->>'printed_total' = '132'
      and printing.finish_key = 'normal' and printing.is_provisional = false
      and printing.printing_gv_id = card.gv_id || '-NORMAL'
      and printing.provenance_source = 'POKEMON_TCGPLAYER_VARIANT_REPAIR_REHEARSAL_V1'
      and printing.provenance_ref =
        'plan:ced09a10c3194b404452b360a932e79b32e8e11c3c69d18989ca5f1f6d93e495'
      and not exists (
        select 1 from public.card_printing_truth_reviews truth_review
        where truth_review.card_printing_id = printing.id and truth_review.active
          and truth_review.public_visibility in ('hidden_pending_review','hidden_unsupported')
      )
      and card.id <> all(array[
        '03208d73-8206-4780-aa45-c3735677cf99'::uuid,
        '47425cf5-146f-41e0-a770-e37c761ce1ef'::uuid,
        '895970ba-ed4c-4d00-91ce-db650563e126'::uuid,
        'a8c17fda-b5a7-46ab-a7c9-32284dfec54f'::uuid
      ])
      and (
        (binding.product_id = 85720 and binding.source_subtype = '1st Edition'
          and binding.source_observation_id = 'd24b4d1e-a73f-4a44-984d-cc94e1f05f28'::uuid
          and binding.source_sync_run_id = 'e429784c-55f2-4922-94dc-0cc560acda8d'::uuid
          and binding.source_product_sha256 = 'f9a6fefadabb32a1ba9cb5b357fa73603f58ce2444fb074d6878fa63df2f8589'
          and binding.source_price_row_hash = '54428d2fa2aeb3f0140d3297bd2a6ad1f2347b9b81e305c96c26f117a2b5fa71'
          and binding.assigned_edition = 'first_edition'
          and card.id = 'c75ade4f-0abf-5380-822a-5b3d3014bb96'::uuid
          and card.gv_id = 'GV-PK-G2-75-FIRST-EDITION'
          and printing.id = '9b1358e1-5ad1-56de-a224-8fcd2131bf87'::uuid)
        or (binding.product_id = 85720 and binding.source_subtype = 'Unlimited'
          and binding.source_observation_id = 'b208701e-5378-4a72-915f-403db492e011'::uuid
          and binding.source_sync_run_id = 'e429784c-55f2-4922-94dc-0cc560acda8d'::uuid
          and binding.source_product_sha256 = 'f9a6fefadabb32a1ba9cb5b357fa73603f58ce2444fb074d6878fa63df2f8589'
          and binding.source_price_row_hash = '39c210469441c8222090c823b30749d0ac79574788b79fe477e8c46e33d1defe'
          and binding.assigned_edition = 'unlimited'
          and card.id = '8c1fe8e6-b3a6-5727-971b-fa1629d5d635'::uuid
          and card.gv_id = 'GV-PK-G2-75-UNLIMITED'
          and printing.id = '28040606-5e98-50dd-969f-3273a6345b9f'::uuid)
        or (binding.product_id = 85721 and binding.source_subtype = '1st Edition'
          and binding.source_observation_id = 'ce7b33ab-299d-4ee3-914b-161100ab1aa6'::uuid
          and binding.source_sync_run_id = 'e429784c-55f2-4922-94dc-0cc560acda8d'::uuid
          and binding.source_product_sha256 = 'f4ce84f6a2a327a11c1bcd223601e5681770d154aa2e51574ec47c67cfdf7511'
          and binding.source_price_row_hash = 'b0831080d3cb31ea7a271f731edd102b2236f2eb8848b638e45144e7a59a6598'
          and binding.assigned_edition = 'first_edition'
          and card.id = 'bd623537-374a-5526-bb24-fcc14022c6e9'::uuid
          and card.gv_id = 'GV-PK-G2-76-FIRST-EDITION'
          and printing.id = '47e6ad7c-a0b5-579e-86d6-fd16245e46c1'::uuid)
        or (binding.product_id = 85721 and binding.source_subtype = 'Unlimited'
          and binding.source_observation_id = '6febacee-1bcd-4592-aedf-f478a7a94d97'::uuid
          and binding.source_sync_run_id = 'e429784c-55f2-4922-94dc-0cc560acda8d'::uuid
          and binding.source_product_sha256 = 'f4ce84f6a2a327a11c1bcd223601e5681770d154aa2e51574ec47c67cfdf7511'
          and binding.source_price_row_hash = 'f62a49c7d5a69efd1bb4c634438779ecaa92a0a82e6c95b689f56fe33361f80a'
          and binding.assigned_edition = 'unlimited'
          and card.id = 'a5923fb0-b9b1-50d7-9494-3c229e20f7a4'::uuid
          and card.gv_id = 'GV-PK-G2-76-UNLIMITED'
          and printing.id = '3d71caeb-2742-52f2-8e28-406ddb2a8a26'::uuid)
      )
  );
$$;


comment on function public.pokemon_tcgplayer_gym_challenge_binding_valid_v1(uuid,boolean) is
  'Validates immutable reviewed Gym authority plus the current exact TCGPlayer product identity; daily price observations remain run-scoped assignments.';

commit;



