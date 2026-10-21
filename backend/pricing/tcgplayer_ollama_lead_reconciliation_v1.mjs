function text(value) {
  return String(value ?? '').trim();
}

export function reconcileTcgplayerOllamaLeadsV1(inputRows, triageRows) {
  const inputByProduct = new Map(inputRows.map((row) => [Number(row.source_product_id), row]));
  const leads = triageRows
    .filter((row) => row.disposition === 'review_required'
      && row.advice?.decision === 'lead_candidate'
      && row.lead_target?.candidate_id)
    .map((result) => {
      const source = inputByProduct.get(Number(result.source_product_id));
      if (!source) throw new Error(`Missing source row for ${result.source_product_id}`);
      const enrichedTarget = (source.review_targets ?? []).find((candidate) =>
        text(candidate.card_print_id || candidate.gv_id) === text(result.lead_target.candidate_id));
      return {
        source_product_id: Number(result.source_product_id),
        source_product_name: text(source.source_product_name),
        source_group_id: Number(source.source_group_id),
        source_group_name: text(source.source_group_name),
        printed_number: text(source.printed_number),
        source_subtypes: Array.isArray(source.source_subtypes) ? source.source_subtypes : [],
        supporting_gap_row_count: Number(source.supporting_gap_row_count ?? 0),
        source_reason: text(source.reason),
        advice: result.advice,
        target: { ...result.lead_target, ...(enrichedTarget ?? {}) },
        candidate_search: source.candidate_search ?? null,
      };
    });

  const byTarget = new Map();
  for (const lead of leads) {
    const targetId = lead.target.candidate_id;
    const values = byTarget.get(targetId) ?? [];
    values.push(lead);
    byTarget.set(targetId, values);
  }

  const collisionHolds = [];
  const reviewQueue = [];
  for (const lead of leads) {
    const competitors = byTarget.get(lead.target.candidate_id) ?? [];
    if (competitors.length > 1) {
      collisionHolds.push({
        ...lead,
        disposition: 'held_by_batch_target_collision',
        collision_source_product_ids: competitors.map((row) => row.source_product_id).sort((a, b) => a - b),
      });
    } else {
      reviewQueue.push({ ...lead, disposition: 'review_queue' });
    }
  }

  const fastTrack = reviewQueue.filter((lead) => {
    const evidence = lead.target.candidate_evidence;
    const reviewedAliasAlignment = lead.advice.reason_code === 'unique_field_alignment'
      && Number(evidence?.name_similarity ?? 0) >= 0.5;
    return lead.printed_number
      && lead.advice.confidence >= 0.95
      && evidence?.number_exact === true
      && (evidence?.name_exact === true || reviewedAliasAlignment)
      && evidence?.target_set_source !== 'global_catalog_search'
      && Number(lead.target.active_standard_identity_count) === 1
      && Number(lead.target.active_tcgplayer_mapping_count) === 0;
  }).map((lead) => ({ ...lead, disposition: 'fast_track_review' }));
  const fastIds = new Set(fastTrack.map((lead) => lead.source_product_id));
  const manualReview = reviewQueue
    .filter((lead) => !fastIds.has(lead.source_product_id))
    .map((lead) => ({ ...lead, disposition: 'manual_review' }));

  return { leads, reviewQueue, fastTrack, manualReview, collisionHolds };
}
