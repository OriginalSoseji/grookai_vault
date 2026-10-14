export const TCGPLAYER_REVIEWED_ALIAS_WAVE_2_PRODUCT_IDENTITY_AUTHORITY_V1 =
  "TCGPLAYER_REVIEWED_ALIAS_WAVE_2_PRODUCT_IDENTITY_AUTHORITY_V1";

const rows = [
  {
    "source_product_id": 146731,
    "source_product_name": "Pokemon Breeder (Full Art)",
    "source_group_id": 2054,
    "source_group_name": "Shining Legends",
    "printed_number": "73/73",
    "target": {
      "card_print_id": "569ae004-966d-404a-bf08-409ac479bc81",
      "gv_id": "GV-PK-SLG-73",
      "set_id": "3c75028f-5798-4271-b390-ab040e76346c",
      "set_code": "sm3.5",
      "name": "Pokémon Breeder",
      "number": "73",
      "variant_key": ""
    },
    "printing": {
      "finish_key": "holo",
      "printing_gv_id": "GV-PK-SLG-73-HOLO",
      "provenance_source": "EXISTING_PRINTING_SCOPED_PROVENANCE_V1",
      "provenance_ref": "raw_imports:-562970277523425846|printing-scope:7d0127c12e30a3632f1d99a07f56e0e8baf54075d2c5390f33dba0a0fee070f4"
    }
  },
  {
    "source_product_id": 232531,
    "source_product_name": "Poke Kid (Full Art)",
    "source_group_id": 2754,
    "source_group_name": "Shining Fates",
    "printed_number": "070/072",
    "target": {
      "card_print_id": "ba1ec4a8-a59d-47fa-bb36-076f5e3c01cc",
      "gv_id": "GV-PK-SHF-70",
      "set_id": "6335ab75-4e9d-4e4c-8955-261f5288ca7c",
      "set_code": "swsh4.5",
      "name": "Poké Kid",
      "number": "70",
      "variant_key": ""
    },
    "printing": {
      "finish_key": "holo",
      "printing_gv_id": "GV-PK-SHF-70-HOLO",
      "provenance_source": "ENGLISH_PROVENANCE_REPAIR_V1",
      "provenance_ref": "raw_imports:-896622957064200608|master-index:eddf1be9d08a82bec7c4932500bb4370307181d95081d7dc7f96c3366af721f1"
    }
  },
  {
    "source_product_id": 717607,
    "source_product_name": "Mew - R/RGB",
    "source_group_id": 24722,
    "source_group_name": "ME: 30th Celebration",
    "printed_number": "R/RGB",
    "target": {
      "card_print_id": "18675c36-ba36-5ebe-a12b-eeea0e61cb62",
      "gv_id": "GV-PK-30C-R-RGB",
      "set_id": "50d8b80c-70b6-5733-9b97-89ef472d387f",
      "set_code": "30c",
      "name": "Mew",
      "number": "R/RGB",
      "variant_key": ""
    },
    "printing": {
      "finish_key": "holo",
      "printing_gv_id": "GV-PK-30C-R-RGB-HOLO",
      "provenance_source": "pokemon_30th_base_printing_evidence_v1",
      "provenance_ref": "raw_imports:-1004712276861621545|tcgcollector:89671:363"
    }
  },
  {
    "source_product_id": 717608,
    "source_product_name": "Mew - G/RGB",
    "source_group_id": 24722,
    "source_group_name": "ME: 30th Celebration",
    "printed_number": "G/RGB",
    "target": {
      "card_print_id": "337f254a-b7a7-533d-9f63-d7caa9bc7777",
      "gv_id": "GV-PK-30C-G-RGB",
      "set_id": "50d8b80c-70b6-5733-9b97-89ef472d387f",
      "set_code": "30c",
      "name": "Mew",
      "number": "G/RGB",
      "variant_key": ""
    },
    "printing": {
      "finish_key": "holo",
      "printing_gv_id": "GV-PK-30C-G-RGB-HOLO",
      "provenance_source": "pokemon_30th_base_printing_evidence_v1",
      "provenance_ref": "raw_imports:-1004712276861621545|tcgcollector:89672:363"
    }
  },
  {
    "source_product_id": 717609,
    "source_product_name": "Mew - B/RGB",
    "source_group_id": 24722,
    "source_group_name": "ME: 30th Celebration",
    "printed_number": "B/RGB",
    "target": {
      "card_print_id": "39c22794-5cbd-5b9b-abf9-bea3a65c10a0",
      "gv_id": "GV-PK-30C-B-RGB",
      "set_id": "50d8b80c-70b6-5733-9b97-89ef472d387f",
      "set_code": "30c",
      "name": "Mew",
      "number": "B/RGB",
      "variant_key": ""
    },
    "printing": {
      "finish_key": "holo",
      "printing_gv_id": "GV-PK-30C-B-RGB-HOLO",
      "provenance_source": "pokemon_30th_base_printing_evidence_v1",
      "provenance_ref": "raw_imports:-1004712276861621545|tcgcollector:89673:363"
    }
  }
].map((row) => Object.freeze({
  authority_version: TCGPLAYER_REVIEWED_ALIAS_WAVE_2_PRODUCT_IDENTITY_AUTHORITY_V1,
  ...row,
  target: Object.freeze(row.target),
  printing: Object.freeze(row.printing),
}));

export const TCGPLAYER_REVIEWED_ALIAS_WAVE_2_PRODUCT_IDENTITIES_V1 = Object.freeze(rows);

function text(value) { return String(value ?? "").trim(); }

export function reviewedTcgplayerAliasWave2ProductIdentityByIdV1(sourceProductId) {
  return rows.find((candidate) => Number(sourceProductId) === candidate.source_product_id) ?? null;
}

export function reviewedTcgplayerAliasWave2ProductIdentityV1(source) {
  const row = reviewedTcgplayerAliasWave2ProductIdentityByIdV1(source?.source_product_id);
  if (!row) return null;
  return Number(source?.source_group_id) === row.source_group_id &&
    text(source?.source_group_name) === row.source_group_name &&
    text(source?.source_product_name) === row.source_product_name &&
    text(source?.printed_number) === row.printed_number ? row : null;
}

export function matchesReviewedTcgplayerAliasWave2ProductTargetV1(source, target) {
  const authority = reviewedTcgplayerAliasWave2ProductIdentityV1(source);
  if (!authority || !target) return false;
  return target.card_print_id === authority.target.card_print_id && target.gv_id === authority.target.gv_id &&
    target.set_id === authority.target.set_id && target.set_code === authority.target.set_code &&
    target.name === authority.target.name && text(target.number) === authority.target.number &&
    text(target.variant_key) === authority.target.variant_key;
}
