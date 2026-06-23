import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const CONTACT_SHEET_DIR = path.join(OUTPUT_DIR, 'contact_sheets');
const SOURCE_SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh08a_mcdonalds_back_image_audit_summary_v1.json');
const RESULT_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh08b_mcdonalds_visual_review_report_v1.json');
const RESULT_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh08b_mcdonalds_visual_review_report_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-08B-MCDONALDS-VISUAL-REVIEW-REPORT';

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

function proofHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalizeJson(value))).digest('hex');
}

function renderMarkdown(report) {
  const sheets = report.contact_sheets.map((sheet) => `- ${sheet}`).join('\n');
  return `# ${PACKAGE_ID}

- Generated: ${report.generated_at}
- Mode: ${report.mode}
- Fingerprint: \`${report.fingerprint}\`
- Source package: ${report.source_package_id}
- Source fingerprint: \`${report.source_fingerprint}\`
- McDonald's rows reviewed: ${report.rows_reviewed}
- Contact sheets reviewed: ${report.contact_sheets_reviewed}
- Observed card-back images: ${report.observed_card_back_images}
- Repair package needed for card backs: ${report.card_back_repair_package_needed}
- DB writes performed: ${report.db_writes_performed}
- Storage writes performed: ${report.storage_writes_performed}
- Migrations created: ${report.migrations_created}

## Contact Sheets

${sheets}

## Result

The WH08A color heuristic over-triggered on normal McDonald's fronts, especially water/fire cards and bright attack boxes. Visual review of the generated contact sheets found no actual card-back images in the 191 hosted McDonald's parent rows.
`;
}

async function main() {
  const sourceSummary = JSON.parse(await fs.readFile(SOURCE_SUMMARY_JSON, 'utf8'));
  const contactSheets = (await fs.readdir(CONTACT_SHEET_DIR))
    .filter((name) => /^wh08a_mcdonalds_contact_sheet_\d+\.jpg$/i.test(name))
    .sort()
    .map((name) => path.relative(ROOT, path.join(CONTACT_SHEET_DIR, name)));

  const report = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'manual_visual_review_report_no_write',
    source_package_id: sourceSummary.package_id,
    source_fingerprint: sourceSummary.fingerprint,
    rows_reviewed: sourceSummary.rows_scanned,
    contact_sheets_reviewed: contactSheets.length,
    contact_sheets: contactSheets,
    observed_card_back_images: 0,
    card_back_repair_package_needed: false,
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    exact_image_claim_changes_performed: false,
    global_apply_performed: false,
  };
  report.fingerprint = proofHash({
    package_id: report.package_id,
    source_package_id: report.source_package_id,
    source_fingerprint: report.source_fingerprint,
    rows_reviewed: report.rows_reviewed,
    contact_sheets_reviewed: report.contact_sheets_reviewed,
    observed_card_back_images: report.observed_card_back_images,
    card_back_repair_package_needed: report.card_back_repair_package_needed,
    contact_sheets: report.contact_sheets,
  });

  await fs.writeFile(RESULT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(RESULT_MD, renderMarkdown(report), 'utf8');
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    result_json: path.relative(ROOT, RESULT_JSON),
    result_md: path.relative(ROOT, RESULT_MD),
    fingerprint: report.fingerprint,
    observed_card_back_images: report.observed_card_back_images,
    card_back_repair_package_needed: report.card_back_repair_package_needed,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
