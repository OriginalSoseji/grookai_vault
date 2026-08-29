export const CROSS_TCG_SET_PUBLICATION_GATE_VERSION =
  "CROSS_TCG_SET_PUBLICATION_GATE_V1";

export const CROSS_TCG_SET_PUBLICATION_GAME_POLICIES = Object.freeze({
  pokemon: Object.freeze({
    game: "pokemon",
    group_label: "Era",
    product_lanes: Object.freeze(["main", "special", "promo", "deck", "world"]),
  }),
  one_piece: Object.freeze({
    game: "one_piece",
    group_label: "Release family",
    product_lanes: Object.freeze(["main", "special", "promo", "deck"]),
  }),
  mtg: Object.freeze({
    game: "mtg",
    group_label: "Release period",
    product_lanes: Object.freeze(["main", "special", "promo", "deck", "token"]),
  }),
});

const RELEASED_STATUSES = new Set(["signed_in", "public"]);
const PUBLIC_COVER_BUCKET = "external-card-images";

function text(value) {
  return String(value ?? "").trim();
}

function normalizedText(value) {
  return text(value).toLowerCase();
}

export function normalizeSetPublicationCodeV1(value) {
  return normalizedText(value).replace(/[^a-z0-9]/g, "");
}

export function isReleasedCatalogStatusV1(value) {
  return RELEASED_STATUSES.has(normalizedText(value));
}

export function classifySetProductLaneV1(row) {
  const game = normalizedText(row?.game);
  const code = normalizeSetPublicationCodeV1(row?.code);
  const name = normalizedText(row?.name);
  const catalogSetType = normalizedText(row?.catalog_set_type ?? row?.set_role);
  const haystack = `${code} ${name}`;

  if (game === "one_piece") {
    if (code.startsWith("st")) return "deck";
    if (code.startsWith("eb") || code.startsWith("prb")) return "special";
    if (code === "p" || code === "don" || name.includes("promo")) return "promo";
    return "main";
  }

  if (game === "mtg") {
    if (["token", "memorabilia", "minigame"].includes(catalogSetType)) return "token";
    if (catalogSetType === "promo") return "promo";
    if (["commander", "duel_deck", "premium_deck", "planechase", "archenemy"].includes(catalogSetType)) {
      return "deck";
    }
    if ([
      "alchemy",
      "arsenal",
      "box",
      "draft_innovation",
      "from_the_vault",
      "funny",
      "masterpiece",
      "masters",
      "spellbook",
      "treasure_chest",
    ].includes(catalogSetType)) return "special";
    if (["core", "expansion", "starter"].includes(catalogSetType)) return "main";
    if (/token|memorabilia|art series|minigame/.test(haystack)) return "token";
    if (/promo|promotional|judge gift|play network|wizards play network/.test(haystack)) return "promo";
    if (/commander|deck|duel deck|planechase|archenemy/.test(haystack)) return "deck";
    if (/masters|remastered|antholog|conspiracy|horizon|supplement|box topper|masterpiece|secret lair/.test(haystack)) {
      return "special";
    }
    return "main";
  }

  if (game === "pokemon") {
    if (code.startsWith("wcd") || haystack.includes("world championship")) return "world";
    if (/promo|promotional|black star|pokemon center/.test(haystack)) return "promo";
    if (/deck|trainer kit|battle academy|league battle|starter set/.test(haystack)) return "deck";
    if (code.includes("pt5") || /trainer gallery|radiant collection|shiny|fates|crown zenith|prismatic/.test(name)) {
      return "special";
    }
    return "main";
  }

  return null;
}

function normalizedOrigins(values) {
  const output = new Set();
  for (const value of values ?? []) {
    try {
      output.add(new URL(value).origin.toLowerCase());
    } catch {
      // Invalid configured origins cannot authorize media.
    }
  }
  return output;
}

export function inspectSetCoverMediaV1(row, { allowedStorageOrigins = [] } = {}) {
  const rawUrl = text(row?.hero_image_url);
  const game = normalizedText(row?.game);
  const code = normalizeSetPublicationCodeV1(row?.code);
  if (!rawUrl) {
    return {
      valid: false,
      cover_kind: "missing",
      issue_code: "missing_set_cover",
      object_path: null,
    };
  }

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return {
      valid: false,
      cover_kind: "invalid_url",
      issue_code: "invalid_set_cover_url",
      object_path: null,
    };
  }

  const origins = normalizedOrigins(allowedStorageOrigins);
  if (url.protocol !== "https:" || origins.size === 0 || !origins.has(url.origin.toLowerCase())) {
    return {
      valid: false,
      cover_kind: "external_or_untrusted",
      issue_code: "set_cover_not_self_hosted",
      object_path: null,
    };
  }

  const prefix = `/storage/v1/object/public/${PUBLIC_COVER_BUCKET}/set-covers/`;
  if (!url.pathname.startsWith(prefix)) {
    return {
      valid: false,
      cover_kind: "private_or_ungoverned",
      issue_code: "set_cover_not_public_governed_media",
      object_path: null,
    };
  }

  const objectPath = decodeURIComponent(url.pathname.slice(
    `/storage/v1/object/public/${PUBLIC_COVER_BUCKET}/`.length,
  ));
  const expectedPrefix = `set-covers/${game}/${code}/`;
  if (!game || !code || !objectPath.startsWith(expectedPrefix)) {
    return {
      valid: false,
      cover_kind: "identity_mismatch",
      issue_code: "set_cover_game_or_code_mismatch",
      object_path: objectPath,
    };
  }

  const suffix = objectPath.slice(expectedPrefix.length);
  const coverKind = suffix.startsWith("tcgplayer/")
    ? "exact_package"
    : suffix.startsWith("representative/")
      ? "representative_card"
      : "exact_set_art";
  return {
    valid: true,
    cover_kind: coverKind,
    issue_code: null,
    object_path: objectPath,
  };
}

function issue(code, severity, details = {}) {
  return { code, severity, ...details };
}

export function evaluateSetPublicationCandidateV1(row, options = {}) {
  const game = normalizedText(row?.game);
  const setId = text(row?.id);
  const setCode = text(row?.code);
  const setName = text(row?.name);
  const cardCount = Number(row?.card_count ?? 0);
  const effectiveReleaseStatus = normalizedText(row?.effective_release_status);
  const issues = [];
  const policy = CROSS_TCG_SET_PUBLICATION_GAME_POLICIES[game];

  if (!setId || !setCode || !setName || !game) {
    issues.push(issue("incomplete_set_identity", "blocker"));
  }
  if (!policy) {
    issues.push(issue("missing_game_browse_configuration", "blocker", { game }));
  }
  if (!isReleasedCatalogStatusV1(effectiveReleaseStatus)) {
    issues.push(issue("set_not_in_released_scope", "blocker", {
      effective_release_status: effectiveReleaseStatus || null,
    }));
  }
  if (!Number.isInteger(cardCount) || cardCount < 1) {
    issues.push(issue("released_set_has_no_canonical_cards", "blocker", { card_count: cardCount }));
  }

  const productLane = classifySetProductLaneV1(row);
  if (policy && (!productLane || !policy.product_lanes.includes(productLane))) {
    issues.push(issue("unsupported_product_lane", "blocker", { product_lane: productLane }));
  }

  const media = inspectSetCoverMediaV1(row, options);
  if (!media.valid) {
    issues.push(issue(media.issue_code, "blocker", { hero_image_url: text(row?.hero_image_url) || null }));
  } else if (productLane === "deck" && media.cover_kind !== "exact_package") {
    issues.push(issue("deck_package_art_gap", "warning", {
      accepted_cover_kind: media.cover_kind,
    }));
  }

  const probe = row?.image_probe ?? null;
  if (options.requireImageProbe === true) {
    if (!probe || probe.status !== "ok") {
      issues.push(issue("set_cover_probe_failed", "blocker", {
        probe_status: probe?.status ?? "not_run",
        http_status: probe?.http_status ?? null,
        content_type: probe?.content_type ?? null,
        error: probe?.error ?? null,
      }));
    } else if (!normalizedText(probe.content_type).startsWith("image/")) {
      issues.push(issue("set_cover_probe_not_image", "blocker", {
        http_status: probe.http_status ?? null,
        content_type: probe.content_type ?? null,
      }));
    }
  }

  const blockerCount = issues.filter((entry) => entry.severity === "blocker").length;
  const warningCount = issues.filter((entry) => entry.severity === "warning").length;
  return {
    set_id: setId || null,
    game,
    set_code: setCode || null,
    set_name: setName || null,
    effective_release_status: effectiveReleaseStatus || null,
    product_lane: productLane,
    card_count: cardCount,
    cover_kind: media.cover_kind,
    cover_object_path: media.object_path,
    image_probe: probe,
    decision: blockerCount > 0
      ? "blocked"
      : warningCount > 0
        ? "eligible_with_coverage_gap"
        : "eligible",
    issues,
  };
}

export function buildSetPublicationGateV1(rows, options = {}) {
  if (!Array.isArray(rows)) throw new Error("rows must be an array");
  const evaluated = rows.map((row) => evaluateSetPublicationCandidateV1(row, options));
  const idCounts = new Map();
  const identityCounts = new Map();
  for (const row of evaluated) {
    if (row.set_id) idCounts.set(row.set_id, (idCounts.get(row.set_id) ?? 0) + 1);
    const identity = `${row.game}:${normalizeSetPublicationCodeV1(row.set_code)}`;
    identityCounts.set(identity, (identityCounts.get(identity) ?? 0) + 1);
  }
  for (const row of evaluated) {
    const identity = `${row.game}:${normalizeSetPublicationCodeV1(row.set_code)}`;
    if ((row.set_id && idCounts.get(row.set_id) > 1) || identityCounts.get(identity) > 1) {
      row.issues.push(issue("duplicate_released_set_identity", "blocker", { identity }));
      row.decision = "blocked";
    }
  }

  evaluated.sort((left, right) =>
    left.game.localeCompare(right.game) ||
    String(left.set_code).localeCompare(String(right.set_code)) ||
    String(left.set_id).localeCompare(String(right.set_id)));
  const counts = {
    selected_set_count: evaluated.length,
    eligible_set_count: evaluated.filter((row) => row.decision === "eligible").length,
    eligible_with_coverage_gap_count: evaluated.filter((row) => row.decision === "eligible_with_coverage_gap").length,
    blocked_set_count: evaluated.filter((row) => row.decision === "blocked").length,
    exact_package_count: evaluated.filter((row) => row.cover_kind === "exact_package").length,
    exact_set_art_count: evaluated.filter((row) => row.cover_kind === "exact_set_art").length,
    representative_card_count: evaluated.filter((row) => row.cover_kind === "representative_card").length,
    unresolved_media_count: evaluated.filter((row) => !["exact_package", "exact_set_art", "representative_card"].includes(row.cover_kind)).length,
  };
  return {
    version: CROSS_TCG_SET_PUBLICATION_GATE_VERSION,
    status: counts.blocked_set_count === 0 ? "passed" : "blocked",
    counts,
    by_game: Object.fromEntries(
      Object.keys(CROSS_TCG_SET_PUBLICATION_GAME_POLICIES).map((game) => {
        const gameRows = evaluated.filter((row) => row.game === game);
        return [game, {
          selected: gameRows.length,
          blocked: gameRows.filter((row) => row.decision === "blocked").length,
          coverage_gaps: gameRows.filter((row) => row.decision === "eligible_with_coverage_gap").length,
          exact_package: gameRows.filter((row) => row.cover_kind === "exact_package").length,
          exact_set_art: gameRows.filter((row) => row.cover_kind === "exact_set_art").length,
          representative_card: gameRows.filter((row) => row.cover_kind === "representative_card").length,
        }];
      }).filter(([, value]) => value.selected > 0),
    ),
    rows: evaluated,
    boundaries: {
      database_writes: false,
      storage_writes: false,
      image_pointer_writes: false,
      publication_writes: false,
    },
  };
}
