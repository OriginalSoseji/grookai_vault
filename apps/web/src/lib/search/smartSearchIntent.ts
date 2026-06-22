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
  { pattern: /\bfirst\s+partner(?:\s+series)?\b/gi, label: "First Partner Series", residual: "first partner" },
  { pattern: /\bpok[eé]\s+card\s+creator(?:\s+pack)?\b/gi, label: "Poké Card Creator Pack", residual: "poke card creator" },
  { pattern: /\b(?:build[-\s]?a[-\s]?bear|bab)(?:\s+workshop)?(?:\s+stamps?|\s+stamped)?\b/gi, label: "Build-A-Bear Workshop Stamp", residual: "build a bear stamp" },
  { pattern: /\b(?:toys\s*r\s*us|toysrus|tru)(?:\s+stamps?|\s+stamped)?\b/gi, label: "Toys R Us Stamp", residual: "toys r us stamp" },
  { pattern: /\bburger\s+king(?:\s+stamps?|\s+stamped)?\b/gi, label: "Burger King Stamp", residual: "burger king stamp" },
  { pattern: /\bdragon\s+vault\s+(?:stamps?|stamped)\b/gi, label: "Dragon Vault Stamp", residual: "dragon vault stamp" },
  { pattern: /\bgamestop(?:\s+stamps?|\s+stamped)?\b|\bgame\s+stop(?:\s+stamps?|\s+stamped)?\b/gi, label: "GameStop Stamp", residual: "gamestop stamp" },
  { pattern: /\b(?:pokemon|pok[eé]mon)\s+cent(?:er|re)(?:\s+exclusive)?(?:(?:\s+stamps?|\s+stamped)?(?:\s+promos?)?)?\b|\bpc\s+(?:stamps?|stamped)(?:\s+promos?)?\b|\bpc\s+promos?\b/gi, label: "Pokemon Center Stamp", residual: "pokemon center stamp" },
  { pattern: /\bpokemon\s+together(?:\s+stamps?|\s+stamped)?\b/gi, label: "Pokemon Together Stamp", residual: "pokemon together stamp" },
  { pattern: /\bplay\s+pok[eé]mon(?:\s+stamps?|\s+stamped)?\b/gi, label: "Play Pokémon Stamp", residual: "play pokemon stamp" },
  { pattern: /\bplayer\s+rewards?(?:\s+crosshatch)?(?:\s+stamps?|\s+stamped)?\b/gi, label: "Player Rewards Crosshatch Stamp", residual: "player rewards crosshatch stamp" },
  { pattern: /\binverted\s+wb\s+kids(?:\s+promos?)?(?:\s+stamps?|\s+stamped)?\b/gi, label: "Inverted WB Kids Stamp", residual: "inverted wb kids stamp" },
  { pattern: /\bmissing\s+wb\s+kids(?:\s+promos?)?(?:\s+stamps?|\s+stamped)?\b/gi, label: "Missing WB Kids Stamp", residual: "missing wb kids stamp" },
  { pattern: /\bwb\s+kids(?:\s+promos?)?(?:\s+stamps?|\s+stamped)?\b/gi, label: "WB Kids Stamp", residual: "wb kids stamp" },
  { pattern: /\be[-\s]?league\s+winner(?:\s+stamps?|\s+stamped)?\b/gi, label: "E-League Winner Stamp", residual: "e league winner stamp" },
  { pattern: /\be[-\s]?league(?:\s+stamps?|\s+stamped)?\b/gi, label: "E-League Stamp", residual: "e league stamp" },
  { pattern: /\bleague\s+cup\s+staff(?:\s+stamps?|\s+stamped)?\b/gi, label: "League Cup Staff Stamp", residual: "league cup staff stamp" },
  { pattern: /\bleague(?:\s+stamps?|\s+stamped)?\b/gi, label: "League Stamp", residual: "league stamp" },
  { pattern: /\bprize\s+pack(?:\s+stamps?|\s+stamped)?\b/gi, label: "Prize Pack Stamp", residual: "prize pack stamp" },
  { pattern: /\bprofessor\s+program(?:\s+stamps?|\s+stamped)?\b/gi, label: "Professor Program Stamp", residual: "professor program stamp" },
  { pattern: /\bthank\s+you(?:\s+stamps?|\s+stamped)?\b/gi, label: "Thank You Stamp", residual: "thank you stamp" },
  { pattern: /\b(?:city|state|states|national|world)\s+championships?\s+staff(?:\s+stamps?|\s+stamped)?\b/gi, label: "Championship Staff Stamp", residual: "championship staff stamp" },
  { pattern: /\b(?:city|state|states|national|world)\s+championships?(?:\s+stamps?|\s+stamped)?\b/gi, label: "Championship Stamp", residual: "championship stamp" },
  { pattern: /\bregional\s+championships?(?:\s+stamps?|\s+stamped)?\b/gi, label: "Regional Championships Stamp", residual: "regional championships stamp" },
  { pattern: /\bwinner(?:\s+stamps?|\s+stamped)?\b/gi, label: "Winner Stamp", residual: "winner stamp" },
  { pattern: /\bquarter\s+finalist(?:\s+stamps?|\s+stamped)?\b/gi, label: "Quarter Finalist Stamp", residual: "quarter finalist stamp" },
  { pattern: /\bfinalist(?:\s+stamps?|\s+stamped)?\b/gi, label: "Finalist Stamp", residual: "finalist stamp" },
  { pattern: /\bstaff(?:\s+stamps?|\s+stamped)?\b/gi, label: "Staff Stamp", residual: "staff stamp" },
  { pattern: /\bw(?:izards?|otc)?\s+stamps?\b|\bwotc\s+stamps?\b/gi, label: "WOTC Stamp", residual: "wotc stamp" },
  { pattern: /\be3\s+(?:stamps?|stamped)\b/gi, label: "E3 Stamp", residual: "e3 stamp" },
  { pattern: /\bno\s+symbol(?:\s+errors?)?\b/gi, label: "No Symbol Error", residual: "no symbol error" },
  { pattern: /\bgold\s+border\b/gi, label: "Gold Border", residual: "gold border" },
  { pattern: /\bjapanese\s+(?:card\s+)?back\b/gi, label: "Japanese Card Back", residual: "japanese card back" },
  { pattern: /\bghost\s+stamp(?:\s+shadowless)?\b/gi, label: "Ghost Stamp Shadowless", residual: "ghost stamp shadowless" },
  { pattern: /\b(?:gray|grey)\s+stamp(?:\s+(?:1st|first)\s+edition)?\b/gi, label: "Gray Stamp First Edition", residual: "gray stamp first edition" },
  { pattern: /\bred\s+cheeks?\b/gi, label: "Red Cheeks", residual: "red cheeks" },
  { pattern: /\byellow\s+cheeks?\b/gi, label: "Yellow Cheeks", residual: "yellow cheeks" },
  { pattern: /\bshadowless\b/gi, label: "Shadowless", residual: "shadowless" },
  { pattern: /\b(?:1st|first)\s+edition\b/gi, label: "First Edition", residual: "first edition" },
  { pattern: /\bblack\s+flame(?:\s+errors?)?\b/gi, label: "Black Flame Error", residual: "black flame error" },
  { pattern: /\bcorrected\s+text(?:\s+variants?)?\b/gi, label: "Corrected Text Variant", residual: "corrected text variant" },
  { pattern: /\bd\.?\s*fending(?:\s+errors?)?\b/gi, label: "D. Fending Error", residual: "d fending error" },
  { pattern: /\bmissing\s+holo\s+evolution\s+box(?:\s+errors?)?\b/gi, label: "Missing Holo Evolution Box Error", residual: "missing holo evolution box error" },
  { pattern: /\bevolution\s+box(?:\s+errors?)?\b/gi, label: "Evolution Box Error", residual: "evolution box error" },
  { pattern: /\bno\s+damage(?:\s+errors?)?\b/gi, label: "No Damage Error", residual: "no damage error" },
  { pattern: /\bno\s+hp(?:\s+errors?)?\b/gi, label: "No HP Error", residual: "no hp error" },
  { pattern: /\bnon[-\s]?holo(?:\s+errors?)?\b/gi, label: "Non-Holo Error", residual: "non holo error" },
  { pattern: /\bsideways\s+fighting\s+energy(?:\s+errors?)?\b/gi, label: "Sideways Fighting Energy Error", residual: "sideways fighting energy error" },
  { pattern: /\bstage\s+errors?\b/gi, label: "Stage Error", residual: "stage error" },
  { pattern: /\bincorrect\s+artist(?:\s+variants?)?\b/gi, label: "Incorrect Artist Variant", residual: "incorrect artist variant" },
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
  const artistPatterns = [
    /\b(?:illustrated|drawn|art)\s+by\s+([a-z0-9 .'-]+?)(?=\s+(?:from|between|with|that|which|and|19\d{2}|20\d{2})\b|$)/i,
    /\b(?:artist|illustrator)\s+([a-z0-9 .'-]+?)(?=\s+(?:from|between|with|that|which|and|19\d{2}|20\d{2})\b|$)/i,
  ];

  for (const pattern of artistPatterns) {
    const artistMatch = query.match(pattern);
    if (!artistMatch) {
      continue;
    }

    const artist = normalizeWhitespace(artistMatch[1] ?? "");
    if (artist) {
      return {
        artist,
        matchedText: artistMatch[0],
      };
    }
  }

  return null;
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

  const artistIntent = parseArtistIntent(residual);
  if (artistIntent) {
    residual = residual.replace(artistIntent.matchedText, " ");
    interpretedLabels.push(`Artist: ${artistIntent.artist}`);
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
