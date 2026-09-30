import { CATALOG_COMPONENTS, CATALOG_EVIDENCE_VERSION, CATALOG_SCOPE } from './background_catalog_evidence_v1.mjs';

// Existing durable identities define the monitored scope. These reads do not
// substitute marketplace inventories for an authoritative complete master index.
export async function collectCatalogReport(client, component) {
  if (!CATALOG_COMPONENTS.includes(component)) throw new Error('Unsupported catalog component');
  const report = { schema_version: CATALOG_EVIDENCE_VERSION, component, scope: CATALOG_SCOPE,
    catalog_completeness_proven: false, database_writes: 0, transaction_read_only: true,
    tls_verified: true, metrics: {}, coverage: {}, findings: [] };
  const query = async (sql, args = []) => (await client.query(sql, args)).rows;
  if (component === 'cross-tcg-sealed') {
    report.metrics = (await query(`select
      (select count(*)::int from public.sealed_product_families) families,
      (select count(*)::int from public.sealed_product_variants) variants,
      (select count(*)::int from public.sealed_product_candidates) candidates,
      (select count(*)::int from public.sealed_product_source_mappings) reviewed_mappings,
      (select count(*)::int from public.sealed_product_variants v
        left join public.sealed_product_families f on f.id=v.family_id where f.id is null) orphan_variants,
      (select count(*)::int from public.sealed_product_source_mappings m
        left join public.sealed_product_variants v on v.id=m.variant_id
        left join public.sealed_product_candidates c on c.id=m.candidate_id
        left join public.sealed_product_candidate_reviews r on r.id=m.review_id
        where v.id is null or c.id is null or r.id is null or r.candidate_id<>c.id
          or r.decision<>'confirmed_sealed' or not r.promotion_authorized
          or m.mapping_status<>'exact_reviewed') invalid_review_bindings`))[0];
    report.coverage = {
      by_game: await query(`select f.game_key,count(distinct f.id)::int families,count(v.id)::int variants
        from public.sealed_product_families f left join public.sealed_product_variants v on v.family_id=f.id
        group by f.game_key order by f.game_key`),
      candidates_by_classification: await query(`select classification,count(*)::int rows
        from public.sealed_product_candidates group by classification order by classification`),
      pending_review_candidates: (await query(`select count(*)::int rows from public.sealed_product_candidates c
        where not exists(select 1 from public.sealed_product_candidate_reviews r where r.candidate_id=c.id)`))[0].rows,
      unmapped_variants: (await query(`select count(*)::int rows from public.sealed_product_variants v
        where not exists(select 1 from public.sealed_product_source_mappings m where m.variant_id=v.id)`))[0].rows,
    };
    report.catalog_rows = report.metrics.variants;
    for (const key of ['orphan_variants', 'invalid_review_bindings']) if (report.metrics[key]) report.findings.push({ code: key, count: report.metrics[key] });
  } else {
    const japanese = component === 'japanese-master-index';
    const game = japanese ? 'pokemon_jpn' : 'one_piece';
    const domain = japanese ? 'pokemon_jpn' : 'one_piece_eng_print';
    // Archived duplicate shells remain preserved. Exclude only when the saved
    // redirect proves a different, still-active Japanese canonical parent.
    const archived = `coalesce(c.data_quality_flags#>>'{master_identity_graph_jpn_duplicate_shell,status}'='superseded_duplicate_shell'
      and not exists(select 1 from public.card_print_identity own where own.card_print_id=c.id and own.is_active)
      and exists(select 1 from public.card_prints target join public.card_print_identity ti on ti.card_print_id=target.id
        where target.id::text=c.data_quality_flags#>>'{master_identity_graph_jpn_duplicate_shell,canonical_card_print_id}'
          and target.gv_id=c.data_quality_flags#>>'{master_identity_graph_jpn_duplicate_shell,canonical_gv_id}'
          and target.id<>c.id and ti.is_active and ti.identity_domain='pokemon_jpn'),false)`;
    const japaneseScope = `(c.identity_domain=$1 or exists
      (select 1 from public.card_print_identity i where i.card_print_id=c.id and i.identity_domain=$1 and i.is_active))`;
    const scope = japanese
      ? `select c.* from public.card_prints c where ${japaneseScope} and not (${archived})`
      : `select c.* from public.card_prints c join public.games g on g.id=c.game_id where g.code=$1`;
    report.metrics = (await query(`with cards as materialized (${scope}) select
      (select count(*)::int from cards) cards,
      (select count(distinct set_id)::int from cards) sets,
      (select count(*)::int from cards c where not exists
        (select 1 from public.card_print_identity i where i.card_print_id=c.id and i.is_active and i.identity_domain=$3)) missing_active_identity,
      (select count(*)::int from (select i.card_print_id from public.card_print_identity i join cards c on c.id=i.card_print_id
        where i.is_active group by i.card_print_id having count(*)>1) x) multiple_active_identities,
      (select count(*)::int from cards c where not exists
        (select 1 from public.sets s where s.id=c.set_id and s.game=any($2::text[]) and lower(s.code)=lower(c.set_code))) missing_set,
      (select count(*)::int from cards c where exists
        (select 1 from public.external_mappings m where m.card_print_id=c.id and m.active)) mapped_cards,
      (select count(*)::int from cards c where exists
        (select 1 from public.card_printings p where p.card_print_id=c.id and not p.is_provisional)) cards_with_exact_printings,
      (select count(*)::int from cards c where coalesce(nullif(c.image_path,''),nullif(c.image_url,'')) is null) missing_image
      `, [game, japanese ? ['pokemon_jpn', 'pokemon'] : [game], domain]))[0];
    report.coverage = {
      by_set: await query(`with cards as (${scope}) select set_code,count(*)::int cards from cards group by set_code order by set_code`, [game]),
      by_provider: await query(`with cards as (${scope}) select m.source,count(*)::int mappings,count(distinct m.card_print_id)::int cards
        from public.external_mappings m join cards c on c.id=m.card_print_id where m.active group by m.source order by m.source`, [game]),
      unmapped_cards: report.metrics.cards - report.metrics.mapped_cards,
      cards_without_exact_printings: report.metrics.cards - report.metrics.cards_with_exact_printings,
      missing_images: report.metrics.missing_image,
      gap_disposition: 'Observation only; mapping, printing and image gaps require separately governed evidence and repair.',
    };
    report.coverage.verified_archived_duplicate_shells = japanese
      ? (await query(`select count(*)::int rows from public.card_prints c where ${japaneseScope} and (${archived})`, [domain]))[0].rows : 0;
    if (report.metrics.missing_active_identity) report.coverage.missing_identity_samples = await query(
      `with cards as (${scope}) select c.id,c.gv_id,c.set_code,
        c.data_quality_flags#>'{master_identity_graph_jpn_duplicate_shell}' archived_redirect
        from cards c where not exists(select 1 from public.card_print_identity i
          where i.card_print_id=c.id and i.is_active and i.identity_domain=$2) order by c.id limit 20`, [game, domain]);
    report.catalog_rows = report.metrics.cards;
    for (const key of ['missing_active_identity', 'multiple_active_identities', 'missing_set']) if (report.metrics[key]) report.findings.push({ code: key, count: report.metrics[key] });
  }
  if (report.catalog_rows <= 0) report.findings.push({ code: 'empty_catalog', count: report.catalog_rows });
  report.observed_at = new Date().toISOString();
  return report;
}
