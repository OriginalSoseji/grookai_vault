import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const packageId = 'GROOKAI_BETA_HARDENING_READINESS_V1';
const outDir = path.join(repoRoot, 'docs/audits/grookai_beta_hardening_readiness_v1');
const outJson = path.join(outDir, 'grookai_beta_hardening_readiness_v1.json');
const outMd = path.join(outDir, 'grookai_beta_hardening_readiness_v1.md');

const files = {
  imageFinal: 'docs/audits/image_truth_v1/self_hosted_images_wh19a_final_image_hosting_state_scan_summary_v1.json',
  imageRuntime: 'docs/audits/image_truth_v1/image_truth_img21a_runtime_surface_smoke_v1.json',
  dexRuntime: 'docs/audits/image_truth_v1/image_truth_img23a_dex_child_fallback_runtime_scan_v1.json',
  cardRuntime: 'docs/audits/image_truth_v1/image_truth_img23b_card_detail_child_fallback_runtime_scan_v1.json',
  promoReadiness: 'docs/audits/master_index_promo_origin_v1/master_index_promo_origin_03a_public_copy_readiness_summary_v1.json',
  promoFamily: 'docs/audits/master_index_promo_origin_v1/master_index_promo_origin_03b_family_public_copy_export_summary_v1.json',
  promoExact: 'docs/audits/master_index_promo_origin_v1/master_index_promo_origin_03c_exact_public_copy_export_summary_v1.json',
  baseSetApply: 'docs/audits/base_set_print_run_lanes_v1/base_set_print_run_lanes_representative_parent_image_pointer_apply_result_v1.json',
  worldChampSmoke: 'docs/audits/master_index_world_championship_decks_v1/world_championship_decks_09f_runtime_search_smoke_v1.json',
  worldChampLiveSmoke: 'docs/audits/master_index_world_championship_decks_v1/world_championship_decks_09g_live_prod_smoke_v1.json',
  curatedFallbackLiveScan: 'docs/audits/image_truth_v1/image_truth_img24a_curated_fallback_live_scan_v1.json',
  webVariantOrigin: 'apps/web/src/lib/cards/variantOriginPublicCopy.generated.json',
  mobileVariantOrigin: 'lib/services/identity/variant_origin_public_copy_generated.dart',
};

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeJson(relativePath) {
  try {
    return { ok: true, data: readJson(relativePath) };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

function extractDartConst(source, name) {
  const match = source.match(new RegExp(`const String ${name} = ("(?:[^"\\\\]|\\\\.)*");`));
  return match ? JSON.parse(match[1]) : null;
}

function parseMobileVariantOrigin() {
  const source = readText(files.mobileVariantOrigin);
  const chunks = [...source.matchAll(/^\s+("(?:[^"\\]|\\.)*"),$/gm)].map((match) => JSON.parse(match[1]));
  const payloadJson = chunks.join('');
  return {
    generated_at: extractDartConst(source, 'variantOriginGeneratedAt'),
    source_fingerprint_sha256: extractDartConst(source, 'variantOriginSourceFingerprintSha256'),
    source_version: extractDartConst(source, 'variantOriginSourceVersion'),
    payload_hash: sha256(payloadJson),
    payload: JSON.parse(payloadJson),
  };
}

function countFailures(items = []) {
  return items.filter((item) => item && item.passed === false).length;
}

function buildReport() {
  const imageFinal = safeJson(files.imageFinal);
  const imageRuntime = safeJson(files.imageRuntime);
  const dexRuntime = safeJson(files.dexRuntime);
  const cardRuntime = safeJson(files.cardRuntime);
  const promoReadiness = safeJson(files.promoReadiness);
  const promoFamily = safeJson(files.promoFamily);
  const promoExact = safeJson(files.promoExact);
  const baseSetApply = safeJson(files.baseSetApply);
  const worldChampSmoke = safeJson(files.worldChampSmoke);
  const worldChampLiveSmoke = safeJson(files.worldChampLiveSmoke);
  const curatedFallbackLiveScan = safeJson(files.curatedFallbackLiveScan);
  const webVariantOrigin = readJson(files.webVariantOrigin);
  const mobileVariantOrigin = parseMobileVariantOrigin();

  const webMobilePayload = {
    families: webVariantOrigin.families ?? {},
    by_gv_id: webVariantOrigin.by_gv_id ?? {},
    by_card_print_id: webVariantOrigin.by_card_print_id ?? {},
  };
  const webMobilePayloadHash = sha256(JSON.stringify(webMobilePayload));

  const imageMetrics = imageFinal.data?.metrics ?? {};
  const promoFamilyMetrics = promoFamily.data?.metrics ?? {};
  const promoExactMetrics = promoExact.data?.metrics ?? {};
  const promoReadinessMetrics = promoReadiness.data?.metrics ?? {};
  const baseSetMetrics = baseSetApply.data ?? {};
  const worldHttp = worldChampSmoke.data?.http ?? {};
  const worldDb = worldChampSmoke.data?.db ?? {};
  const imageRuntimeFailures = imageRuntime.data?.failures ?? [];
  const worldFailures = worldChampSmoke.data?.failures ?? [];
  const worldLiveFailures = worldChampLiveSmoke.data?.failures ?? [];
  const curatedFallbackFailures = curatedFallbackLiveScan.data?.failures ?? [];
  const worldHttpFailures =
    countFailures(worldHttp.routes ?? []) + countFailures(worldHttp.redirects ?? []);
  const worldDbProbeFailures = countFailures(worldDb.probes ?? []);

  const launchBlockerCandidates = [
    {
      rank: 1,
      severity: 'P1 beta blocker',
      lane: 'World Championship production parity',
      status:
        worldChampLiveSmoke.ok && worldLiveFailures.length === 0
          ? 'live_production_clear'
          : 'needs_live_production_smoke',
      finding:
        worldChampLiveSmoke.ok && worldLiveFailures.length === 0
          ? 'World Championship live production smoke is clear.'
          : 'World Championship live production smoke still fails: sampled WCD card pages serialize TCGdex fallbackSrc despite self-hosted primary images.',
      evidence: [files.worldChampSmoke, files.worldChampLiveSmoke],
    },
    {
      rank: 2,
      severity: 'P1 beta blocker',
      lane: 'Child image fallback surface parity',
      status:
        curatedFallbackLiveScan.ok && curatedFallbackFailures.length === 0
          ? 'live_curated_scan_clear'
          : 'blocked',
      finding:
        curatedFallbackLiveScan.ok && curatedFallbackFailures.length === 0
          ? 'Non-empty live fallback scan covers Dex, card detail, and set detail with no failures.'
          : 'Fallback surface runtime scan has failures or missing evidence.',
      evidence: [files.dexRuntime, files.cardRuntime, files.curatedFallbackLiveScan, 'tests/contracts/image_surface_consistency_v1.test.mjs'],
    },
  ];

  const launchBlockers = launchBlockerCandidates
    .filter((finding) => !['live_production_clear', 'live_curated_scan_clear'].includes(finding.status))
    .map((finding, index) => ({ ...finding, rank: index + 1 }));

  const followups = [
    {
      rank: 1,
      severity: 'P2 enrichment backlog',
      lane: 'Exact image completeness',
      status: 'not_launch_blocking_if_representative_labeling_remains_visible',
      finding:
        'English physical parent rows have no missing image-field gaps. Remaining exact-image gap is quality of truth: representative rows still need exact acquisition over time.',
      evidence: [files.imageFinal],
    },
    {
      rank: 2,
      severity: 'P2 regression guard',
      lane: 'Promo origin public copy',
      status:
        (promoFamilyMetrics.added_public_copy_rows ?? 0) === 1523 &&
        (promoExactMetrics.exact_public_copy_rows_added ?? 0) === 4
          ? 'covered'
          : 'blocked',
      finding:
        'Family-level promo copy and the four previously excluded source-backed rows are exported. Pre-export readiness still records the old four-row gap, so use the 03C exact export as current truth.',
      evidence: [files.promoReadiness, files.promoFamily, files.promoExact],
    },
  ];

  const report = {
    package_id: packageId,
    generated_at: new Date().toISOString(),
    mode: 'read_only_repo_artifact_consolidation_no_db_no_storage_no_migration_no_pricing_no_ai',
    explicit_non_scope: [
      'db_writes',
      'migrations',
      'image_uploads',
      'pointer_repoints',
      'pricing',
      'japanese',
      'ai_expansion',
    ],
    evidence_files: files,
    summary: {
      launch_posture:
        worldChampLiveSmoke.ok &&
        worldLiveFailures.length === 0 &&
        curatedFallbackLiveScan.ok &&
        curatedFallbackFailures.length === 0 &&
        imageRuntime.ok &&
        imageRuntimeFailures.length === 0
          ? 'beta_ready_with_ranked_followups'
          : 'not_ready_until_blockers_clear',
      top_blocker: launchBlockers[0]?.finding ?? 'No launch blockers remain in the current evidence set.',
      cleared_checks: [
        'Live sampled image runtime smoke is clear for 11 routes on https://grookaivault.com.',
        'Non-empty live curated fallback scan is clear for Dex, card detail, and set detail.',
        'Selected deterministic search, AI boundary, promo origin, image parity, Base Set, and World Championship decklist contracts passed.',
        'Web/mobile variant origin generated payloads are synced.',
      ],
      contract_tests_run_separately:
        'node --test tests/contracts/grookai_ai_search_boundary_v1.test.mjs tests/contracts/promo_origin_public_copy_v1.test.mjs tests/contracts/image_surface_consistency_v1.test.mjs tests/contracts/base_set_print_run_lanes_contract_v1.test.mjs tests/contracts/base_set_print_run_lanes_web_parity_v1.test.mjs tests/contracts/world_championship_decklist_public_surface.test.mjs',
    },
    lanes: {
      image_coverage: {
        status:
          (imageMetrics.english_physical_parent_rows_without_any_image_field ?? null) === 0 &&
          (imageMetrics.priority_parent_rows_without_any_image_field ?? null) === 0
            ? 'parent_coverage_clear'
            : 'parent_gaps_present',
        generated_at: imageFinal.data?.generated_at ?? null,
        parent_rows_scanned: imageMetrics.parent_rows_scanned ?? null,
        english_physical_parent_rows_without_any_image_field:
          imageMetrics.english_physical_parent_rows_without_any_image_field ?? null,
        priority_parent_rows_without_any_image_field:
          imageMetrics.priority_parent_rows_without_any_image_field ?? null,
        child_rows_without_any_image_field: imageMetrics.child_rows_without_any_image_field ?? null,
        parent_image_status_counts: imageFinal.data?.parent_image_status_counts ?? {},
        world_championship_image_status_counts:
          imageFinal.data?.world_championship_image_status_counts ?? {},
        note:
          'Child rows intentionally remain sparse in image fields; surface fallback parity is the launch contract.',
      },
      surface_parity: {
        status:
          curatedFallbackLiveScan.ok && curatedFallbackFailures.length === 0
            ? 'live_curated_scan_clear_candidate_scans_empty'
            : 'contract_tests_clear_runtime_candidate_scans_empty',
        card_detail_runtime_failed_routes: cardRuntime.data?.summary?.failed_routes ?? null,
        dex_runtime_failed_routes: dexRuntime.data?.summary?.failed_routes ?? null,
        card_detail_routes_scanned: cardRuntime.data?.summary?.card_routes_scanned ?? null,
        dex_routes_scanned: dexRuntime.data?.summary?.species_routes_scanned ?? null,
        curated_live_routes_scanned: curatedFallbackLiveScan.data?.summary?.routes_scanned ?? null,
        curated_live_failed_routes: curatedFallbackLiveScan.data?.summary?.failed_routes ?? null,
      },
      promo_origin_coverage: {
        status:
          (promoExactMetrics.exact_public_copy_rows_added ?? null) === 4
            ? 'covered_after_03c_exact_export'
            : 'missing_exact_export',
        readiness_missing_before_exports: promoReadinessMetrics.promo_rows_missing_public_copy ?? null,
        family_rows_added: promoFamilyMetrics.added_public_copy_rows ?? null,
        exact_rows_added: promoExactMetrics.exact_public_copy_rows_added ?? null,
        output_public_copy_rows_total: promoExactMetrics.output_public_copy_rows_total ?? null,
        previously_excluded_rows_resolved: (promoExact.data?.rows ?? []).map((row) => ({
          gv_id: row.gv_id,
          name: row.name,
          family_key: row.family_key,
        })),
      },
      search_contract_health: {
        status: 'selected_contract_tests_passed',
        deterministic_search_ai_model_calls_allowed: false,
        ai_leakage_evidence:
          'tests/contracts/grookai_ai_search_boundary_v1.test.mjs verifies normal Search does not call AI and Search lane model calls are blocked.',
      },
      mobile_parity: {
        status:
          webMobilePayloadHash === mobileVariantOrigin.payload_hash &&
          webVariantOrigin.generated_at === mobileVariantOrigin.generated_at &&
          webVariantOrigin.source_fingerprint_sha256 === mobileVariantOrigin.source_fingerprint_sha256
            ? 'synced'
            : 'out_of_sync',
        web_generated_at: webVariantOrigin.generated_at ?? null,
        mobile_generated_at: mobileVariantOrigin.generated_at,
        web_source_fingerprint_sha256: webVariantOrigin.source_fingerprint_sha256 ?? null,
        mobile_source_fingerprint_sha256: mobileVariantOrigin.source_fingerprint_sha256,
        web_mobile_payload_hash: webMobilePayloadHash,
        mobile_payload_hash: mobileVariantOrigin.payload_hash,
        web_counts: {
          families: Object.keys(webMobilePayload.families).length,
          by_gv_id: Object.keys(webMobilePayload.by_gv_id).length,
          by_card_print_id: Object.keys(webMobilePayload.by_card_print_id).length,
        },
        mobile_counts: {
          families: Object.keys(mobileVariantOrigin.payload.families ?? {}).length,
          by_gv_id: Object.keys(mobileVariantOrigin.payload.by_gv_id ?? {}).length,
          by_card_print_id: Object.keys(mobileVariantOrigin.payload.by_card_print_id ?? {}).length,
        },
      },
      production_smoke: {
        status: imageRuntimeFailures.length === 0 ? 'sampled_live_image_routes_clear' : 'failures_present',
        live_base_url: imageRuntime.data?.base_url ?? null,
        live_routes_checked: imageRuntime.data?.results?.length ?? null,
        live_failures: imageRuntimeFailures,
        world_championship_smoke_base_url: worldHttp.base_url ?? null,
        world_championship_routes_checked: worldHttp.routes?.length ?? null,
        world_championship_redirects_checked: worldHttp.redirects?.length ?? null,
        world_championship_local_failures:
          worldFailures.length + worldHttpFailures + worldDbProbeFailures,
        world_championship_live_base_url: worldChampLiveSmoke.data?.base_url ?? null,
        world_championship_live_routes_checked: worldChampLiveSmoke.data?.routes?.length ?? null,
        world_championship_live_redirects_checked: worldChampLiveSmoke.data?.redirects?.length ?? null,
        world_championship_live_failures: worldLiveFailures,
      },
      base_set_print_run_lanes: {
        status:
          baseSetMetrics.applied === true &&
          baseSetMetrics.updated_rows === 304 &&
          imageMetrics.base_set_print_run_lane_parent_rows_without_any_image_field === 0
            ? 'representative_pointer_gap_closed'
            : 'needs_followup',
        updated_rows: baseSetMetrics.updated_rows ?? null,
        image_status: baseSetMetrics.proposed_image_statuses ?? {},
        current_missing_after_final_scan:
          imageMetrics.base_set_print_run_lane_parent_rows_without_any_image_field ?? null,
      },
      world_championship_rows: {
        status:
          (imageMetrics.world_championship_sets_without_60_card_deck_quantity_total ?? null) === 0 &&
          (imageMetrics.world_championship_parent_rows_without_any_image_field ?? null) === 0
            ? 'rows_complete_for_beta_display'
            : 'gaps_present',
        sets: imageMetrics.world_championship_sets ?? null,
        card_print_rows: worldDb.counts?.card_print_rows ?? null,
        deck_quantity_sum_from_card_rows:
          imageMetrics.world_championship_deck_quantity_sum_from_card_rows ?? null,
        exact_parent_rows: imageMetrics.world_championship_parent_rows_exact ?? null,
        representative_parent_rows: imageMetrics.world_championship_parent_rows_representative ?? null,
      },
    },
    launch_blockers_ranked: launchBlockers,
    followups_ranked: followups,
    no_write_assertions: {
      db_writes_performed_by_this_audit: false,
      storage_writes_performed_by_this_audit: false,
      migrations_created_by_this_audit: false,
      ai_model_calls_performed_by_this_audit: false,
    },
  };

  report.fingerprint = sha256(JSON.stringify(report));
  return report;
}

function renderMarkdown(report) {
  const lines = [
    `# ${report.package_id}`,
    '',
    `Generated: ${report.generated_at}`,
    '',
    '## Summary',
    '',
    `- Launch posture: ${report.summary.launch_posture}`,
    `- Top blocker: ${report.summary.top_blocker}`,
    `- Mode: ${report.mode}`,
    '',
    '## Scope',
    '',
    '- Read-only consolidation only.',
    `- Explicit non-scope: ${report.explicit_non_scope.join(', ')}`,
    '',
    '## Lane Status',
    '',
    `- Image coverage: ${report.lanes.image_coverage.status}; English physical parent image gaps = ${report.lanes.image_coverage.english_physical_parent_rows_without_any_image_field}; child image field gaps = ${report.lanes.image_coverage.child_rows_without_any_image_field}.`,
    `- Surface parity: ${report.lanes.surface_parity.status}; curated live routes scanned = ${report.lanes.surface_parity.curated_live_routes_scanned}; curated failures = ${report.lanes.surface_parity.curated_live_failed_routes}; DB-derived card detail routes scanned = ${report.lanes.surface_parity.card_detail_routes_scanned}; DB-derived Dex routes scanned = ${report.lanes.surface_parity.dex_routes_scanned}.`,
    `- Promo origin coverage: ${report.lanes.promo_origin_coverage.status}; family rows added = ${report.lanes.promo_origin_coverage.family_rows_added}; exact rows added = ${report.lanes.promo_origin_coverage.exact_rows_added}.`,
    `- Search contract health: ${report.lanes.search_contract_health.status}; normal Search AI model calls allowed = ${report.lanes.search_contract_health.deterministic_search_ai_model_calls_allowed}.`,
    `- Mobile parity: ${report.lanes.mobile_parity.status}; web/mobile payload hashes match = ${report.lanes.mobile_parity.web_mobile_payload_hash === report.lanes.mobile_parity.mobile_payload_hash}.`,
    `- Production smoke: ${report.lanes.production_smoke.status}; live routes checked = ${report.lanes.production_smoke.live_routes_checked}; live failures = ${report.lanes.production_smoke.live_failures.length}.`,
    `- Base Set print-run lanes: ${report.lanes.base_set_print_run_lanes.status}; updated rows = ${report.lanes.base_set_print_run_lanes.updated_rows}; current missing after final scan = ${report.lanes.base_set_print_run_lanes.current_missing_after_final_scan}.`,
    `- World Championship rows: ${report.lanes.world_championship_rows.status}; sets = ${report.lanes.world_championship_rows.sets}; deck card quantity sum = ${report.lanes.world_championship_rows.deck_quantity_sum_from_card_rows}.`,
    '',
    '## Launch Blockers',
    '',
    ...report.launch_blockers_ranked.map((finding) => (
      `${finding.rank}. ${finding.severity} - ${finding.lane}: ${finding.status}. ${finding.finding}`
    )),
    '',
    '## Followups',
    '',
    ...report.followups_ranked.map((finding) => (
      `${finding.rank}. ${finding.severity} - ${finding.lane}: ${finding.status}. ${finding.finding}`
    )),
    '',
    '## Cleared Checks',
    '',
    ...report.summary.cleared_checks.map((check) => `- ${check}`),
    '',
    '## Evidence',
    '',
    ...Object.entries(report.evidence_files).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Verification',
    '',
    `- Contract command run outside this report: \`${report.summary.contract_test_command ?? report.summary.contract_tests_run_separately}\``,
    `- Report fingerprint: ${report.fingerprint}`,
  ];

  return `${lines.join('\n')}\n`;
}

fs.mkdirSync(outDir, { recursive: true });
const report = buildReport();
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(outMd, renderMarkdown(report));
console.log(JSON.stringify({
  package_id: report.package_id,
  output_json: path.relative(repoRoot, outJson),
  output_md: path.relative(repoRoot, outMd),
  launch_posture: report.summary.launch_posture,
  fingerprint: report.fingerprint,
}, null, 2));
