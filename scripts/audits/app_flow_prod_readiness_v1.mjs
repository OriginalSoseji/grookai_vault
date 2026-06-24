import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const packageId = 'APP_FLOW_PROD_READINESS_AUDIT_V1';
const outDir = path.join(repoRoot, 'docs/audits/app_flow_prod_readiness_v1');
const outJson = path.join(outDir, 'app_flow_prod_readiness_v1.json');
const outMd = path.join(outDir, 'app_flow_prod_readiness_v1.md');

const files = {
  main: 'lib/main.dart',
  shell: 'lib/main_shell.dart',
  cardDetail: 'lib/card_detail_screen.dart',
  vaultService: 'lib/services/vault/vault_card_service.dart',
  identityScan: 'lib/screens/identity_scan/identity_scan_screen.dart',
  identityService: 'lib/services/identity/identity_scan_service.dart',
  legacyScanIdentify: 'lib/screens/scanner/scan_identify_screen.dart',
  scannerPlaceholder: 'lib/screens/scanner/scanner_build_placeholder_screen.dart',
};

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function has(source, value) {
  return source.includes(value);
}

function sourceRefs(source, needles) {
  return needles.map((needle) => ({
    needle,
    present: has(source, needle),
  }));
}

function passAll(refs) {
  return refs.every((ref) => ref.present);
}

function buildReport() {
  const source = Object.fromEntries(
    Object.entries(files).map(([key, relativePath]) => [key, read(relativePath)]),
  );
  const wholeLibRefs = [
    source.main,
    source.shell,
    source.cardDetail,
    source.identityScan,
    source.identityService,
    source.legacyScanIdentify,
    source.scannerPlaceholder,
  ].join('\n');

  const cardDetailRefs = sourceRefs(source.cardDetail, [
    'Future<void> _addToVault() async',
    'VaultCardService.addOrIncrementVaultItem',
    'cardPrintingId: _selectedPrintingOption?.id',
    "eventType: 'add_to_vault'",
    'VaultGvviScreen(gvviId: gvviId)',
    "throw Exception('Exact copy could not be created.')",
    "Sign in to add cards to your vault.",
  ]);
  const vaultServiceRefs = sourceRefs(source.vaultService, [
    "'vault-add-card-instance-v1'",
    "'card_print_id': cardId",
    "'card_printing_id': _trimmedOrNull(cardPrintingId)",
    "result['gv_vi_id']",
  ]);

  const scannerEntryRefs = sourceRefs(source.shell, [
    'Future<void> _startScanFlow() async',
    'kScannerConstructionPlaceholderEnabled',
    'ScannerBuildPlaceholderScreen',
    'FixedSlotCaptureScreen',
    'NativeScannerPhase0Screen',
    'IdentityScanScreen(initialFrontFile: file)',
  ]);
  const scannerFlagRefs = sourceRefs(source.main, [
    'const bool kScannerConstructionPlaceholderEnabled = bool.fromEnvironment',
    "defaultValue: true",
  ]);

  const identityScanRefs = sourceRefs(source.identityScan, [
    'IdentityScanService',
    'VaultCardService.addOrIncrementVaultItem',
    "conditionLabel: 'NM'",
    "Selected card is missing card_print_id.",
    "Add to Vault failed:",
  ]);
  const identityServiceRefs = sourceRefs(source.identityService, [
    "'identity-scans'",
    "'identity_scan_enqueue_v1'",
    "'identity_scan_get_v1?event_id=$eventId'",
    "'identity_scan_event_results'",
  ]);

  const legacyRefs = sourceRefs(source.legacyScanIdentify, [
    "'card-identify'",
    "body: {'note': 'placeholder v1'}",
    'VaultCardService.addOrIncrementVaultItem',
  ]);
  const legacyIsRouted =
    wholeLibRefs.replace(source.legacyScanIdentify, '').includes('ScanIdentifyScreen');

  const flows = [
    {
      id: 'mobile_card_detail_add_to_vault',
      status: passAll(cardDetailRefs) && passAll(vaultServiceRefs)
        ? 'prod_wired'
        : 'needs_review',
      public_surface: true,
      evidence: [...cardDetailRefs, ...vaultServiceRefs],
      finding:
        'Card detail Add to Vault is no longer a placeholder. It calls the governed vault edge function, includes selected child printing context, requires a returned GVVI id, records engagement, and navigates to the exact owned copy.',
      next_action:
        'Keep this covered by static contract tests and remove stale checkpoint language that still calls it a placeholder.',
    },
    {
      id: 'mobile_scan_entry',
      status: passAll(scannerEntryRefs) && passAll(scannerFlagRefs)
        ? 'intentionally_parked_visible_placeholder'
        : 'needs_review',
      public_surface: true,
      evidence: [...scannerEntryRefs, ...scannerFlagRefs],
      finding:
        'The visible Scan entry defaults to a construction-safe placeholder. That is identity-safe, but it is still a half-finished user-facing process.',
      next_action:
        'Choose a production stance: hide Scan until ready, relabel it as a beta tool, or route it to the real identity scan pipeline with a clear failure path.',
    },
    {
      id: 'mobile_identity_scan_pipeline',
      status: passAll(identityScanRefs) && passAll(identityServiceRefs)
        ? 'partially_prod_wired'
        : 'needs_review',
      public_surface: false,
      evidence: [...identityScanRefs, ...identityServiceRefs],
      finding:
        'The newer identity scan path has real storage, enqueue, polling, result reading, and Add to Vault wiring, but it does not yet navigate to the exact owned copy after add.',
      next_action:
        'Align post-add behavior with card detail/search by requiring the returned GVVI id and opening VaultGvviScreen.',
    },
    {
      id: 'legacy_scan_identify_screen',
      status: passAll(legacyRefs) && !legacyIsRouted
        ? 'stale_unrouted_placeholder_code'
        : 'prod_risk_placeholder_payload',
      public_surface: legacyIsRouted,
      evidence: [
        ...legacyRefs,
        { needle: 'routed outside own file', present: legacyIsRouted },
      ],
      finding:
        'Legacy ScanIdentifyScreen still calls card-identify with a placeholder request body. Current static references do not route to it, but leaving it compiled creates confusion during hardening.',
      next_action:
        'Delete it if unused, or convert it to the same IdentityScanService pipeline before exposing it.',
    },
  ];

  const blockers = flows.filter((flow) =>
    ['intentionally_parked_visible_placeholder', 'prod_risk_placeholder_payload'].includes(flow.status),
  );
  const warnings = flows.filter((flow) =>
    ['partially_prod_wired', 'stale_unrouted_placeholder_code'].includes(flow.status),
  );

  const summary = {
    status: blockers.length === 0 ? 'PASS_WITH_WARNINGS' : 'NEEDS_PRODUCT_DECISION',
    blockers: blockers.length,
    warnings: warnings.length,
    recommended_next_step: blockers.some((flow) => flow.id === 'mobile_scan_entry')
      ? 'SCANNER_SCAN_ENTRY_PROD_READY_V1'
      : 'IDENTITY_SCAN_POST_ADD_GVVI_NAVIGATION_V1',
  };

  const report = {
    package_id: packageId,
    generated_at: new Date().toISOString(),
    summary,
    flows,
    source_fingerprint_sha256: sha256(
      Object.entries(files)
        .map(([key, relativePath]) => `${key}:${relativePath}:${sha256(source[key])}`)
        .join('\n'),
    ),
  };

  return report;
}

function renderMarkdown(report) {
  const lines = [
    `# ${report.package_id}`,
    '',
    `Generated: ${report.generated_at}`,
    '',
    `Status: ${report.summary.status}`,
    '',
    `Recommended next step: ${report.summary.recommended_next_step}`,
    '',
    '## Flow Findings',
    '',
  ];

  for (const flow of report.flows) {
    lines.push(`### ${flow.id}`);
    lines.push('');
    lines.push(`Status: ${flow.status}`);
    lines.push('');
    lines.push(flow.finding);
    lines.push('');
    lines.push(`Next action: ${flow.next_action}`);
    lines.push('');
  }

  lines.push('## Source Fingerprint');
  lines.push('');
  lines.push(report.source_fingerprint_sha256);
  lines.push('');

  return lines.join('\n');
}

const report = buildReport();
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(outMd, renderMarkdown(report));
console.log(JSON.stringify({
  package_id: report.package_id,
  status: report.summary.status,
  recommended_next_step: report.summary.recommended_next_step,
  out_json: path.relative(repoRoot, outJson),
  out_md: path.relative(repoRoot, outMd),
}, null, 2));
