import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(
  ROOT,
  "docs",
  "audits",
  "release_convergence_v1",
  "baseline",
);
const WEB_APP_DIR = path.join(ROOT, "apps", "web", "src", "app");
const WEB_COMPONENTS_DIR = path.join(ROOT, "apps", "web", "src", "components");
const WEB_LIB_DIR = path.join(ROOT, "apps", "web", "src", "lib");
const FLUTTER_LIB_DIR = path.join(ROOT, "lib");
const ROUTE_MATRIX_PATH = path.join(
  ROOT,
  "docs",
  "audits",
  "mobile_web_native_parity_v1",
  "route_state_matrix.json",
);
const RELEASE_SCREENSHOT_DIR = path.join(
  ROOT,
  "docs",
  "audits",
  "release_convergence_v1",
  "screenshots",
);
const CANONICAL_SCREENSHOT_DIR = path.join(
  ROOT,
  "apps",
  "web",
  "tests",
  "parity",
  "__screenshots__",
  "canonical-samsung",
);

const INTERNAL_WEB_PREFIXES = [
  "/founder",
  "/review",
  "/visual-fixtures",
];
const INTERNAL_COMPONENT_SEGMENTS = [
  `${path.sep}founder${path.sep}`,
  `${path.sep}review${path.sep}`,
  `${path.sep}warehouse${path.sep}`,
  `${path.sep}visualParity${path.sep}`,
];
const ENGINEERING_COPY_PATTERNS = [
  ["collector_intelligence_layer", /collector intelligence layer/gi],
  ["canonical_mapping", /canonical mappings?/gi],
  ["reconciled_catalog", /reconciled catalog/gi],
  ["canary", /\bcanary\b/gi],
  ["source_ready", /source-ready/gi],
  ["image_worklist", /image worklist/gi],
  ["exact_identity_lane", /exact identity lane/gi],
  ["raw_provider", /raw provider/gi],
  ["tcgplayer_id", /TCGPlayer ID/g],
];

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  const pending = [directory];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(absolute);
      else files.push(absolute);
    }
  }
  return files.sort();
}

function relative(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, "/");
}

function routeFromPage(file) {
  const directory = path.dirname(path.relative(WEB_APP_DIR, file));
  if (directory === ".") return "/";
  const segments = directory
    .split(path.sep)
    .filter((segment) => !segment.startsWith("(") || !segment.endsWith(")"));
  return `/${segments.join("/")}`;
}

function isInternalRoute(route) {
  return INTERNAL_WEB_PREFIXES.some(
    (prefix) => route === prefix || route.startsWith(`${prefix}/`),
  );
}

function isCustomerComponent(file) {
  return !INTERNAL_COMPONENT_SEGMENTS.some((segment) => file.includes(segment));
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function collectMatches(files, patterns) {
  const findings = [];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const [finding, expression] of patterns) {
      expression.lastIndex = 0;
      for (const match of source.matchAll(expression)) {
        const index = match.index ?? 0;
        const line = source.split("\n")[lineNumberAt(source, index) - 1]?.trim() ?? "";
        findings.push({
          finding,
          file: relative(file),
          line: lineNumberAt(source, index),
          matched_text: match[0],
          context: line.slice(0, 220),
        });
      }
    }
  }
  return findings;
}

function findSurface(route, routeMatrix) {
  return routeMatrix.surfaces.find((surface) => surface.routes.includes(route)) ?? null;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function gitValue(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function fileEvidence(directory) {
  return walkFiles(directory)
    .filter((file) => file.endsWith(".png"))
    .map((file) => {
      const contents = fs.readFileSync(file);
      return {
        file: relative(file),
        size_bytes: contents.byteLength,
        sha256: sha256(contents),
      };
    });
}

const routeMatrix = JSON.parse(fs.readFileSync(ROUTE_MATRIX_PATH, "utf8"));
const appFiles = walkFiles(WEB_APP_DIR);
const componentFiles = walkFiles(WEB_COMPONENTS_DIR);
const webSourceFiles = [...appFiles, ...componentFiles].filter((file) => /\.(tsx|ts|css)$/.test(file));
const customerWebFiles = webSourceFiles.filter((file) => {
  if (file.startsWith(WEB_APP_DIR)) return !isInternalRoute(routeFromPage(file));
  return isCustomerComponent(file);
});
const pageFiles = appFiles.filter((file) => path.basename(file) === "page.tsx");

const webRoutes = pageFiles.map((file) => {
  const route = routeFromPage(file);
  const directory = path.dirname(file);
  const surface = findSurface(route, routeMatrix);
  return {
    route,
    file: relative(file),
    audience: isInternalRoute(route) ? "internal" : "collector",
    shell_mode: surface?.shell_mode ?? null,
    auth: surface?.auth ?? null,
    required_states: surface?.required_states ?? [],
    route_loading_boundary: fs.existsSync(path.join(directory, "loading.tsx")),
    route_error_boundary: fs.existsSync(path.join(directory, "error.tsx")),
    covered_by_root_error_boundary: true,
    covered_by_root_not_found: true,
  };
});

const implementedRoutes = new Set(webRoutes.map((route) => route.route));
const matrixRoutes = routeMatrix.surfaces.flatMap((surface) =>
  surface.routes.map((route) => ({ route, surface: surface.surface })),
);
const collectorRoutes = webRoutes.filter((route) => route.audience === "collector");
const unmappedCollectorRoutes = collectorRoutes.filter((route) => !route.shell_mode);
const missingMatrixImplementations = matrixRoutes.filter(
  ({ route }) => !implementedRoutes.has(route) && !route.includes("?"),
);

const flutterFiles = walkFiles(FLUTTER_LIB_DIR).filter((file) => file.endsWith(".dart"));
const flutterScreens = [];
for (const file of flutterFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/class\s+([A-Za-z0-9_]*(?:Screen|Page|Shell))\b/g)) {
    flutterScreens.push({ class_name: match[1], file: relative(file) });
  }
}

const featureFlags = [];
for (const file of [...walkFiles(WEB_LIB_DIR), ...flutterFiles]) {
  if (!/\.(ts|tsx|dart)$/.test(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  const environmentNames = [
    ...source.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g),
    ...source.matchAll(/String\.fromEnvironment\(["']([A-Z][A-Z0-9_]+)["']/g),
  ].map((match) => match[1]);
  if (/feature.?flag/i.test(path.basename(file)) || environmentNames.length > 0) {
    featureFlags.push({
      file: relative(file),
      environment_names: [...new Set(environmentNames)].sort(),
    });
  }
}

const engineeringCopyFindings = collectMatches(customerWebFiles, ENGINEERING_COPY_PATTERNS);
const canonicalCardArtFiles = customerWebFiles.filter(
  (file) => !file.endsWith(`${path.sep}VaultInstanceNotesMediaCard.tsx`),
);
const aspectRatioDrift = collectMatches(canonicalCardArtFiles, [
  ["card_art_aspect_3_by_4", /aspect-\[3\/4\]/g],
]);
const radialGradientDrift = collectMatches(customerWebFiles, [
  ["radial_gradient", /radial-gradient\(/g],
]);
const oversizedRadiusDrift = [];
for (const file of customerWebFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/rounded-\[(\d+)px\]/g)) {
    const value = Number(match[1]);
    if (value <= 26) continue;
    oversizedRadiusDrift.push({
      finding: "radius_above_canonical_floating_surface",
      file: relative(file),
      line: lineNumberAt(source, match.index ?? 0),
      value_px: value,
      matched_text: match[0],
    });
  }
}

const inventory = {
  schema_version: "grookai_release_convergence_inventory_v1",
  generated_at: new Date().toISOString(),
  source_commit: process.env.GIT_COMMIT || gitValue(["rev-parse", "HEAD"]),
  source_branch: gitValue(["branch", "--show-current"]),
  working_tree_clean_at_generation: gitValue(["status", "--porcelain"]) === "",
  authority: {
    release_plan: "Grookai 8-Week Product Completion Plan, 2026-08-05",
    visual_contract: "MOBILE_WEB_NATIVE_VISUAL_PARITY_CONTRACT_V1",
    route_matrix: relative(ROUTE_MATRIX_PATH),
    boundary: "functional bridges and visual consistency; no wholesale redesign",
  },
  totals: {
    web_pages: webRoutes.length,
    collector_web_pages: collectorRoutes.length,
    internal_web_pages: webRoutes.length - collectorRoutes.length,
    collector_routes_with_route_loading: collectorRoutes.filter((route) => route.route_loading_boundary).length,
    collector_routes_with_route_error: collectorRoutes.filter((route) => route.route_error_boundary).length,
    flutter_screen_classes: flutterScreens.length,
    web_component_files: componentFiles.filter((file) => file.endsWith(".tsx")).length,
    feature_flag_files: featureFlags.length,
    public_engineering_copy_findings: engineeringCopyFindings.length,
    card_aspect_ratio_drift_findings: aspectRatioDrift.length,
    radial_gradient_findings: radialGradientDrift.length,
    oversized_radius_findings: oversizedRadiusDrift.length,
  },
  release_surfaces: routeMatrix.surfaces,
  web_routes: webRoutes,
  unmapped_collector_routes: unmappedCollectorRoutes,
  matrix_routes_without_exact_page: missingMatrixImplementations,
  flutter_screens: flutterScreens,
  feature_flags: featureFlags,
  public_artifact_suppression_candidates: engineeringCopyFindings,
  visual_drift: {
    card_aspect_ratio: aspectRatioDrift,
    radial_gradients: radialGradientDrift,
    oversized_radii: oversizedRadiusDrift,
  },
  runtime_evidence: {
    release_screenshots: fileEvidence(RELEASE_SCREENSHOT_DIR),
    canonical_samsung_screenshots: fileEvidence(CANONICAL_SCREENSHOT_DIR),
  },
  evidence_limits: [
    "Static route boundaries do not prove runtime loading, empty, error, private, signed-out, dense, or offline behavior.",
    "A route-level error file count does not include the shared root error boundary.",
    "Feature-flag inventory records code references only and does not prove deployed values.",
    "Visual drift findings are diagnostics, not automatic failures; each occurrence requires surface review.",
    "Collector-uploaded note photos are not card-art frames and are excluded from canonical card-aspect diagnostics.",
  ],
};

const json = `${JSON.stringify(inventory, null, 2)}\n`;
inventory.content_sha256 = sha256(json);
const finalJson = `${JSON.stringify(inventory, null, 2)}\n`;

const markdown = `# Grookai Release Convergence Baseline Inventory V1

Generated: ${inventory.generated_at}

## Authority

- Release plan: Grookai 8-Week Product Completion Plan, 2026-08-05
- Visual contract: \`MOBILE_WEB_NATIVE_VISUAL_PARITY_CONTRACT_V1\`
- Boundary: functional bridges and visual consistency; no wholesale redesign
- Content SHA-256 before self-hash: \`${inventory.content_sha256}\`

## Current Inventory

| Measure | Count |
| --- | ---: |
| Web pages | ${inventory.totals.web_pages} |
| Collector-facing web pages | ${inventory.totals.collector_web_pages} |
| Internal web pages | ${inventory.totals.internal_web_pages} |
| Collector routes with local loading boundary | ${inventory.totals.collector_routes_with_route_loading} |
| Collector routes with local error boundary | ${inventory.totals.collector_routes_with_route_error} |
| Flutter screen classes | ${inventory.totals.flutter_screen_classes} |
| Web component files | ${inventory.totals.web_component_files} |
| Feature-flag files | ${inventory.totals.feature_flag_files} |
| Public engineering-copy findings | ${inventory.totals.public_engineering_copy_findings} |
| Remaining \`3/4\` card-art aspect findings | ${inventory.totals.card_aspect_ratio_drift_findings} |
| Radial-gradient diagnostics | ${inventory.totals.radial_gradient_findings} |
| Radius values above the canonical 26px floating surface | ${inventory.totals.oversized_radius_findings} |

## Coverage Interpretation

- Shared root error and not-found boundaries now protect collector routes.
- Local loading and error files remain sparse and must not be treated as proof of complete state behavior.
- The route-state matrix is the required-state contract; runtime screenshots and interaction tests remain necessary evidence.
- Static visual findings identify drift for review. They do not authorize broad restyling.

## Unmapped Collector Routes

${unmappedCollectorRoutes.length === 0 ? "None." : unmappedCollectorRoutes.map((item) => `- \`${item.route}\` - \`${item.file}\``).join("\n")}

## Matrix Routes Without An Exact Page

These may be redirects, query-state routes, route handlers, or missing implementations and require review.

${missingMatrixImplementations.length === 0 ? "None." : missingMatrixImplementations.map((item) => `- ${item.surface}: \`${item.route}\``).join("\n")}

## Public Artifact Suppression Candidates

${engineeringCopyFindings.length === 0 ? "None." : engineeringCopyFindings.map((item) => `- \`${item.finding}\` at \`${item.file}:${item.line}\`: ${item.context}`).join("\n")}

## Evidence Limits

${inventory.evidence_limits.map((item) => `- ${item}`).join("\n")}

The JSON artifact contains the full route, screen, feature-flag, copy, and visual-drift inventories.
`;

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUTPUT_DIR, "current_state_inventory_v1.json"), finalJson);
fs.writeFileSync(path.join(OUTPUT_DIR, "current_state_inventory_v1.md"), markdown);

console.log(JSON.stringify({
  output_dir: relative(OUTPUT_DIR),
  json_sha256: sha256(finalJson),
  markdown_sha256: sha256(markdown),
  totals: inventory.totals,
}, null, 2));
