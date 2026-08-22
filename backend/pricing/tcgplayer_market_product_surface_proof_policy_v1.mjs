import {
  TCGPLAYER_MARKET_PRODUCT_SURFACE_REGISTRY_V1,
  TCGPLAYER_MARKET_REQUIRED_PRODUCT_SURFACES_V1,
} from "./tcgplayer_market_product_surface_registry_v1.mjs";

export const TCGPLAYER_MARKET_PRODUCT_SURFACE_PROOF_POLICY_V1 =
  "TCGPLAYER_MARKET_PRODUCT_SURFACE_PROOF_POLICY_V1";

export {
  TCGPLAYER_MARKET_PRODUCT_SURFACE_REGISTRY_V1,
  TCGPLAYER_MARKET_REQUIRED_PRODUCT_SURFACES_V1,
};

export const TCGPLAYER_MARKET_FLUTTER_SURFACE_ROUTE_IDENTITIES_V1 =
  Object.freeze({
    flutter_card_detail: "card_detail",
    flutter_search_or_grid: "search_or_grid",
    flutter_set_grid: "set_grid",
    flutter_compare: "compare",
    flutter_private_vault: "private_vault",
    flutter_public_collector: "public_collector",
    flutter_network: "network",
    flutter_vault_item: "vault_item",
  });

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const COMMIT_SHA_PATTERN = /^[a-f0-9]{40}$/;

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function money(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function timestamp(value) {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  }
  const normalized = clean(value);
  if (!normalized) {
    return null;
  }
  // The PostgreSQL driver materializes timestamps at millisecond precision,
  // while PostgREST and Flutter can preserve six fractional digits. Compare
  // the same instant at the strongest precision available on both paths.
  const millisecondPrecision = normalized.replace(
    /\.(\d{3})\d*(?=(?:Z|[+-]\d{2}:\d{2})$)/,
    ".$1",
  );
  const parsed = new Date(millisecondPrecision);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function rowKey(scope, cardPrintId, cardPrintingId) {
  return scope === "card_printing"
    ? `card_printing:${clean(cardPrintingId)}`
    : `parent:${clean(cardPrintId)}`;
}

function sameMoney(left, right) {
  const normalizedLeft = money(left);
  const normalizedRight = money(right);
  return (
    normalizedLeft !== null &&
    normalizedRight !== null &&
    Math.abs(normalizedLeft - normalizedRight) <= 0.000001
  );
}

function parseVisibleMoney(value) {
  const normalized = clean(value).replace(/\s+/g, " ");
  const match = normalized.match(
    /(?:US\$|\$|USD\s*)(-?\d[\d,]*(?:\.\d+)?)/i,
  );
  if (!match) {
    return {
      amount: null,
      is_from_price: /\bfrom\b/i.test(normalized),
    };
  }
  return {
    amount: money(match[1].replaceAll(",", "")),
    is_from_price: /\bfrom\b/i.test(normalized),
  };
}

function validateVisiblePrice({
  findings,
  capture,
  captureId,
  expectedAmount,
  expectedFromPrice = false,
  findingPrefix,
}) {
  const visible = parseVisibleMoney(capture.visible_text);
  if (visible.amount === null) {
    addFinding(
      findings,
      `${findingPrefix}_visible_amount_missing`,
      captureId,
    );
    return;
  }
  if (!sameMoney(visible.amount, expectedAmount)) {
    addFinding(
      findings,
      `${findingPrefix}_visible_amount_mismatch`,
      captureId,
    );
  }
  if (visible.is_from_price !== expectedFromPrice) {
    addFinding(
      findings,
      `${findingPrefix}_visible_from_state_mismatch`,
      captureId,
    );
  }
}

function addFinding(findings, finding, captureId = "") {
  findings.push(captureId ? `${finding}:${captureId}` : finding);
}

function webRoute(route) {
  try {
    return new URL(route, "https://pricing-surface-proof.invalid");
  } catch {
    return null;
  }
}

export function isTcgplayerMarketProductSurfaceRouteV1(surfaceId, route) {
  const normalizedSurfaceId = clean(surfaceId);
  const normalizedRoute = clean(route);
  if (!normalizedRoute) {
    return false;
  }

  const flutterIdentity =
    TCGPLAYER_MARKET_FLUTTER_SURFACE_ROUTE_IDENTITIES_V1[
      normalizedSurfaceId
    ];
  if (flutterIdentity) {
    return normalizedRoute === flutterIdentity;
  }

  const parsed = webRoute(normalizedRoute);
  if (!parsed) {
    return false;
  }
  const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
  switch (normalizedSurfaceId) {
    case "web_card_detail":
      return /^\/card\/[^/]+$/.test(pathname);
    case "web_search":
      return (
        pathname === "/explore" &&
        Boolean(clean(parsed.searchParams.get("q")))
      );
    case "web_explore":
      return pathname === "/explore" && !clean(parsed.searchParams.get("q"));
    case "web_set_grid":
      return /^\/sets\/[^/]+$/.test(pathname);
    case "web_compare":
      return pathname === "/compare";
    case "web_private_vault":
      return pathname === "/vault";
    case "web_public_vault":
      return /^\/u\/[^/]+$/.test(pathname);
    case "web_vault_item":
      return /^\/vault\/(?:card|gvvi)\/[^/]+$/.test(pathname);
    case "web_market_history":
      return /^\/card\/[^/]+\/market$/.test(pathname);
    default:
      return false;
  }
}

export function evaluateTcgplayerMarketProductSurfaceProofV1(
  evidence = {},
) {
  const findings = [];
  const expectedCommitSha = clean(evidence.expected_commit_sha).toLowerCase();
  const deployedCommitSha = clean(evidence.deployed_commit_sha).toLowerCase();
  const captureCommitSha = clean(
    evidence.capture_manifest?.deployed_commit_sha,
  ).toLowerCase();
  const captures = Array.isArray(evidence.capture_manifest?.captures)
    ? evidence.capture_manifest.captures
    : [];
  const readModelRows = Array.isArray(evidence.read_model_rows)
    ? evidence.read_model_rows
    : [];
  const vaultReadback = evidence.vault_readback ?? {};

  if (!COMMIT_SHA_PATTERN.test(expectedCommitSha)) {
    findings.push("expected_commit_sha_invalid");
  }
  if (!COMMIT_SHA_PATTERN.test(deployedCommitSha)) {
    findings.push("deployed_commit_sha_invalid");
  }
  if (expectedCommitSha !== deployedCommitSha) {
    findings.push("deployed_commit_sha_mismatch");
  }
  if (captureCommitSha !== deployedCommitSha) {
    findings.push("capture_commit_sha_mismatch");
  }
  if (evidence.capture_manifest?.environment !== "production") {
    findings.push("capture_environment_not_production");
  }
  if (evidence.capture_manifest?.auth_lane !== "authenticated") {
    findings.push("capture_auth_lane_not_authenticated");
  }

  const requiredById = new Map(
    TCGPLAYER_MARKET_REQUIRED_PRODUCT_SURFACES_V1.map((surface) => [
      surface.surface_id,
      surface,
    ]),
  );
  const readRowsByKey = new Map();
  for (const row of readModelRows) {
    const key = rowKey(
      clean(row.pricing_scope),
      row.card_print_id,
      row.card_printing_id,
    );
    const rows = readRowsByKey.get(key) ?? [];
    rows.push(row);
    readRowsByKey.set(key, rows);
  }

  const seenCaptureIds = new Set();
  const capturesBySurface = new Map();
  const surfaceResults = [];

  for (const capture of captures) {
    const captureId = clean(capture.capture_id);
    const surfaceId = clean(capture.surface_id);
    const required = requiredById.get(surfaceId);
    const captureFindings = [];

    if (!captureId) {
      addFinding(captureFindings, "capture_id_missing");
    } else if (seenCaptureIds.has(captureId)) {
      addFinding(captureFindings, "capture_id_duplicate", captureId);
    } else {
      seenCaptureIds.add(captureId);
    }

    if (!required) {
      addFinding(
        captureFindings,
        "surface_id_not_supported",
        captureId,
      );
    } else if (capture.client !== required.client) {
      addFinding(
        captureFindings,
        "surface_client_mismatch",
        captureId,
      );
    }

    const surfaceCaptures = capturesBySurface.get(surfaceId) ?? [];
    surfaceCaptures.push(capture);
    capturesBySurface.set(surfaceId, surfaceCaptures);

    if (capture.authenticated !== true) {
      addFinding(
        captureFindings,
        "surface_not_authenticated",
        captureId,
      );
    }
    if (!clean(capture.route)) {
      addFinding(captureFindings, "surface_route_missing", captureId);
    } else if (
      required &&
      !isTcgplayerMarketProductSurfaceRouteV1(surfaceId, capture.route)
    ) {
      addFinding(
        captureFindings,
        "surface_route_identity_mismatch",
        captureId,
      );
    }
    if (!timestamp(capture.captured_at)) {
      addFinding(
        captureFindings,
        "surface_capture_timestamp_invalid",
        captureId,
      );
    }
    if (!SHA256_PATTERN.test(clean(capture.screenshot_sha256))) {
      addFinding(
        captureFindings,
        "surface_screenshot_hash_invalid",
        captureId,
      );
    }
    if (!SHA256_PATTERN.test(clean(capture.render_evidence_sha256))) {
      addFinding(
        captureFindings,
        "surface_render_evidence_hash_invalid",
        captureId,
      );
    }
    if (capture.render_evidence_integrity !== true) {
      addFinding(
        captureFindings,
        "surface_render_evidence_integrity_failed",
        captureId,
      );
    }

    const rendered = capture.rendered ?? {};
    if (
      required &&
      clean(capture.proof_kind) !== required.proof_kind
    ) {
      addFinding(
        captureFindings,
        "surface_proof_kind_mismatch",
        captureId,
      );
    }
    if (required?.proof_kind === "vault_total") {
      if (rendered.status !== "available") {
        addFinding(
          captureFindings,
          "vault_total_not_rendered_available",
          captureId,
        );
      }
      if (rendered.currency !== "USD") {
        addFinding(
          captureFindings,
          "vault_total_currency_not_usd",
          captureId,
        );
      }
      if (rendered.source_label !== "TCGPlayer Market") {
        addFinding(
          captureFindings,
          "vault_total_source_label_unexpected",
          captureId,
        );
      }
      if (vaultReadback.status !== "passed") {
        addFinding(
          captureFindings,
          "vault_total_readback_not_passed",
          captureId,
        );
      }
      if (
        !sameMoney(
          rendered.vault_market_value_usd,
          vaultReadback.exact_pricing?.reconciled_total_usd,
        )
      ) {
        addFinding(
          captureFindings,
          "vault_total_value_mismatch",
          captureId,
        );
      }
      if (
        Number(rendered.priced_copy_count) !==
        Number(vaultReadback.exact_pricing?.priced_copy_count)
      ) {
        addFinding(
          captureFindings,
          "vault_total_priced_copy_count_mismatch",
          captureId,
        );
      }
      if (
        Number(rendered.unpriced_copy_count) !==
        Number(vaultReadback.exact_pricing?.unpriced_copy_count)
      ) {
        addFinding(
          captureFindings,
          "vault_total_unpriced_copy_count_mismatch",
          captureId,
        );
      }
      validateVisiblePrice({
        findings: captureFindings,
        capture,
        captureId,
        expectedAmount: rendered.vault_market_value_usd,
        findingPrefix: "vault_total",
      });

      findings.push(...captureFindings);
      surfaceResults.push({
        capture_id: captureId || null,
        surface_id: surfaceId || null,
        client: clean(capture.client) || null,
        status: captureFindings.length === 0 ? "passed" : "failed",
        findings: [...new Set(captureFindings)].sort(),
        read_model_key: "vault_total",
      });
      continue;
    }
    if (required?.proof_kind === "vault_group_total") {
      const sampleGroup = vaultReadback.exact_pricing?.sample_group ?? {};
      if (rendered.status !== "available") {
        addFinding(
          captureFindings,
          "vault_group_total_not_rendered_available",
          captureId,
        );
      }
      if (rendered.currency !== "USD") {
        addFinding(
          captureFindings,
          "vault_group_total_currency_not_usd",
          captureId,
        );
      }
      if (rendered.source_label !== "TCGPlayer Market") {
        addFinding(
          captureFindings,
          "vault_group_total_source_label_unexpected",
          captureId,
        );
      }
      if (vaultReadback.status !== "passed") {
        addFinding(
          captureFindings,
          "vault_group_total_readback_not_passed",
          captureId,
        );
      }
      if (
        clean(capture.card_print_id) !==
        clean(sampleGroup.card_print_id)
      ) {
        addFinding(
          captureFindings,
          "vault_group_total_card_print_id_mismatch",
          captureId,
        );
      }
      if (
        !sameMoney(
          rendered.vault_market_value_usd,
          sampleGroup.reconciled_total_usd,
        )
      ) {
        addFinding(
          captureFindings,
          "vault_group_total_value_mismatch",
          captureId,
        );
      }
      if (
        Number(rendered.priced_copy_count) !==
        Number(sampleGroup.priced_copy_count)
      ) {
        addFinding(
          captureFindings,
          "vault_group_total_priced_copy_count_mismatch",
          captureId,
        );
      }
      if (
        Number(rendered.unpriced_copy_count) !==
        Number(sampleGroup.unpriced_copy_count)
      ) {
        addFinding(
          captureFindings,
          "vault_group_total_unpriced_copy_count_mismatch",
          captureId,
        );
      }
      if (
        timestamp(rendered.observed_at) !==
        timestamp(sampleGroup.latest_observed_at)
      ) {
        addFinding(
          captureFindings,
          "vault_group_total_observed_at_mismatch",
          captureId,
        );
      }
      if (
        timestamp(rendered.published_at) !==
        timestamp(sampleGroup.latest_published_at)
      ) {
        addFinding(
          captureFindings,
          "vault_group_total_published_at_mismatch",
          captureId,
        );
      }
      validateVisiblePrice({
        findings: captureFindings,
        capture,
        captureId,
        expectedAmount: rendered.vault_market_value_usd,
        findingPrefix: "vault_group_total",
      });

      findings.push(...captureFindings);
      surfaceResults.push({
        capture_id: captureId || null,
        surface_id: surfaceId || null,
        client: clean(capture.client) || null,
        status: captureFindings.length === 0 ? "passed" : "failed",
        findings: [...new Set(captureFindings)].sort(),
        read_model_key: "vault_group_total",
      });
      continue;
    }

    const scope = clean(rendered.pricing_scope);
    const cardPrintId = clean(capture.card_print_id);
    const cardPrintingId = clean(capture.card_printing_id);
    if (!cardPrintId) {
      addFinding(
        captureFindings,
        "surface_card_print_id_missing",
        captureId,
      );
    }
    if (scope !== "parent" && scope !== "card_printing") {
      addFinding(
        captureFindings,
        "surface_pricing_scope_invalid",
        captureId,
      );
    }
    if (scope === "card_printing" && !cardPrintingId) {
      addFinding(
        captureFindings,
        "surface_card_printing_id_missing",
        captureId,
      );
    }
    if (rendered.status !== "available") {
      addFinding(
        captureFindings,
        "surface_price_not_rendered_available",
        captureId,
      );
    }

    const key = rowKey(scope, cardPrintId, cardPrintingId);
    const matchingRows = readRowsByKey.get(key) ?? [];
    const expectedRow =
      matchingRows.length === 1 ? matchingRows[0] : null;
    if (matchingRows.length !== 1) {
      addFinding(
        captureFindings,
        matchingRows.length === 0
          ? "surface_read_model_row_missing"
          : "surface_read_model_row_ambiguous",
        captureId,
      );
    }

    if (expectedRow) {
      if (expectedRow.status !== "available") {
        addFinding(
          captureFindings,
          "surface_read_model_status_not_available",
          captureId,
        );
      }
      if (expectedRow.currency !== "USD") {
        addFinding(
          captureFindings,
          "surface_read_model_currency_not_usd",
          captureId,
        );
      }
      if (expectedRow.source_name !== "tcgplayer") {
        addFinding(
          captureFindings,
          "surface_read_model_source_not_tcgplayer",
          captureId,
        );
      }
      const expectedSourceLabel =
        expectedRow.is_from_price === true
          ? "From TCGPlayer Market"
          : "TCGPlayer Market";
      if (expectedRow.source_label !== expectedSourceLabel) {
        addFinding(
          captureFindings,
          "surface_read_model_label_unexpected",
          captureId,
        );
      }
      if (expectedRow.freshness !== "fresh") {
        addFinding(
          captureFindings,
          "surface_read_model_not_fresh",
          captureId,
        );
      }
      if (
        !sameMoney(rendered.market_close_usd, expectedRow.market_close)
      ) {
        addFinding(
          captureFindings,
          "surface_market_close_mismatch",
          captureId,
        );
      }
      if (rendered.currency !== expectedRow.currency) {
        addFinding(
          captureFindings,
          "surface_currency_mismatch",
          captureId,
        );
      }
      if (rendered.source_label !== expectedRow.source_label) {
        addFinding(
          captureFindings,
          "surface_source_label_mismatch",
          captureId,
        );
      }
      if (
        timestamp(rendered.observed_at) !==
        timestamp(expectedRow.observed_at)
      ) {
        addFinding(
          captureFindings,
          "surface_observed_at_mismatch",
          captureId,
        );
      }
      if (
        timestamp(rendered.published_at) !==
        timestamp(expectedRow.published_at)
      ) {
        addFinding(
          captureFindings,
          "surface_published_at_mismatch",
          captureId,
        );
      }
      if (
        clean(rendered.provenance_id) !==
        clean(expectedRow.provenance_id)
      ) {
        addFinding(
          captureFindings,
          "surface_provenance_id_mismatch",
          captureId,
        );
      }
      if (
        rendered.is_from_price !==
        (expectedRow.is_from_price === true)
      ) {
        addFinding(
          captureFindings,
          "surface_from_price_state_mismatch",
          captureId,
        );
      }
      validateVisiblePrice({
        findings: captureFindings,
        capture,
        captureId,
        expectedAmount: rendered.market_close_usd,
        expectedFromPrice: expectedRow.is_from_price === true,
        findingPrefix: "surface_price",
      });
    }

    findings.push(...captureFindings);
    surfaceResults.push({
      capture_id: captureId || null,
      surface_id: surfaceId || null,
      client: clean(capture.client) || null,
      status: captureFindings.length === 0 ? "passed" : "failed",
      findings: [...new Set(captureFindings)].sort(),
      read_model_key: key,
    });
  }

  for (const required of TCGPLAYER_MARKET_REQUIRED_PRODUCT_SURFACES_V1) {
    const count = (capturesBySurface.get(required.surface_id) ?? []).length;
    if (count === 0) {
      findings.push(`required_surface_missing:${required.surface_id}`);
    } else if (count > 1) {
      findings.push(`required_surface_duplicated:${required.surface_id}`);
    }
  }

  const uniqueFindings = [...new Set(findings)].sort();
  return {
    policy_version: TCGPLAYER_MARKET_PRODUCT_SURFACE_PROOF_POLICY_V1,
    status: uniqueFindings.length === 0 ? "passed" : "failed",
    findings: uniqueFindings,
    expected_commit_sha: expectedCommitSha || null,
    deployed_commit_sha: deployedCommitSha || null,
    required_surface_count:
      TCGPLAYER_MARKET_REQUIRED_PRODUCT_SURFACES_V1.length,
    captured_surface_count: captures.length,
    passed_surface_count: surfaceResults.filter(
      (result) => result.status === "passed",
    ).length,
    failed_surface_count: surfaceResults.filter(
      (result) => result.status === "failed",
    ).length,
    surfaces: surfaceResults,
  };
}
