// Dedicated synthetic cluster only. Importing preserves and reruns the V1 proof.
import "./vendor_storefront_local_v1.mjs";
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const local = path.join(root, ".local/storefront");
const baseline = JSON.parse(fs.readFileSync(path.join(local, "latest.json")));
const options = {
  host: "127.0.0.1",
  port: 15438,
  user: "storefront_test",
  database: baseline.database,
  connectionTimeoutMillis: 3000,
};
const client = new pg.Client(options);
await client.connect();
assert.equal(
  (await client.query("show data_directory")).rows[0].data_directory
    .replaceAll("\\", "/")
    .toLowerCase(),
  path.join(local, "pgdata").replaceAll("\\", "/").toLowerCase(),
);
const q = (s, p = []) => client.query(s, p),
  id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const { owner, other, visitor, storeId } = baseline.fixture;
async function as(user, sql, params = [], connection = client) {
  await connection.query("begin");
  try {
    await connection.query(`set local role ${user ? "authenticated" : "anon"}`);
    await connection.query(
      "select set_config('request.jwt.claim.sub',$1,true)",
      [user ?? ""],
    );
    const r = await connection.query(sql, params);
    await connection.query("commit");
    return r.rows[0]?.value;
  } catch (e) {
    await connection.query("rollback");
    throw e;
  }
}
const read = (
  surface = "web",
  user = null,
  kind = "all",
  offset = 0,
  limit = 40,
  section = null,
  query = "",
) =>
  as(user, "select vendor_store_read_v2($1,$2,$3,$4,null,$5,$6,$7) value", [
    "test-store",
    surface,
    query,
    section,
    kind,
    offset,
    limit,
  ]);
const detail = (pid, user = null, surface = "web") =>
  as(user, "select vendor_store_custom_detail_v1($1,$2,$3) value", [
    "test-store",
    pid,
    surface,
  ]);
const mutate = async (
  p,
  action,
  data = {},
  user = owner,
  connection = client,
) =>
  (
    await as(
      user,
      "select vendor_store_custom_mutate_v1($1,$2,$3,$4) value",
      [p?.id ?? null, p?.version ?? null, action, data],
      connection,
    )
  ).products[0];
const results = [];
let product;
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log("PASS " + name);
  } catch (e) {
    results.push({ name, passed: false, error: e.message });
    throw e;
  }
}
const catalogSnapshot = async () =>
  JSON.stringify(
    (
      await q(
        "select jsonb_build_object('cards',(select jsonb_agg(t order by id) from card_prints t),'printings',(select jsonb_agg(t order by id) from card_printings t),'vault',(select jsonb_agg(t order by id) from vault_item_instances t),'wall',(select jsonb_agg(t) from wall_section_memberships t)) value",
      )
    ).rows[0].value,
  );
const original = await catalogSnapshot();
try {
  await check(
    "additive custom migration applies with rollout disabled",
    async () => {
      await q(
        fs.readFileSync(
          path.join(
            root,
            "supabase/migrations/20260918070000_vendor_custom_collectibles_v1.sql",
          ),
          "utf8",
        ),
      );
      await q(fs.readFileSync(path.join(root, "supabase/migrations/20260918100000_vendor_custom_collectible_conflict_status_v1.sql"), "utf8"));
      await assert.rejects(
        mutate(null, "save", { title: "No rollout" }),
        /access unavailable/,
      );
      await q("update vendor_store_rollout set custom_enabled=true");
    },
  );
  await check(
    "incomplete draft retains stable UUID and is never public",
    async () => {
      product = await mutate(null, "save", {
        title: "Imported Pikachu figure",
        private_sku: "SECRET-SKU",
      });
      assert.equal(product.published, false);
      assert.equal(await detail(product.id), null);
      await assert.rejects(mutate(product, "publish"), /description/);
      assert.equal(
        (await detail(product.id, owner, "preview")).product.title,
        product.title,
      );
      assert.equal(await detail(product.id, other, "preview"), null);
    },
  );
  await check("owner isolation and base-table writes fail closed", async () => {
    await assert.rejects(
      mutate(product, "save", { title: "Attack" }, other),
      /unavailable/,
    );
    assert.equal(
      (
        await as(other, "select vendor_store_custom_owner_v1($1) value", [
          product.id,
        ])
      ).products.length,
      0,
    );
    await assert.rejects(
      as(null, "select * from vendor_store_custom_products"),
      /permission denied/,
    );
    await assert.rejects(
      as(owner, "update vendor_store_custom_products set published=true"),
      /permission denied/,
    );
  });
  await check(
    "invalid numeric, canonical, currency and text fields reject atomically",
    async () => {
      for (const data of [
        { available_quantity: -1 },
        { available_quantity: 1.5 },
        { available_quantity: 1000001 },
        { available_quantity: "2" },
        { asking_price_amount: -1 },
        { asking_price_amount: 1.001 },
        { asking_price_amount: "NaN" },
        { asking_price_currency: "EUR" },
        { gv_vi_id: "fabricated" },
        { card_print_id: id(30) },
        { title: "a".repeat(121) },
        { description: [] },
      ])
        await assert.rejects(mutate(product, "save", data));
      product = await mutate(product, "save", {
        description: "Vendor-described figure from Japan.",
        asking_price_amount: 35.5,
        available_quantity: 3,
        category: "Figure",
        franchise: "Pokémon",
        manufacturer: "Seller claim",
        release_region: "Japan",
      });
      assert.equal(product.published, false);
      await assert.rejects(mutate(product, "publish"), /photo/);
    },
  );
  const photo = `${storeId}/products/${product.id}/${id(91)}.png`,
    photo2 = `${storeId}/products/${product.id}/${id(92)}.png`;
  await check(
    "photo scope, private access and supported paths are governed",
    async () => {
      for (const bad of [
        photo.replace(storeId, id(99)),
        photo.replace(product.id, id(99)),
        photo.replace(".png", ".svg"),
      ])
        assert.equal(
          await as(
            owner,
            "select vendor_store_custom_media_owned_v1($1) value",
            [bad],
          ),
          false,
        );
      assert.equal(
        await as(other, "select vendor_store_custom_media_owned_v1($1) value", [
          photo,
        ]),
        false,
      );
      await assert.rejects(
        mutate(product, "photos", { paths: [photo] }),
        /Photo unavailable/,
      );
      for (const p of [photo, photo2])
        await as(
          owner,
          "insert into storage.objects(bucket_id,name) values('vendor-store-media',$1)",
          [p],
        );
      product = await mutate(product, "photos", { paths: [photo, photo2] });
      assert.equal(product.published, false);
      product = await mutate(product, "photos", { paths: [photo2, photo] });
      assert.deepEqual(product.photo_paths, [photo2, photo]);
      await assert.rejects(
        mutate(product, "photos", { paths: [photo, photo] }),
      );
    },
  );
  await check(
    "sections are explicit and reject unrelated sections",
    async () => {
      await assert.rejects(
        mutate(product, "sections", { section_ids: [id(21)] }),
        /Section unavailable/,
      );
      product = await mutate(product, "sections", { section_ids: [id(20)] });
      assert.equal(product.published, false);
      assert.equal((await read()).total, 2);
    },
  );
  await check(
    "explicit publish exposes only presentation fields and preserves exact copies",
    async () => {
      product = await mutate(product, "publish");
      const data = await read();
      assert.equal(data.schema_version, "VENDOR_STORE_V2");
      assert.equal(data.total, 3);
      assert.equal(
        data.items.filter((x) => x.entry_type === "catalog_copy").length,
        2,
      );
      const custom = data.items.find((x) => x.entry_type === "custom_product");
      assert.equal(custom.id, product.id);
      assert.equal(custom.available_quantity, 3);
      for (const key of [
        "private_sku",
        "owner_id",
        "store_id",
        "version",
        "photo_paths",
        "gv_vi_id",
        "card_print_id",
        "published",
      ])
        assert.equal(key in custom, false, key);
      assert(!JSON.stringify(data).includes("SECRET-SKU"));
      assert.deepEqual((await detail(product.id)).product, custom);
    },
  );
  await check(
    "mixed filters, pagination, sections and app/web parity are deterministic",
    async () => {
      assert.deepEqual(
        (await read("app", visitor)).items,
        (await read()).items,
      );
      assert.equal((await read("web", null, "custom")).total, 1);
      assert.equal((await read("web", null, "catalog")).total, 2);
      assert.equal(
        (await read("web", null, "all", 0, 40, null, "Pikachu")).items.some(
          (x) => x.id === product.id,
        ),
        true,
      );
      const all = await read();
      const pages = [];
      for (let i = 0; i < all.total; i++)
        pages.push(...(await read("web", null, "all", i, 1)).items);
      assert.deepEqual(pages, all.items);
      assert(
        (await read("web", null, "all", 0, 40, id(20))).items.some(
          (x) => x.id === product.id,
        ),
      );
      await assert.rejects(read("web", null, "all", 0, 101));
    },
  );
  await check(
    "concurrent quantity saves succeed once and reject stale versions",
    async () => {
      const c2 = new pg.Client(options);
      await c2.connect();
      try {
        const attempts = await Promise.allSettled([
          mutate(product, "save", { available_quantity: 4 }),
          mutate(product, "save", { available_quantity: 5 }, owner, c2),
        ]);
        assert.equal(
          attempts.filter((x) => x.status === "fulfilled").length,
          1,
        );
        assert.equal(
          attempts.find((x) => x.status === "rejected").reason.code,
          "PT409",
        );
        product = attempts.find((x) => x.status === "fulfilled").value;
      } finally {
        await c2.end();
      }
    },
  );
  await check(
    "zero stock suspends, replenishment and edits never republish",
    async () => {
      product = await mutate(product, "save", { available_quantity: 0 });
      assert.equal(await detail(product.id), null);
      product = await mutate(product, "save", { available_quantity: 7 });
      assert.equal(product.published, false);
      assert.equal((await read()).total, 2);
      product = await mutate(product, "publish");
      product = await mutate(product, "unpublish");
      product = await mutate(product, "save", { asking_price_amount: 40 });
      assert.equal(product.published, false);
      product = await mutate(product, "publish");
      product = await mutate(product, "photos", { paths: [] });
      assert.equal(await detail(product.id), null);
      product = await mutate(product, "photos", { paths: [photo] });
      assert.equal(product.published, false);
      product = await mutate(product, "publish");
    },
  );
  await check(
    "privacy and rollout remove custom data on the next read",
    async () => {
      await q(
        "update public_profiles set vault_sharing_enabled=false where user_id=$1",
        [owner],
      );
      assert.equal(await detail(product.id), null);
      assert.equal(await read(), null);
      await q(
        "update public_profiles set vault_sharing_enabled=true where user_id=$1",
        [owner],
      );
      await q("update vendor_store_rollout set custom_enabled=false");
      assert.equal(await detail(product.id), null);
      assert.equal((await read()).total, 2);
      await assert.rejects(
        mutate(product, "save", { title: "No access" }),
        /access unavailable/,
      );
      await q("update vendor_store_rollout set custom_enabled=true");
    },
  );
  await check(
    "downgrade and re-upgrade require explicit store and product republishing",
    async () => {
      await q("update user_entitlements set is_active=false where user_id=$1", [
        owner,
      ]);
      assert.equal(await read(), null);
      product = (
        await as(owner, "select vendor_store_custom_owner_v1($1) value", [
          product.id,
        ])
      ).products[0];
      assert.equal(product.published, false);
      assert.equal(product.suspension_reason, "Store access suspended");
      await assert.rejects(
        mutate(product, "save", { available_quantity: 10 }),
        /access unavailable/,
      );
      assert.equal(
        (await detail(product.id, owner, "preview")).product.id,
        product.id,
      );
      await q("update user_entitlements set is_active=true where user_id=$1", [
        owner,
      ]);
      assert.equal(await read(), null);
      for (const surface of ["app", "web"])
        await as(owner, "select vendor_store_publish_v1($1,true) value", [
          surface,
        ]);
      assert.equal(await detail(product.id), null);
      product = await mutate(product, "publish");
    },
  );
  await check(
    "custom-only store publication works and archive retains history",
    async () => {
      await q("begin");
      try {
        await q("delete from vendor_store_items where store_id=$1", [storeId]);
        // Same role within existing transaction, then rollback synthetic selection change.
        await q("set local role authenticated");
        await q("select set_config('request.jwt.claim.sub',$1,true)", [owner]);
        await q("select vendor_store_publish_v1('web',true)");
      } finally {
        await q("rollback");
      }
      const archived = await mutate(null, "save", { title: "Retained draft" });
      const result = await mutate(archived, "archive");
      assert(result.archived_at);
      assert.equal(result.published, false);
      assert(
        (
          await q(
            "select count(*) n from vendor_store_custom_product_events where product_id=$1",
            [archived.id],
          )
        ).rows[0].n >= 3,
      );
      await assert.rejects(
        mutate(result, "save", { title: "Restored" }),
        /archived/,
      );
    },
  );

  await check(
    "V2 retains exact-copy quarantine, transfer and printing boundaries",
    async () => {
      await q(
        "insert into card_printing_truth_reviews values($1,true,'hidden_pending_review')",
        [id(40)],
      );
      assert.equal((await read()).total, 1);
      assert.equal(
        (await read("app", visitor)).items[0].entry_type,
        "custom_product",
      );
      await q("delete from card_printing_truth_reviews");
      await q(
        "update vault_item_instances set card_printing_id=null where id=$1",
        [id(50)],
      );
      assert.equal((await read()).total, 2);
      await q(
        "update vault_item_instances set card_printing_id=$1 where id=$2",
        [id(40), id(50)],
      );
      await q("update vault_item_instances set user_id=$1 where id=$2", [
        other,
        id(50),
      ]);
      assert.equal((await read()).total, 2);
      await q("update vault_item_instances set user_id=$1 where id=$2", [
        owner,
        id(50),
      ]);
    },
  );
  await check(
    "app-only grant keeps custom app access; forged web audience and re-upgrade fail closed",
    async () => {
      await q("update user_entitlements set features=$1 where user_id=$2", [
        { store_app: true, store_web: false },
        owner,
      ]);
      assert.equal(await detail(product.id), null);
      assert.equal(
        (await detail(product.id, visitor, "app")).product.id,
        product.id,
      );
      assert.equal(await detail(product.id, null, "app"), null);
      await assert.rejects(
        as(owner, "select vendor_store_publish_v1('web',true) value"),
        /Package/,
      );
      await q("update user_entitlements set features=$1 where user_id=$2", [
        { store_app: true, store_web: true },
        owner,
      ]);
      assert.equal(await detail(product.id), null);
      await as(owner, "select vendor_store_publish_v1('web',true) value");
      assert.equal((await detail(product.id)).product.id, product.id);
    },
  );
  await check(
    "missing profile identity hides detail, media authority and mixed rows equally",
    async () => {
      await q("update public_profiles set slug='' where user_id=$1", [owner]);
      assert.equal(await detail(product.id), null);
      assert.equal((await read("web", null, "custom")).total, 0);
      await q("update public_profiles set slug='owner' where user_id=$1", [
        owner,
      ]);
    },
  );
  await check(
    "foreign product photos and cross-store section relationships reject",
    async () => {
      const foreign = await mutate(
        null,
        "save",
        { title: "Other vendor" },
        other,
      );
      const foreignStore = (
        await q(
          "select store_id from vendor_store_custom_products where id=$1",
          [foreign.id],
        )
      ).rows[0].store_id;
      const foreignPhoto =
        foreignStore + "/products/" + foreign.id + "/" + id(98) + ".png";
      await as(
        other,
        "insert into storage.objects(bucket_id,name) values('vendor-store-media',$1)",
        [foreignPhoto],
      );
      await assert.rejects(
        mutate(product, "photos", { paths: [foreignPhoto] }),
        /Photo unavailable/,
      );
      await assert.rejects(
        mutate(foreign, "sections", { section_ids: [id(20)] }, other),
        /Section unavailable/,
      );
      const sameStoreDraft = await mutate(null, "save", {
        title: "Other product",
      });
      await assert.rejects(
        mutate(sameStoreDraft, "photos", { paths: product.photo_paths }),
        /Photo unavailable/,
      );
    },
  );
  await check(
    "canonical records, Vault copies and Wall memberships are unchanged",
    async () => assert.equal(await catalogSnapshot(), original),
  );
} finally {
  const receipt = {
    ...baseline,
    proof:
      "Synthetic PostgreSQL custom extension; not full Supabase Auth/Storage or migration replay",
    customResults: results,
    fixture: { ...baseline.fixture, productId: product?.id },
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(local, "custom-latest.json"),
    JSON.stringify(receipt, null, 2),
  );
  await client.end();
}
