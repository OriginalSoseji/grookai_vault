export type SmartSearchIntent = {
  originalQuery: string;
  residualQuery: string;
  releaseYearMin?: number;
  releaseYearMax?: number;
  finishKeys: string[];
  artist?: string;
  imageState?: "exact" | "representative" | "missing" | "any";
  ownedState?: "owned" | "missing" | "any";
  stampLabels: string[];
  interpretedLabels: string[];
  unrecognizedTerms: string[];
  unappliedLabels: string[];
};

const FILLER_PHRASES = [
  /\bgive me\b/gi,
  /\bshow me\b/gi,
  /\bfind me\b/gi,
  /\bi want\b/gi,
  /\ball\b/gi,
  /\bevery\b/gi,
  /\bcards?\b/gi,
  /\bprintings?\b/gi,
  /\bversions?\b/gi,
  /\benglish\b/gi,
  /\bphysical\b/gi,
];

const FINISH_PATTERNS: Array<{ pattern: RegExp; key: string; label: string; residual: string }> = [
  { pattern: /\brocket\s+reverse\s+holos?\b/gi, key: "rocket_reverse", label: "Rocket Reverse", residual: "rocket reverse" },
  { pattern: /\breverse\s+holos?\b/gi, key: "reverse", label: "Reverse Holo", residual: "reverse holo" },
  { pattern: /\bcosmos\s+holos?\b/gi, key: "cosmos", label: "Cosmos Holo", residual: "cosmos holo" },
  { pattern: /\bcracked\s+ice(?:\s+holos?)?\b/gi, key: "cracked_ice", label: "Cracked Ice", residual: "cracked ice" },
  { pattern: /\bpok[eé]?\s*ball\s+reverse(?:\s+holos?)?\b/gi, key: "pokeball", label: "Poke Ball Reverse", residual: "poke ball reverse" },
  { pattern: /\bmaster\s*ball\s+reverse(?:\s+holos?)?\b/gi, key: "masterball", label: "Master Ball Reverse", residual: "master ball reverse" },
  { pattern: /\bholos?\b/gi, key: "holo", label: "Holo", residual: "holo" },
  { pattern: /\bnormal\b|\bnon[-\s]?holos?\b|\bstandard\b/gi, key: "normal", label: "Normal", residual: "normal" },
];

const STAMP_PATTERNS: Array<{ pattern: RegExp; label: string; residual: string }> = [
  { pattern: /\bbuild[-\s]?a[-\s]?bear(?:\s+workshop)?(?:\s+stamps?|\s+stamped)?\b/gi, label: "Build-A-Bear Workshop Stamp", residual: "build a bear stamp" },
  { pattern: /\btoys\s*r\s*us(?:\s+stamps?|\s+stamped)?\b/gi, label: "Toys R Us Stamp", residual: "toys r us stamp" },
  { pattern: /\bburger\s+king(?:\s+stamps?|\s+stamped)?\b/gi, label: "Burger King Stamp", residual: "burger king stamp" },
  { pattern: /\bpokemon\s+center(?:\s+exclusive)?(?:\s+stamps?|\s+stamped)?(?:\s+promos?)?\b/gi, label: "Pokemon Center Stamp", residual: "pokemon center stamp" },
  { pattern: /\bpokemon\s+together(?:\s+stamps?|\s+stamped)?\b/gi, label: "Pokemon Together Stamp", residual: "pokemon together stamp" },
  { pattern: /\binverted\s+wb\s+kids(?:\s+promos?)?(?:\s+stamps?|\s+stamped)?\b/gi, label: "Inverted WB Kids Stamp", residual: "inverted wb kids stamp" },
  { pattern: /\bmissing\s+wb\s+kids(?:\s+promos?)?(?:\s+stamps?|\s+stamped)?\b/gi, label: "Missing WB Kids Stamp", residual: "missing wb kids stamp" },
  { pattern: /\bwb\s+kids(?:\s+promos?)?(?:\s+stamps?|\s+stamped)?\b/gi, label: "WB Kids Stamp", residual: "wb kids stamp" },
  { pattern: /\bleague(?:\s+stamps?|\s+stamped)?\b/gi, label: "League Stamp", residual: "league stamp" },
  { pattern: /\bprize\s+pack(?:\s+stamps?|\s+stamped)?\b/gi, label: "Prize Pack Stamp", residual: "prize pack stamp" },
  { pattern: /\bwinner(?:\s+stamps?|\s+stamped)?\b/gi, label: "Winner Stamp", residual: "winner stamp" },
  { pattern: /\bstaff(?:\s+stamps?|\s+stamped)?\b/gi, label: "Staff Stamp", residual: "staff stamp" },
];

function normalizeWhitespace(value: string) {
  return value.trim().replace(/[,\s]+/g, " ");
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function parseYearRange(query: string) {
  const rangeMatch = query.match(/\b(?:from\s+)?(19\d{2}|20\d{2})\s*(?:-|to|through|thru)\s*(19\d{2}|20\d{2})\b/i);
  if (!rangeMatch) {
    return null;
  }

  const first = Number.parseInt(rangeMatch[1] ?? "", 10);
  const second = Number.parseInt(rangeMatch[2] ?? "", 10);
  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return null;
  }

  return {
    min: Math.min(first, second),
    max: Math.max(first, second),
    matchedText: rangeMatch[0],
  };
}

function normalizePokemonPlural(value: string) {
  return value.replace(/\bpikachus\b/gi, "pikachu");
}

function parseArtistIntent(query: string) {
  const artistMatch = query.match(/\b(?:illustrated|drawn|art)\s+by\s+([a-z0-9 .'-]+?)(?:\s+(?:from|between|with|that|which|and)\b|$)/i);
  if (!artistMatch) {
    return null;
  }

  const artist = normalizeWhitespace(artistMatch[1] ?? "");
  return artist
    ? {
        artist,
        matchedText: artistMatch[0],
      }
    : null;
}

function parseImageStateIntent(query: string): SmartSearchIntent["imageState"] {
  if (/\b(no|missing|without)\s+(?:exact\s+)?images?\b/i.test(query) || /\bvariant\s+image\s+pending\b/i.test(query)) {
    return "missing";
  }
  if (/\brepresentative\s+images?\b/i.test(query)) {
    return "representative";
  }
  if (/\bexact\s+images?\b/i.test(query)) {
    return "exact";
  }
  return undefined;
}

function parseOwnedStateIntent(query: string): SmartSearchIntent["ownedState"] {
  if (/\b(missing|not\s+owned|dont\s+own|do\s+not\s+own|need)\b.*\b(vault|collection|cards?)\b/i.test(query) || /\bmissing\s+from\s+my\s+vault\b/i.test(query)) {
    return "missing";
  }
  if (/\b(i\s+own|owned|in\s+my\s+vault|my\s+vault|my\s+collection)\b/i.test(query)) {
    return "owned";
  }
  return undefined;
}

export function buildSmartSearchIntent(rawQuery: string): SmartSearchIntent {
  const originalQuery = normalizeWhitespace(rawQuery);
  let residual = normalizePokemonPlural(originalQuery);
  const interpretedLabels: string[] = [];
  const finishKeys: string[] = [];
  const stampLabels: string[] = [];
  const unappliedLabels: string[] = [];

  const artistIntent = parseArtistIntent(residual);
  if (artistIntent) {
    residual = residual.replace(artistIntent.matchedText, " ");
    interpretedLabels.push(`Artist: ${artistIntent.artist}`);
  }

  const imageState = parseImageStateIntent(residual);
  if (imageState && imageState !== "any") {
    interpretedLabels.push(`Image: ${imageState === "missing" ? "Missing exact image" : imageState === "representative" ? "Representative image" : "Exact image"}`);
    residual = residual
      .replace(/\b(no|missing|without)\s+(?:exact\s+)?images?\b/gi, " ")
      .replace(/\bvariant\s+image\s+pending\b/gi, " ")
      .replace(/\brepresentative\s+images?\b/gi, " ")
      .replace(/\bexact\s+images?\b/gi, " ");
  }

  const ownedState = parseOwnedStateIntent(residual);
  if (ownedState && ownedState !== "any") {
    interpretedLabels.push(ownedState === "owned" ? "Owned" : "Missing from vault");
    residual = residual
      .replace(/\bmissing\s+from\s+my\s+vault\b/gi, " ")
      .replace(/\b(i\s+own|owned|in\s+my\s+vault|my\s+vault|my\s+collection|not\s+owned|dont\s+own|do\s+not\s+own)\b/gi, " ");
  }

  const yearRange = parseYearRange(residual);
  if (yearRange) {
    residual = residual.replace(yearRange.matchedText, " ");
    interpretedLabels.push(`${yearRange.min}-${yearRange.max}`);
  }

  for (const finish of FINISH_PATTERNS) {
    finish.pattern.lastIndex = 0;
    if (finish.pattern.test(residual)) {
      finish.pattern.lastIndex = 0;
      finishKeys.push(finish.key);
      interpretedLabels.push(finish.label);
      residual = residual.replace(finish.pattern, " ");
    }
  }

  for (const stamp of STAMP_PATTERNS) {
    stamp.pattern.lastIndex = 0;
    if (stamp.pattern.test(residual)) {
      stamp.pattern.lastIndex = 0;
      stampLabels.push(stamp.label);
      interpretedLabels.push(stamp.label);
      residual = residual.replace(stamp.pattern, " ");
    }
  }

  for (const filler of FILLER_PHRASES) {
    residual = residual.replace(filler, " ");
  }

  residual = normalizeWhitespace(residual);

  return {
    originalQuery,
    residualQuery: residual,
    releaseYearMin: yearRange?.min,
    releaseYearMax: yearRange?.max,
    finishKeys: unique(finishKeys),
    artist: artistIntent?.artist,
    imageState,
    ownedState,
    stampLabels: unique(stampLabels),
    interpretedLabels: unique(interpretedLabels),
    unrecognizedTerms: [],
    unappliedLabels,
  };
}
