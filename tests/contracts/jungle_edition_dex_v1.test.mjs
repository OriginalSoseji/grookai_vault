import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const fixture = JSON.parse(fs.readFileSync("tests/fixtures/jungle_edition_resolution_v1.json"));
const legacy = fixture.legacy_card_print_id;
const parents = [legacy, ...fixture.options.map((o) => o.card_print_id)];
const speciesId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function harness({ exclusions = [legacy], error = null, owner = true, explicitMappings = true, manyMappings = false } = {}) {
  const calls = [];
  const mappedIds = explicitMappings ? parents : [legacy];
  const counts = new Map(owner ? [[legacy, 5], [parents[1], 1]] : []);
  const cards = mappedIds.map((id, index) => ({
    species_id: speciesId, species_slug: "clefable", species_display_name: "Clefable", national_dex_number: 36,
    card_print_id: id, gv_id: index === 0 ? "GV-PK-JU-1" : fixture.options[index - 1].gv_id,
    name: "Clefable", set_code: "base2", set_name: "Jungle", number: "1", role: "primary",
    counts_for_completion: true, mapping_active: true,
  }));
  const mappings = mappedIds.map((id, index) => ({ id: `m-${index}`, species_id: speciesId, card_print_id: id, active: true, counts_for_completion: true }));
  // Multiple active roles for one print must not subtract/count it twice;
  // retain enough mappings to cross the actual reader's 1,000-row boundary.
  for (let index = 0; index < (manyMappings ? 1001 : 1); index++) mappings.push({ ...mappings[0], id: `duplicate-${index}` });
  const species = [{ species_id: speciesId, national_dex_number: 36, display_name: "Clefable", slug: "clefable", types: ["fairy"], generation: 1, active: true, total_print_count: mappedIds.length }];
  const client = {
    async rpc(name) {
      calls.push({ name });
      if (name === "get_jungle_edition_discovery_exclusions_v1") return { data: exclusions, error };
      if (name === "get_public_card_cameos_v2") return { data: [], error: null };
      throw new Error(`Unexpected RPC ${name}`);
    },
    from(table) {
      const call = { table, filters: [], from: 0, to: Infinity };
      calls.push(call);
      const query = {
        select() { return query; },
        eq(column, value) { call.filters.push((row) => row[column] === value); return query; },
        in(column, values) { call.ids = Array.from(values); call.filters.push((row) => values.includes(row[column])); return query; },
        order() { return query; },
        range(from, to) { call.from = from; call.to = to; return query; },
        then(resolve, reject) {
          const raw = table === "v_grookai_dex_species_v1" ? species
            : table === "card_print_species" ? mappings
            : table === "v_grookai_dex_card_prints_v1" ? [...cards, { ...cards[0], role: "form_subject" }]
            : table === "card_prints" ? parents.map((id, index) => ({ id, printed_identity_modifier: index === 0 ? null : `edition:${fixture.options[index - 1].edition}` }))
            : null;
          if (!raw) throw new Error(`Unexpected table ${table}`);
          const filtered = raw.filter((row) => call.filters.every((filter) => filter(row)));
          return Promise.resolve({ data: filtered.slice(call.from, call.to + 1), count: filtered.length, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const mocks = {
    "server-only": {},
    "next/cache": { unstable_cache: (fn) => fn },
    "@/lib/supabase/admin": { createServerAdminClient: () => client },
    "@/lib/vault/getOwnedCountsByCardPrintIds": {
      getAllOwnedCountsForUser: async () => { calls.push({ name: "owned-all" }); return counts; },
      getOwnedCountsByCardPrintIds: async (_user, ids) => { calls.push({ name: "owned-detail", ids: Array.from(ids) }); return counts; },
    },
    "@/lib/vault/getOwnedPrintingCountsByCardPrintIds": {
      getOwnedPrintingOwnershipByCardPrintIds: async () => ({ countsByCardPrintId: new Map([[parents[1], new Map([[fixture.options[0].card_printing_id, 1]])]]), unassignedCountsByCardPrintId: new Map() }),
    },
    "@/lib/cards/getPublicCardPrintingOptions": {
      getPublicCardPrintingOptions: async (_client, ids) => {
        calls.push({ name: "printing-options", ids: Array.from(ids) });
        return fixture.options.filter((o) => ids.includes(o.card_print_id)).map((o) => ({ id: o.card_printing_id, card_print_id: o.card_print_id, printing_gv_id: o.printing_gv_id, finish_key: o.finish_key }));
      },
    },
    "@/lib/cards/childDisplayImageFallbacks": { getChildDisplayImageFallbacks: async () => new Map() },
    "@/lib/canon/resolveCardImageFieldsV1": { resolveCardImageFieldsV1: async () => ({}) },
  };
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} };
    cache.set(file, module.exports);
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
      { module, exports: module.exports, Error, Map, Set, require: (name) => Object.hasOwn(mocks, name) ? mocks[name] : load(path.resolve("apps/web/src", name.slice(2) + ".ts")) });
    return module.exports;
  }
  return {
    calls,
    page: () => load(path.resolve("apps/web/src/lib/grookaiDex/getGrookaiDexSpecies.ts")).getGrookaiDexSpeciesPage(owner ? "owner" : null),
    detail: () => load(path.resolve("apps/web/src/lib/grookaiDex/getGrookaiDexSpeciesDetail.ts")).getGrookaiDexSpeciesDetail("clefable", owner ? "owner" : null),
  };
}

test("Dex overview excludes unresolved identity, retains copies and credits only the owned edition", async () => {
  const h = harness({ manyMappings: true });
  const result = await h.page();
  assert.equal(result.species[0].totalPrintCount, 2);
  assert.equal(result.species[0].ownedPrintCount, 1);
  assert.equal(result.species[0].ownedCopyCount, 6);
  assert.equal(result.species[0].completionPercent, 50);
  assert.equal(result.overview.totalPrintCount, 2);
  assert.equal(result.overview.ownedPrintCount, 1);
  assert.equal(result.overview.completeSpeciesCount, 0);
  assert.ok(h.calls.some((call) => call.table === "card_print_species" && call.from === 1000));
});
test("public Dex totals use the same exclusions without reading ownership", async () => {
  const h = harness({ owner: false });
  const result = await h.page();
  assert.equal(result.overview.totalPrintCount, 2);
  assert.equal(result.overview.ownedPrintCount, 0);
  assert.ok(!h.calls.some((call) => call.name?.startsWith("owned")));
});
test("species detail retains five unresolved copies as additional, with no completion options", async () => {
  const h = harness();
  const result = await h.detail();
  assert.equal(result.cards.length, 3);
  assert.equal(result.totalPrintCount, 2);
  assert.equal(result.ownedCopyCount, 6);
  assert.equal(result.ownedPrintCount, 1);
  assert.equal(result.variantOptionCount, 2);
  assert.equal(result.ownedVariantOptionCount, 1);
  const held = result.cards.find((row) => row.cardPrintId === legacy);
  assert.equal(held.editionReviewRequired, true);
  assert.equal(held.countsForCompletion, false);
  assert.equal(held.printings.length, 0);
  assert.equal(held.ownedCount, 5);
  assert.equal(held.printLabel, "Edition unconfirmed");
  assert.deepEqual(h.calls.find((call) => call.name === "owned-detail").ids, parents);
  assert.deepEqual(h.calls.find((call) => call.name === "printing-options").ids, parents.slice(1));
});
test("public detail offers both explicit editions and no unresolved third card", async () => {
  const h = harness({ owner: false });
  const result = await h.detail();
  assert.equal(result.cards.length, 2);
  assert.ok(result.cards.every((row) => !row.editionReviewRequired));
  assert.ok(!h.calls.some((call) => call.name?.startsWith("owned")));
});
test("missing reviewed edition species mappings are not invented", async () => {
  const h = harness({ explicitMappings: false });
  const page = await h.page();
  const detail = await h.detail();
  assert.equal(page.species[0].totalPrintCount, 0);
  assert.equal(page.species[0].ownedPrintCount, 0);
  assert.equal(page.species[0].ownedCopyCount, 5);
  assert.equal(detail.totalPrintCount, 0);
  assert.equal(detail.cards.length, 1);
});
test("partial or retired pair gives no completion credit but retains owned identities", async () => {
  const h = harness({ exclusions: parents });
  const page = await h.page();
  const detail = await h.detail();
  assert.equal(page.overview.totalPrintCount, 0);
  assert.equal(page.overview.ownedPrintCount, 0);
  assert.equal(detail.cards.length, 2);
  assert.equal(detail.ownedCopyCount, 6);
  assert.equal(detail.variantOptionCount, 0);
});
for (const options of [{ error: { code: "57014", message: "timeout" } }, { exclusions: ["invalid"] }]) {
  test(`Dex page and detail reject unusable resolution (${JSON.stringify(options)})`, async () => {
    await assert.rejects(harness(options).page());
    await assert.rejects(harness(options).detail());
  });
}
test("exact missing discovery RPC retains pre-migration behavior", async () => {
  const h = harness({ error: { code: "PGRST202", message: "get_jungle_edition_discovery_exclusions_v1 missing" } });
  assert.equal((await h.page()).overview.totalPrintCount, 3);
  assert.equal((await h.detail()).totalPrintCount, 3);
});
