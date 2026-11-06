import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const here = path.dirname(fileURLToPath(import.meta.url));
const webSrc = path.resolve(here, "../../apps/web/src");
const webRoot = path.resolve(webSrc, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(webSrc, relativePath), "utf8");
const nodeRequire = createRequire(import.meta.url);
const testRequire = (specifier) =>
  specifier === "server-only" ? {} : nodeRequire(specifier);

const loadTypeScriptModule = (relativePath, globals = {}) => {
  const source = read(relativePath);
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const testModule = { exports: {} };
  vm.runInNewContext(
    `(function (exports, module) { ${output}\n})(testModule.exports, testModule);`,
    {
      testModule,
      URL,
      Buffer,
      process,
      require: testRequire,
      ...globals,
    },
    { filename: relativePath },
  );
  return testModule.exports;
};

function binderReadModule() {
  return loadTypeScriptModule("lib/binders/rpc.ts", {
    require(specifier) {
      if (specifier === "server-only") return {};
      if (specifier === "@/lib/collectorStaging.mjs") return { collectorStaging: false };
      if (specifier === "./rpcContract") return loadTypeScriptModule("lib/binders/rpcContract.ts");
      if (specifier === "./publicSafety") return loadTypeScriptModule("lib/binders/publicSafety.ts");
      throw Error("Unexpected Binder read dependency: " + specifier);
    },
  });
}

function coverReadClient({ canEdit = true, role = "owner", page } = {}) {
  const calls = [];
  const client = { rpc: async (name, args) => {
    calls.push({ name, args });
    if (name === "binder_detail_v1") return { data: {
      binder: { public_id: "fixture-binder", target_kind: "custom", cover_card_print_id: "print-first" },
      viewer: { role }, permissions: { edit_metadata: canEdit },
    }, error: null };
    if (name === "binder_checklist_v1") return page(args, calls);
    throw Error("Unexpected role-scoped read: " + name);
  } };
  return { client, calls };
}

const coverRow = (id, title) => ({ card_print_id: id, title,
  subtitle: "Verified checklist artwork", hosted_image: true,
  image_url: "https://images.example.test/" + id + ".jpg", private_notes: "MUST NOT ENTER COVER OPTIONS" });

test("Settings loads complete cover choices after metadata authority, without management reads", async () => {
  const { getBinderDetail } = binderReadModule();
  const { client, calls } = coverReadClient({ page: async args => ({ data: {
    items: [args.p_after_position === null ? coverRow("print-first", "First card") : coverRow("print-second", "Second card")],
    next_position: args.p_after_position === null ? 50 : null,
  }, error: null }) });
  const detail = await getBinderDetail(client, "fixture-binder", { tab: "settings" });
  assert.deepEqual(calls.map(call => call.name), ["binder_detail_v1", "binder_checklist_v1", "binder_checklist_v1"]);
  assert.deepEqual(calls.slice(1).map(call => call.args.p_after_position), [null, 50]);
  assert.ok(calls.slice(1).every(call => call.args.p_filter === "all" && call.args.p_limit === 50));
  assert.deepEqual(detail.coverOptions.map(option => option.cardPrintId).join(","), "print-first,print-second");
  assert.equal(detail.coverOptionsUnavailable, false);
  assert.equal(detail.checklist.length, 0);
  assert.equal(detail.customEditorSlots.length, 0);
  assert.equal(JSON.stringify(detail.coverOptions).includes("private_notes"), false);
});

test("a non-editor's Settings read never fetches cover choices or owner editor data", async () => {
  const { getBinderDetail } = binderReadModule();
  const { client, calls } = coverReadClient({ canEdit: false, role: "contributor" });
  const detail = await getBinderDetail(client, "fixture-binder", { tab: "settings", includeCustomEditor: true });
  assert.equal(calls.length, 1);
  assert.equal(detail.coverOptions, undefined);
  assert.equal(detail.customEditorSlots.length, 0);
});

test("cover pagination failure retains the current cover and never presents a partial gallery as complete", async () => {
  const { getBinderDetail } = binderReadModule();
  const { client } = coverReadClient({ page: async args => args.p_after_position === null
    ? { data: { items: [coverRow("print-first", "First card")], next_position: 50 }, error: null }
    : { data: null, error: { code: "network", message: "unavailable" } } });
  const detail = await getBinderDetail(client, "fixture-binder", { tab: "settings" });
  assert.equal(detail.coverCardPrintId, "print-first");
  assert.equal(detail.coverOptionsUnavailable, true);
  assert.equal(detail.coverOptions.length, 0);
});

test("malformed and repeated cover cursors stop instead of truncating or looping", async () => {
  const { getBinderDetail } = binderReadModule();
  for (const cursor of ["50", -1, 1.5, 0]) {
    const { client, calls } = coverReadClient({ page: async () => ({
      data: { items: [coverRow("print-first", "First card")], next_position: cursor }, error: null,
    }) });
    const detail = await getBinderDetail(client, "fixture-binder", { tab: "settings" });
    assert.equal(detail.coverOptionsUnavailable, true);
    assert.equal(detail.coverOptions.length, 0);
    assert.ok(calls.length <= 3);
  }
});

test("the owner editor and cover gallery share one complete checklist read", async () => {
  const { getBinderDetail } = binderReadModule();
  const { client, calls } = coverReadClient({ page: async () => ({
    data: { items: [coverRow("print-first", "First card")], next_position: null }, error: null,
  }) });
  const detail = await getBinderDetail(client, "fixture-binder", { tab: "settings", includeCustomEditor: true });
  assert.equal(calls.filter(call => call.name === "binder_checklist_v1").length, 1);
  assert.equal(detail.coverOptions.length, 1);
  assert.equal(detail.customEditorSlots.length, 1);
});

