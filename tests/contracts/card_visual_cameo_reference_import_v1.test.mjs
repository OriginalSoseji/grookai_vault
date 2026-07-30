import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildCanonicalIndexV1,
  buildExistingApprovedCameoIndexV1,
  buildVisualCorpusCanonicalIndexV1,
  deriveDisplayModesV1,
  normalizeCameoRowsV1,
  normalizeCardNumberV1,
  normalizeIdentityTextV1,
  parseCsvV1,
  parseXlsxSheetFormattingV1,
  parseXlsxStylesV1,
  reconcileCameoRowsV1,
} from "../../backend/card_descriptions/card_visual_cameo_reference_import_v1.mjs";

test("CSV parser preserves quoted commas and line breaks", () => {
  const rows = parseCsvV1('A,B\n"cookie, tray","line 1\nline 2"\n');
  assert.deepEqual(rows, [
    ["A", "B"],
    ["cookie, tray", "line 1\nline 2"],
  ]);
});

test("normalization handles accents, apostrophes, and leading zeroes", () => {
  assert.equal(normalizeIdentityTextV1("Pokémon Fan Club"), "pokemon fan club");
  assert.equal(normalizeIdentityTextV1("Cynthia’s Feelings"), "cynthia s feelings");
  assert.equal(normalizeCardNumberV1("094"), "94");
});

test("display modes derive only from explicit notes", () => {
  assert.deepEqual(deriveDisplayModesV1(""), []);
  assert.deepEqual(deriveDisplayModesV1("sweets"), ["food"]);
  assert.deepEqual(deriveDisplayModesV1("plush toy on poster"), [
    "plush",
    "toy",
    "poster",
  ]);
});

test("XLSX styles preserve italic and light-blue evidence", () => {
  const styles = parseXlsxStylesV1(`
    <styleSheet>
      <fonts count="2"><font/><font><i/></font></fonts>
      <fills count="2"><fill/><fill><patternFill><fgColor rgb="FFCFE2F3"/></patternFill></fill></fills>
      <cellXfs count="2"><xf fontId="0" fillId="0"/><xf fontId="1" fillId="1"/></cellXfs>
    </styleSheet>
  `);
  const formatting = parseXlsxSheetFormattingV1(
    `<worksheet><sheetData><row r="2"><c r="C2" s="1"><v>1</v></c></row></sheetData><mergeCells><mergeCell ref="C2:C3"/></mergeCells></worksheet>`,
    styles,
  );
  assert.equal(formatting.cells.get("C2").italic, true);
  assert.equal(formatting.cells.get("C2").fill_rgb, "FFCFE2F3");
  assert.equal(formatting.mergedRanges[0].reference, "C2:C3");
});

test("sheet rows fill cameo identity and merged card names without inventing notes", () => {
  const styles = parseXlsxStylesV1(
    `<styleSheet><fonts count="1"><font/></fonts><fills count="1"><fill/></fills><cellXfs count="1"><xf fontId="0" fillId="0"/></cellXfs></styleSheet>`,
  );
  const formatting = parseXlsxSheetFormattingV1(
    `<worksheet><sheetData><row r="2"><c r="C2" s="0"/></row><row r="3"><c r="C3" s="0"/></row></sheetData><mergeCells><mergeCell ref="C2:C3"/></mergeCells></worksheet>`,
    styles,
  );
  const csvText = [
    "Ndex,Cameo Pokémon,Card name,Set,#,Notes",
    "25,Pikachu,Slurpuff,Ascended Heroes,94,",
    ",Snorlax,,Ascended Heroes,94,sweets",
  ].join("\n");
  const rows = normalizeCameoRowsV1({
    tab: { title: "Gen 1", sheet_id: 0 },
    csvText,
    formatting,
    sourceSha256: "source",
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[1].card_name, "Slurpuff");
  assert.equal(rows[0].display_mode_terms.length, 0);
  assert.deepEqual(rows[1].display_mode_terms, ["food"]);
  assert.equal(rows[1].subject_kind_candidate, "character_representation_candidate");
});

test("trainer tab preserves trainer identity instead of coercing it to Pokemon", () => {
  const styles = parseXlsxStylesV1(
    `<styleSheet><fonts count="1"><font/></fonts><fills count="1"><fill/></fills><cellXfs count="1"><xf fontId="0" fillId="0"/></cellXfs></styleSheet>`,
  );
  const rows = normalizeCameoRowsV1({
    tab: { title: "Trainers", sheet_id: 1 },
    csvText:
      ",Cameo Trainer,Card name,Set,#,Notes\n,Acerola,Example Card,Example Set,1,portrait",
    formatting: parseXlsxSheetFormattingV1("<worksheet/>", styles),
    sourceSha256: "source",
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].cameo_identity_kind, "trainer");
  assert.equal(rows[0].cameo_identity, "Acerola");
});

test("canonical reconciliation requires one exact set-name card-name number target", () => {
  const master = {
    cards: [
      {
        set_key: "asc",
        set_name: "Ascended Heroes",
        card_number: "094",
        card_name: "Slurpuff",
      },
    ],
  };
  const audit = {
    rows: [
      {
        set_key: "asc",
        set_code: "asc",
        card_number: "094",
        index_card_name: "Slurpuff",
        grookai_card_print_id: "card-1",
        finish_key: "holo",
      },
    ],
  };
  const index = buildCanonicalIndexV1(master, audit);
  const row = {
    set_name: "Ascended Heroes",
    card_name: "Slurpuff",
    card_number: "94",
  };
  const result = reconcileCameoRowsV1([row], index);
  assert.equal(result.exact.length, 1);
  assert.equal(result.exact[0].canonical_match.card_print_id, "card-1");
  assert.equal(result.ambiguous.length, 0);
  assert.equal(result.unmatched.length, 0);
});

test("multiple canonical print identities remain ambiguous", () => {
  const master = {
    cards: [{ set_key: "set", set_name: "Example Set" }],
  };
  const audit = {
    rows: [
      {
        set_key: "set",
        card_number: "1",
        index_card_name: "Example",
        grookai_card_print_id: "card-1",
      },
      {
        set_key: "set",
        card_number: "1",
        index_card_name: "Example",
        grookai_card_print_id: "card-2",
      },
    ],
  };
  const result = reconcileCameoRowsV1(
    [{ set_name: "Example Set", card_name: "Example", card_number: "1" }],
    buildCanonicalIndexV1(master, audit),
  );
  assert.equal(result.exact.length, 0);
  assert.equal(result.ambiguous.length, 1);
  assert.equal(result.ambiguous[0].canonical_candidates.length, 2);
});

test("existing approved cameo relationship wins without creating another match", () => {
  const existing = buildExistingApprovedCameoIndexV1(
    {
      seed_payload: [
        {
          cameo_subject_type: "pokemon",
          cameo_subject_name: "Pikachu",
          card_name_raw: "Example",
          set_name_raw: "Example Set",
          number_raw: "1",
          card_print_id: "approved-card",
          approved_gv_id: "GV-APPROVED",
        },
      ],
    },
    {},
    {},
  );
  const result = reconcileCameoRowsV1(
    [
      {
        cameo_identity_kind: "pokemon",
        cameo_identity: "Pikachu",
        card_name: "Example",
        set_name: "Example Set",
        card_number: "1",
      },
    ],
    new Map(),
    existing,
  );
  assert.equal(result.exact.length, 1);
  assert.equal(result.exact[0].reconciliation_status, "existing_approved_cameo_match");
  assert.equal(result.exact[0].canonical_match.card_print_id, "approved-card");
});

test("existing Charizard gap artifact resolves through immutable visual inventory", () => {
  const existing = buildExistingApprovedCameoIndexV1(
    {},
    {},
    {
      db_write: {
        performed: true,
        source_row_hash: "hash",
        target: { gv_id: "GV-CHAR", name: "Pikachu", number: "101" },
        cameo: { cameo_subject_name: "Charizard" },
      },
    },
    [{ gv_id: "GV-CHAR", card_print_id: "char-card" }],
  );
  const result = reconcileCameoRowsV1(
    [
      {
        cameo_identity_kind: "pokemon",
        cameo_identity: "Charizard",
        card_name: "Pikachu",
        set_name: "SV Promos",
        card_number: "101",
      },
    ],
    new Map(),
    existing,
  );
  assert.equal(result.exact[0].canonical_match.card_print_id, "char-card");
});

test("visual corpus set alias requires repeated unique name-number evidence", () => {
  const sheetRows = [
    { set_name: "New Set", card_name: "Alpha", card_number: "1" },
    { set_name: "New Set", card_name: "Beta", card_number: "2" },
  ];
  const visualRows = [
    { card_print_id: "a", gv_id: "GV-A", set_code: "new", name: "Alpha", number: "001" },
    { card_print_id: "b", gv_id: "GV-B", set_code: "new", name: "Beta", number: "002" },
  ];
  const built = buildVisualCorpusCanonicalIndexV1(sheetRows, visualRows);
  assert.equal(built.aliasEvidence.length, 1);
  assert.equal(built.aliasEvidence[0].set_code, "new");
  const result = reconcileCameoRowsV1(sheetRows, built.canonicalIndex);
  assert.equal(result.exact.length, 2);
});

test("importer has no provider, database, embedding, approval, or fact-graph mutation path", () => {
  const source = readFileSync(
    new URL(
      "../../backend/card_descriptions/card_visual_cameo_reference_import_v1.mjs",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(source, /api\.openai\.com|responses\.create|OPENAI_API_KEY/iu);
  assert.doesNotMatch(source, /SUPABASE_DB_URL|DATABASE_URL|POSTGRES_URL|createClient\(/u);
  assert.doesNotMatch(source, /insert\s+into|update\s+public\.|delete\s+from/iu);
  assert.doesNotMatch(source, /embeddings?\.create|text-embedding/iu);
  assert.doesNotMatch(source, /review_status\s*[:=]\s*["']approved/iu);
  assert.doesNotMatch(source, /fact_graph\s*[:=]/iu);
});
