import crypto from "node:crypto";

export const CARD_VISUAL_SEARCH_TCG_CONCEPT_PROFILE_VERSION =
  "CARD_VISUAL_SEARCH_TCG_CONCEPT_PROFILE_V1";

const CONCEPT_RULES = Object.freeze([
  ["pose", "sleeping", /\b(?:sleeping|asleep|sleep)\b/u],
  ["pose", "standing", /\b(?:standing|upright)\b/u],
  ["pose", "sitting", /\b(?:sitting|seated)\b/u],
  ["pose", "lying down", /\b(?:lying down|reclining)\b/u],
  ["pose", "leaping", /\b(?:leaping|jumping|mid[- ]jump)\b/u],
  ["pose", "floating", /\b(?:floating|hovering)\b/u],
  ["pose", "flying", /\b(?:flying|in flight|airborne)\b/u],
  ["pose", "running", /\b(?:running|sprinting)\b/u],
  ["pose", "walking", /\b(?:walking|striding)\b/u],
  ["pose", "swimming", /\b(?:swimming|underwater movement)\b/u],
  ["action", "holding", /\b(?:holding|held|gripping|carrying)\b/u],
  ["action", "eating", /\b(?:eating|biting into|chewing)\b/u],
  ["action", "cooking", /\b(?:cooking|baking|food preparation)\b/u],
  ["action", "reading", /\b(?:reading|open book)\b/u],
  ["action", "fighting", /\b(?:fighting|battle pose|clashing)\b/u],
  ["environment", "forest", /\b(?:forest|woodland)\b/u],
  ["environment", "tree", /\b(?:tree|trees|tree trunk|tree canopy)\b/u],
  ["environment", "cityscape", /\b(?:cityscape|city skyline|urban skyline)\b/u],
  ["environment", "kitchen", /\bkitchen\b/u],
  ["environment", "bedroom", /\bbedroom\b/u],
  ["environment", "interior", /\b(?:interior|indoors|indoor)\b/u],
  ["environment", "outdoor", /\b(?:outdoors|outdoor)\b/u],
  ["environment", "beach", /\b(?:beach|shoreline|sandy shore)\b/u],
  ["environment", "ocean", /\b(?:ocean|open sea)\b/u],
  ["environment", "river", /\briver\b/u],
  ["environment", "mountain", /\b(?:mountain|mountains|mountainous)\b/u],
  ["environment", "cave", /\b(?:cave|cavern)\b/u],
  ["environment", "sky", /\bsky\b/u],
  ["environment", "cloud", /\b(?:cloud|clouds|cloudy)\b/u],
  ["environment", "rain", /\b(?:rain|rainfall|raindrops|rainy)\b/u],
  ["environment", "snow", /\b(?:snow|snowfall|snowy)\b/u],
  ["environment", "sunset", /\bsunset\b/u],
  ["environment", "night", /\b(?:night|nighttime|night sky)\b/u],
  ["environment", "flower", /\b(?:flower|flowers|floral)\b/u],
  ["environment", "grass", /\b(?:grass|grassy)\b/u],
  ["environment", "water", /\b(?:water|pond|lake|stream)\b/u],
  ["object", "Poke Ball", /\b(?:pok[eé]\s*ball|pokeball)\b/u],
  ["object", "cookie", /\b(?:cookie|cookies|biscuit)\b/u],
  ["object", "cake", /\b(?:cake|cupcake)\b/u],
  ["object", "ice cream", /\b(?:ice cream|ice-cream|popsicle)\b/u],
  ["object", "food", /\b(?:food|cookie|cookies|cake|cupcake|ice cream|candy|sweets?)\b/u],
  ["object", "plush", /\b(?:plush|plushie|stuffed toy)\b/u],
  ["object", "pillow", /\b(?:pillow|cushion)\b/u],
  ["object", "statue", /\b(?:statue|sculpture|figurine)\b/u],
  ["object", "poster", /\bposter\b/u],
  ["object", "screen", /\b(?:screen|television|tv)\b/u],
  ["object", "sign", /\bsign\b/u],
  ["object", "book", /\bbook\b/u],
  ["effect", "flame", /\b(?:flame|flames|fire)\b/u],
  ["effect", "smoke", /\b(?:smoke|smoky|smoke plume|smoke cloud)\b/u],
  ["effect", "vapor", /\b(?:vapor|vapour|haze)\b/u],
  ["effect", "spark", /\b(?:spark|sparks|sparkle)\b/u],
  ["effect", "lightning", /\b(?:lightning|lightning bolt)\b/u],
  ["effect", "glow", /\b(?:glow|glowing|luminous)\b/u],
  ["composition", "centered composition", /\b(?:centered|central alignment|central subject)\b/u],
  ["composition", "diagonal composition", /\bdiagonal\b/u],
  ["composition", "close crop", /\b(?:close crop|closely cropped|close-up)\b/u],
  ["composition", "panoramic composition", /\b(?:panoramic|panorama)\b/u],
  ["lighting", "backlit", /\b(?:backlit|backlighting)\b/u],
  ["lighting", "soft lighting", /\b(?:soft lighting|soft diffuse lighting)\b/u],
  ["lighting", "dramatic lighting", /\bdramatic lighting\b/u],
]);

const REPRESENTATION_FORMS = Object.freeze([
  ["food shape", /\b(?:food shape|cookie|cake|ice cream|candy|sweets?)\b/u],
  ["plush", /\b(?:plush|plushie|stuffed toy)\b/u],
  ["pillow", /\b(?:pillow|cushion)\b/u],
  ["statue", /\b(?:statue|sculpture|figurine)\b/u],
  ["toy", /\b(?:toy|doll)\b/u],
  ["logo", /\blogo\b/u],
  ["pattern", /\bpattern\b/u],
]);

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\u2018\u2019\u02bc\uff07]/gu, "'")
    .replace(/[_\s]+/gu, " ")
    .trim();
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
    .join(",")}}`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function evidenceKey(entry) {
  return [
    entry.source_type,
    entry.source_id,
    entry.normalized_term,
    ...(entry.supporting_observation_ids ?? []),
  ].join("\u001f");
}

function addConcept(concepts, family, concept, entries, details = {}) {
  const supportingEntries = entries.filter(
    (entry) => (entry.supporting_observation_ids ?? []).length,
  );
  if (!supportingEntries.length) return;
  const sourceObservationIds = uniqueSorted(
    supportingEntries.flatMap((entry) => entry.supporting_observation_ids ?? []),
  );
  const sourceEntryIds = uniqueSorted(
    supportingEntries.map((entry) => `${entry.source_type}:${entry.source_id}`),
  );
  const key = `${family}\u001f${normalize(concept)}`;
  const existing = concepts.get(key);
  if (existing) {
    existing.source_observation_ids = uniqueSorted([
      ...existing.source_observation_ids,
      ...sourceObservationIds,
    ]);
    existing.source_entry_ids = uniqueSorted([
      ...existing.source_entry_ids,
      ...sourceEntryIds,
    ]);
    existing.confidence = Math.max(
      existing.confidence ?? 0,
      ...supportingEntries.map((entry) => entry.confidence ?? 0),
    );
    return;
  }
  const payload = {
    concept_profile_version: CARD_VISUAL_SEARCH_TCG_CONCEPT_PROFILE_VERSION,
    family,
    concept,
    normalized_concept: normalize(concept),
    source_observation_ids: sourceObservationIds,
    source_entry_ids: sourceEntryIds,
    derivation: "deterministic_rule",
    confidence: Math.max(
      0,
      ...supportingEntries.map((entry) => entry.confidence ?? 0),
    ) || null,
    details,
  };
  payload.concept_id = `tcgvc_${sha256(stableJson(payload)).slice(0, 24)}`;
  concepts.set(key, payload);
}

function isCardUiEntry(entry) {
  const text = normalize(
    `${entry.module ?? ""} ${entry.category ?? ""} ${entry.field_path ?? ""}`,
  );
  return (
    /\b(?:card ui|card_ui|hp text|collector number|illustrator text|attack text|card frame|surface and scan)\b/u.test(
      text,
    ) ||
    (entry.supporting_card_ui_observation_ids ?? []).length > 0
  );
}

export function deriveTcgVisualConceptsV1(entries = []) {
  const eligible = entries.filter(
    (entry) =>
      entry &&
      !isCardUiEntry(entry) &&
      (entry.supporting_observation_ids ?? []).length > 0,
  );
  const concepts = new Map();

  for (const entry of eligible) {
    const text = normalize(
      `${entry.term ?? ""} ${entry.normalized_term ?? ""} ${entry.module ?? ""} ${entry.field_path ?? ""}`,
    );
    for (const [family, concept, pattern] of CONCEPT_RULES) {
      if (pattern.test(text)) addConcept(concepts, family, concept, [entry]);
    }

    if (entry.subject_role === "depicted_subject") {
      addConcept(concepts, "appearance_role", "depicted on another surface", [
        entry,
      ]);
    }
    if (entry.subject_role === "character_representation") {
      addConcept(concepts, "appearance_role", "character-shaped object", [
        entry,
      ]);
      for (const [form, pattern] of REPRESENTATION_FORMS) {
        if (pattern.test(text)) {
          addConcept(
            concepts,
            "representation_form",
            form === "food shape" ? "character-shaped food" : `character ${form}`,
            [entry],
            { representation_form: form },
          );
        }
      }
    }
  }

  const sceneOrDepictedSubjects = eligible.filter(
    (entry) =>
      entry.source_type === "subject_role" &&
      ["scene_subject", "depicted_subject"].includes(entry.subject_role),
  );
  const distinctSubjects = new Map();
  for (const entry of sceneOrDepictedSubjects) {
    for (const id of entry.supporting_observation_ids ?? []) {
      if (!distinctSubjects.has(id)) distinctSubjects.set(id, entry);
    }
  }
  const subjectEntries = [...distinctSubjects.values()];
  if (subjectEntries.length >= 2) {
    addConcept(concepts, "subject_count", "multiple visible subjects", subjectEntries, {
      minimum_count: subjectEntries.length,
    });
  }
  if (subjectEntries.length >= 3) {
    addConcept(concepts, "subject_count", "three or more visible subjects", subjectEntries, {
      minimum_count: subjectEntries.length,
    });
  }

  const cueGroups = {
    pumpkin: eligible.filter((entry) => /\b(?:pumpkins?|jack-o-lanterns?)\b/u.test(normalize(entry.term))),
    tombstone: eligible.filter((entry) => /\b(?:tombstone|grave|graveyard|cemetery)\b/u.test(normalize(entry.term))),
    bat: eligible.filter((entry) => /\bbats?\b/u.test(normalize(entry.term))),
    candle: eligible.filter((entry) => /\b(?:candle|candles)\b/u.test(normalize(entry.term))),
    web: eligible.filter((entry) => /\b(?:spiderweb|cobweb)\b/u.test(normalize(entry.term))),
    ghost_effect: eligible.filter((entry) => /\b(?:ghost flame|spectral wisp|ghostly figure)\b/u.test(normalize(entry.term))),
  };
  const halloweenSupport = Object.values(cueGroups)
    .filter((group) => group.length)
    .flat();
  const explicitHalloween = eligible.filter((entry) =>
    /\bhalloween\b/u.test(normalize(entry.term)),
  );
  if (explicitHalloween.length || Object.values(cueGroups).filter((group) => group.length).length >= 2) {
    addConcept(
      concepts,
      "theme",
      "Halloween visual theme",
      [...explicitHalloween, ...halloweenSupport],
      { cue_family_count: Object.values(cueGroups).filter((group) => group.length).length },
    );
  }

  const rows = [...concepts.values()].sort(
    (left, right) =>
      left.family.localeCompare(right.family) ||
      left.normalized_concept.localeCompare(right.normalized_concept),
  );
  return {
    version: CARD_VISUAL_SEARCH_TCG_CONCEPT_PROFILE_VERSION,
    concepts: rows,
    source_entry_fingerprint: sha256(
      uniqueSorted(eligible.map(evidenceKey)).join("\n"),
    ),
  };
}
