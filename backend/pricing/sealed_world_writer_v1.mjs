async function insertRows(client, rows, sql, batchSize = 500) {
  for (let index = 0; index < rows.length; index += batchSize) {
    await client.query(sql, [JSON.stringify(rows.slice(index, index + batchSize))]);
  }
}

export async function insertSealedWorldPlanV1(client, plan, { reviewerId, activate = false } = {}) {
  if (!reviewerId) throw new Error('Explicit game reviewer identity required');
  const p = plan.payload;
  await insertRows(client, p.candidates, `insert into public.sealed_product_candidates
    (id,source_provider,source_category_id,source_group_id,source_product_id,
     source_product_name,source_payload_hash,classifier_version,classification,
     confidence,evidence,candidate_identity,ambiguity_reasons,requires_review,
     promotion_eligible,canonical_authority,publication_authority)
    select * from jsonb_to_recordset($1::jsonb) as x(id uuid,source_provider text,
     source_category_id bigint,source_group_id bigint,source_product_id bigint,
     source_product_name text,source_payload_hash text,classifier_version text,
     classification text,confidence numeric,evidence jsonb,candidate_identity jsonb,
     ambiguity_reasons text[],requires_review boolean,promotion_eligible boolean,
     canonical_authority boolean,publication_authority boolean)`);
  await insertRows(client, p.families, `insert into public.sealed_product_families
    (id,game_key,family_key,canonical_name,manufacturer_name,product_line_key,
     identity_contract_version,identity_fingerprint)
    select * from jsonb_to_recordset($1::jsonb) as x(id uuid,game_key text,
     family_key text,canonical_name text,manufacturer_name text,product_line_key text,
     identity_contract_version text,identity_fingerprint text)`);
  await insertRows(client, p.variants, `insert into public.sealed_product_variants
    (id,family_id,variant_key,canonical_name,package_form,language_code,region_code,
     edition,wave,explicit_contents,manufacturer_sku,upc,release_date,
     identity_contract_version,identity_fingerprint)
    select * from jsonb_to_recordset($1::jsonb) as x(id uuid,family_id uuid,
     variant_key text,canonical_name text,package_form text,language_code text,
     region_code text,edition text,wave text,explicit_contents jsonb,
     manufacturer_sku text,upc text,release_date date,
     identity_contract_version text,identity_fingerprint text)`);
  await insertRows(client, p.reviews, `insert into public.sealed_product_candidate_reviews
    (id,candidate_id,decision,promotion_authorized,reviewed_by,decision_evidence,
     review_contract_version)
    select * from jsonb_to_recordset($1::jsonb) as x(id uuid,candidate_id uuid,
     decision text,promotion_authorized boolean,reviewed_by uuid,
     decision_evidence jsonb,review_contract_version text)`);
  await insertRows(client, p.mappings, `insert into public.sealed_product_source_mappings
    (id,variant_id,candidate_id,review_id,candidate_classification,review_decision,
     promotion_authorized,source_provider,source_category_id,source_group_id,
     source_product_id,source_product_name,source_url,source_payload_hash,
     classifier_version,mapping_contract_version,mapping_status,mapping_fingerprint)
    select * from jsonb_to_recordset($1::jsonb) as x(id uuid,variant_id uuid,
     candidate_id uuid,review_id uuid,candidate_classification text,
     review_decision text,promotion_authorized boolean,source_provider text,
     source_category_id bigint,source_group_id bigint,source_product_id bigint,
     source_product_name text,source_url text,source_payload_hash text,
     classifier_version text,mapping_contract_version text,mapping_status text,
     mapping_fingerprint text)`);
  await insertRows(client, p.evidence, `insert into public.sealed_product_variant_evidence
    (id,variant_id,source_mapping_id,evidence_dimension,source_provider,
     source_object_identity,source_field,source_value,normalized_value,
     evidence_strength,confidence,source_payload_hash,evidence_fingerprint,observed_at)
    select * from jsonb_to_recordset($1::jsonb) as x(id uuid,variant_id uuid,
     source_mapping_id uuid,evidence_dimension text,source_provider text,
     source_object_identity text,source_field text,source_value text,
     normalized_value jsonb,evidence_strength text,confidence numeric,
     source_payload_hash text,evidence_fingerprint text,observed_at timestamptz)`);
  await insertRows(client, p.qualifications,
    `insert into public.sealed_product_pricing_lane_qualifications
    (id,variant_id,source_mapping_id,source_price_row_identity,
     source_subtype_name_normalized,observed_on,currency,qualification_status,
     qualification_evidence,source_observation_fingerprint,
     qualification_contract_version,publication_authority)
    select * from jsonb_to_recordset($1::jsonb) as x(id uuid,variant_id uuid,
     source_mapping_id uuid,source_price_row_identity text,
     source_subtype_name_normalized text,observed_on date,currency text,
     qualification_status text,qualification_evidence jsonb,
     source_observation_fingerprint text,qualification_contract_version text,
     publication_authority boolean)`);
  await insertRows(client, p.releases, `insert into public.sealed_product_releases
    (id,game_key,release_key,release_state,source_audit_producer_sha,
     source_sample_logical_hash,release_contract_version,manifest_fingerprint,
     expected_member_count,created_by)
    select * from jsonb_to_recordset($1::jsonb) as x(id uuid,game_key text,
     release_key text,release_state text,source_audit_producer_sha text,
     source_sample_logical_hash text,release_contract_version text,
     manifest_fingerprint text,expected_member_count integer,created_by uuid)`);
  await insertRows(client, p.members, `insert into public.sealed_product_release_members
    (id,release_id,variant_id,source_mapping_id,qualification_id,
     qualification_status,member_fingerprint)
    select * from jsonb_to_recordset($1::jsonb) as x(id uuid,release_id uuid,
     variant_id uuid,source_mapping_id uuid,qualification_id uuid,
     qualification_status text,member_fingerprint text)`);
  const release = p.releases[0];
  await client.query('select public.sealed_product_freeze_release_v1($1,$2,$3)',
    [release.id, release.manifest_fingerprint, reviewerId]);
  if (activate) await client.query('select * from public.sealed_product_set_active_release_v1($1,$2,$3)',
    [release.id, null, reviewerId]);
}
