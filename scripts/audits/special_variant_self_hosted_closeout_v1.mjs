import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const AUDIT_DIR = 'docs/audits/special_variant_printing_self_hosted_evidence_v1';
const PLAN_PATH = `${AUDIT_DIR}/special_variant_printing_self_hosted_evidence_plan_v1.json`;
const RESULT_PATH = `${AUDIT_DIR}/special_variant_printing_self_hosted_evidence_result_v1.json`;
const MANIFEST_PATH = 'apps/web/src/data/review/specialVariantPrintingEvidenceV1.json';
const REPORT_PATH = `${AUDIT_DIR}/special_variant_printing_self_hosted_reconciliation_v1.json`;
const REPORT_MD_PATH = `${AUDIT_DIR}/special_variant_printing_self_hosted_reconciliation_v1.md`;
const HASH_PATH = `${AUDIT_DIR}/artifact_hashes.sha256`;

const HASHED_PATHS = [
  PLAN_PATH,
  RESULT_PATH,
  MANIFEST_PATH,
  'apps/web/src/app/review/special-variants/page.tsx',
  'apps/web/src/app/api/review/special-variants/image/[cardPrintingId]/route.ts',
  'apps/web/src/components/review/SpecialVariantReviewClient.tsx',
  'apps/web/src/lib/review/specialVariantReviewTypes.ts',
  'docs/contracts/SPECIAL_VARIANT_SELF_HOSTED_REVIEW_V1.md',
  'docs/checkpoints/printing/SPECIAL_VARIANT_SELF_HOSTED_REVIEW_V1.md',
  'scripts/audits/special_variant_printing_self_hosted_evidence_v1.mjs',
  'scripts/audits/special_variant_printing_review_gate_v1.mjs',
  'scripts/audits/generate_special_variant_reviewer_instructions_v1.py',
  'scripts/audits/special_variant_self_hosted_closeout_v1.mjs',
  'tests/contracts/special_variant_self_hosted_review_v1.test.mjs',
  '.github/workflows/special-variant-self-hosted-evidence-v1.yml',
  '.github/workflows/special-variant-review-gates-v1.yml',
  'docs/audits/special_variant_printing_authority_v1/health/special_variant_printing_health_v1.json',
  `${AUDIT_DIR}/local_route_smoke_v1.json`,
  `${AUDIT_DIR}/POKEJAVI_SPECIAL_VARIANT_REVIEW_INSTRUCTIONS_V1.pdf`,
];

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(path.join(ROOT, file), 'utf8'));
}

export function reconcile(plan, result, manifest) {
  const failures = [];
  const resultByEvidence = new Map(result.rows.map((row) => [row.evidence_id, row]));
  const manifestByEvidence = new Map(manifest.rows.map((row) => [row.evidence_id, row]));
  if (plan.selected_rows !== 143 || plan.ready_rows !== 143 || plan.blocked_rows !== 0) failures.push('plan_count_mismatch');
  if (result.selected_rows !== 143 || result.failures !== 0) failures.push('result_count_mismatch');
  if (manifest.rows.length !== 143 || manifest.summary.self_hosted_verified !== 143) failures.push('manifest_count_mismatch');
  if (new Set(plan.rows.map((row) => row.evidence_id)).size !== 143) failures.push('duplicate_plan_evidence_id');
  if (new Set(plan.rows.map((row) => row.card_printing_id)).size !== 143) failures.push('duplicate_plan_card_printing_id');
  if (plan.packet_fingerprint !== result.packet_fingerprint || plan.packet_fingerprint !== manifest.packet_fingerprint) {
    failures.push('packet_fingerprint_mismatch');
  }
  if (plan.plan_fingerprint !== result.plan_fingerprint) failures.push('plan_fingerprint_mismatch');
  for (const row of plan.rows) {
    const upload = resultByEvidence.get(row.evidence_id);
    const review = manifestByEvidence.get(row.evidence_id);
    if (!upload || !review) {
      failures.push(`missing_evidence_row:${row.evidence_id}`);
      continue;
    }
    if (JSON.stringify(upload.source_image) !== JSON.stringify(upload.storage_readback)) {
      failures.push(`storage_readback_mismatch:${row.evidence_id}`);
    }
    if (review.source_image.sha256 !== row.source_image.sha256
      || review.storage_path !== row.storage_path
      || review.self_hosted_verified !== true) {
      failures.push(`review_manifest_binding_mismatch:${row.evidence_id}`);
    }
    if (review.automatic_approval_permitted !== false
      || review.automatic_publication_permitted !== false
      || review.automatic_pricing_mapping_permitted !== false) {
      failures.push(`automatic_authority_leak:${row.evidence_id}`);
    }
  }
  if (result.db_writes_performed !== false || result.approvals_performed !== false
    || result.publication_performed !== false || result.pricing_mappings_performed !== false) {
    failures.push('result_boundary_mismatch');
  }
  return {
    version: 'SPECIAL_VARIANT_PRINTING_SELF_HOSTED_RECONCILIATION_V1',
    generated_at: new Date().toISOString(),
    status: failures.length ? 'failed' : 'passed',
    packet_fingerprint: plan.packet_fingerprint,
    plan_fingerprint: plan.plan_fingerprint,
    selected_rows: plan.selected_rows,
    ready_rows: plan.ready_rows,
    uploaded_and_verified: result.uploaded_and_verified,
    verified_existing: result.verified_existing,
    storage_readback_matches: result.rows.filter((row) => JSON.stringify(row.source_image) === JSON.stringify(row.storage_readback)).length,
    review_manifest_rows: manifest.rows.length,
    primary_catalog_sources: plan.rows.filter((row) => row.source_provider.startsWith('tcgcsv_tcgplayer_catalog')).length,
    exact_secondary_sources: plan.rows.filter((row) => row.review_flags.includes('secondary_source_fallback')).length,
    marketplace_listing_photos: plan.rows.filter((row) => row.review_flags.includes('marketplace_listing_photo')).length,
    low_resolution_review_flags: plan.rows.filter((row) => row.review_flags.includes('low_resolution_source')).length,
    padded_canvas_review_flags: plan.rows.filter((row) => row.review_flags.includes('padded_or_nonstandard_canvas')).length,
    db_writes_performed: false,
    approvals_performed: false,
    publication_performed: false,
    pricing_mappings_performed: false,
    human_first_pass_decisions: 0,
    founder_decisions: 0,
    failures,
  };
}

function markdown(report) {
  return `# Special Variant Self-Hosted Reconciliation V1

- Status: **${report.status}**
- Selected: \`${report.selected_rows}\`
- Uploaded and verified: \`${report.uploaded_and_verified}\`
- Storage readback matches: \`${report.storage_readback_matches}\`
- Review manifest rows: \`${report.review_manifest_rows}\`
- Primary catalog sources: \`${report.primary_catalog_sources}\`
- Exact secondary sources: \`${report.exact_secondary_sources}\`
- Marketplace listing photos: \`${report.marketplace_listing_photos}\`
- Database writes: \`${report.db_writes_performed}\`
- Approvals: \`${report.approvals_performed}\`
- Publication changes: \`${report.publication_performed}\`
- Pricing mappings: \`${report.pricing_mappings_performed}\`
- PokeJavi decisions: \`${report.human_first_pass_decisions}\`
- Founder decisions: \`${report.founder_decisions}\`
- Packet fingerprint: \`${report.packet_fingerprint}\`
- Plan fingerprint: \`${report.plan_fingerprint}\`

The exact next gate is PokeJavi's authenticated image review and first-pass JSON export. No later transition is authorized by this reconciliation.
`;
}

export async function main() {
  const [plan, result, manifest] = await Promise.all([
    readJson(PLAN_PATH),
    readJson(RESULT_PATH),
    readJson(MANIFEST_PATH),
  ]);
  const report = reconcile(plan, result, manifest);
  if (report.failures.length) throw new Error(`Reconciliation failed:${report.failures.join(',')}`);
  await fs.writeFile(path.join(ROOT, REPORT_PATH), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(ROOT, REPORT_MD_PATH), markdown(report), 'utf8');
  const hashes = [];
  for (const file of [...HASHED_PATHS, REPORT_PATH, REPORT_MD_PATH]) {
    hashes.push(`${sha256(await fs.readFile(path.join(ROOT, file)))}  ${file.replaceAll('\\', '/')}`);
  }
  await fs.writeFile(path.join(ROOT, HASH_PATH), `${hashes.join('\n')}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({
    status: report.status,
    selected_rows: report.selected_rows,
    storage_readback_matches: report.storage_readback_matches,
    review_manifest_rows: report.review_manifest_rows,
    artifact_hash_count: hashes.length,
    report: REPORT_PATH,
    hashes: HASH_PATH,
  }, null, 2)}\n`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
