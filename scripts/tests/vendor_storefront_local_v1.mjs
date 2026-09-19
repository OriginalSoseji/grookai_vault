// Synthetic integration proof only. Hard-pinned to the dedicated local cluster;
// no env-file loading, remote targets, shared database reset, or catalog repair.
import pg from "pg";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const local = path.join(root, ".local/storefront");
const expectedDirectory = path
  .join(local, "pgdata")
  .replaceAll("\\", "/")
  .toLowerCase();
const options = {
  host: "127.0.0.1",
  port: 15438,
  user: "storefront_test",
  connectionTimeoutMillis: 3000,
};
const control = new pg.Client({ ...options, database: "postgres" });
await control.connect();
assert.equal(
  (await control.query("show data_directory")).rows[0].data_directory
    .replaceAll("\\", "/")
    .toLowerCase(),
  expectedDirectory,
);
const database = `grookai_storefront_v1_${Date.now()}`;
await control.query(`create database ${database}`);
await control.end();
const client = new pg.Client({ ...options, database });
await client.connect();
const query = (sql, params = []) => client.query(sql, params);
const migration = fs.readFileSync(
  path.join(
    root,
    "supabase/migrations/20260918040000_vendor_storefronts_v1.sql",
  ),
  "utf8",
);
const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error: error.message });
    throw error;
  }
}
async function as(user, sql, params = [], role = "authenticated") {
  await query("begin");
  try {
    await query(`set local role ${role}`);
    await query(
      "select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true)",
      [user ?? "", role],
    );
    const response = await query(sql, params);
    await query("commit");
    return response;
  } catch (error) {
    await query("rollback");
    throw error;
  }
}
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const owner = id(1),
  other = id(2),
  visitor = id(3),
  newUser = id(4),
  section = id(20),
  card = id(30),
  printing = id(40),
  copy = id(50),
  sibling = id(51),
  privateCopy = id(52);
const read = async (surface = "web", user = null, filters = {}) =>
  (
    await as(
      user,
      "select public.vendor_store_read_v1($1,$2,$3,$4,$5,$6,$7,$8) as value",
      [
        "test-store",
        surface,
        filters.query ?? "",
        filters.section ?? null,
        filters.condition ?? null,
        filters.kind ?? "all",
        filters.offset ?? 0,
        filters.limit ?? 40,
      ],
      user ? "authenticated" : "anon",
    )
  ).rows[0].value;
let storeId;
try {
  await query(`
    do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
      if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
      if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if; end $$;
    create schema auth; create schema storage;
    grant usage on schema public,auth,storage to anon,authenticated,service_role;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;
    create table auth.users(id uuid primary key,email text,created_at timestamptz not null default now());
    create table public.user_entitlements(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users,email text,tier text,role text,features jsonb,is_active boolean default true);
    create table public.public_profiles(user_id uuid primary key references auth.users,slug text,display_name text,public_profile_enabled boolean,vault_sharing_enabled boolean);
    create table public.sets(id uuid primary key,game text);
    create table public.games(id uuid primary key,code text);
    create table public.catalog_game_release_controls(game_code text primary key,release_status text);
    create table public.card_prints(id uuid primary key,gv_id text,name text,set_code text,number text,set_id uuid references public.sets,game_id uuid,data_quality_flags jsonb default '{}',
      image_url text,image_alt_url text,image_source text,image_path text,representative_image_url text,image_status text,image_note text,variant_key text,printed_identity_modifier text,set_identity_model text);
    create table public.finish_keys(key text primary key,label text,sort_order integer,is_active boolean);
    create table public.card_printings(id uuid primary key,card_print_id uuid references public.card_prints,printing_gv_id text,finish_key text references public.finish_keys,
      image_source text,image_path text,image_url text,image_alt_url text,image_status text,image_note text);
    create table public.card_printing_truth_reviews(card_printing_id uuid references public.card_printings,active boolean,public_visibility text);
    create table public.slab_certs(id uuid primary key,card_print_id uuid references public.card_prints);
    create table public.vault_item_instances(id uuid primary key,user_id uuid references auth.users,gv_vi_id text,card_print_id uuid references public.card_prints,
      card_printing_id uuid references public.card_printings,slab_cert_id uuid references public.slab_certs,legacy_vault_item_id uuid,condition_label text,intent text,
      grade_company text,grade_value text,grade_label text,archived_at timestamptz,pricing_mode text,asking_price_amount numeric,asking_price_currency text);
    create table public.wall_sections(id uuid primary key,user_id uuid references auth.users,name text,position integer,is_active boolean);
    create table public.wall_section_memberships(section_id uuid references public.wall_sections,vault_item_instance_id uuid references public.vault_item_instances);
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant select,insert on storage.objects to authenticated;
  `);
  // Use the actual governed functions, including active quarantine and set controls.
  const gameSql = fs.readFileSync(
    path.join(
      root,
      "supabase/migrations/20260813200000_mtg_catalog_app_visibility_boundary_v1.sql",
    ),
    "utf8",
  );
  await query(
    gameSql.slice(
      gameSql.indexOf(
        "create or replace function public.catalog_game_visible_to_request_v1",
      ),
      gameSql.indexOf(
        "create or replace function public.catalog_card_print_visible_to_request_v1",
      ),
    ),
  );
  const catalogSql = fs.readFileSync(
    path.join(
      root,
      "supabase/migrations/20260828110000_catalog_set_release_controls_v1.sql",
    ),
    "utf8",
  );
  await query(
    catalogSql.slice(
      0,
      catalogSql.indexOf(
        "create or replace function public.search_game_card_prints_v3",
      ),
    ) + "\ncommit;",
  );
  const printingSql = fs.readFileSync(
    path.join(
      root,
      "supabase/migrations/20260804210000_public_card_printing_options_truth_boundary_v1.sql",
    ),
    "utf8",
  );
  await query(
    printingSql.slice(0, printingSql.indexOf("\ndo $$")) + "\ncommit;",
  );
  await check("additive migration applies to representative local schema", () =>
    query(migration),
  );
  await query(
    `insert into auth.users(id,email,created_at) values($1,'owner@fixture.invalid',now()-interval '1 year'),($2,'other@fixture.invalid',now()-interval '1 year'),($3,'visitor@fixture.invalid',now()-interval '1 year'),($4,'new@fixture.invalid',now());`,
    [owner, other, visitor, newUser],
  );
  await query(
    `insert into public.user_entitlements(user_id,tier,role,features) values($1,'vendor','vendor','{"store_app":true,"store_web":true}'),($2,'vendor','vendor','{"store_app":true,"store_web":false}');
  `,
    [owner, other],
  );
  await query(
    "insert into public.public_profiles values($1,$2,$3,true,true),($4,$5,$6,true,true)",
    [owner, "owner", "Owner", other, "other", "Other"],
  );
  await query("insert into public.sets values($1,$2)", [id(10), "pokemon"]);
  await query(
    `insert into public.card_prints(id,gv_id,name,set_code,number,set_id,image_status) values($1,'GV-PK-TEST-001','Fixture Pikachu','test','001',$2,'missing')`,
    [card, id(10)],
  );
  await query(`insert into public.finish_keys values('holo','Holo',1,true);`);
  await query(
    `insert into public.card_printings(id,card_print_id,printing_gv_id,finish_key) values($1,$2,'GV-PK-TEST-001-HOLO','holo')`,
    [printing, card],
  );
  for (const [n, intent] of [
    [50, "sell"],
    [51, "sell"],
    [52, "hold"],
    [53, "sell"],
  ])
    await query(
      `insert into public.vault_item_instances(id,user_id,gv_vi_id,card_print_id,card_printing_id,legacy_vault_item_id,condition_label,intent,pricing_mode,asking_price_amount,asking_price_currency)
    values($1,$2,$3,$4,$5,$6,'NM',$7,'asking',25,'USD')`,
      [
        id(n),
        n === 53 ? other : owner,
        `GVVI-FIXTURE-${String(n).padStart(6, "0")}`,
        card,
        printing,
        id(n + 100),
        intent,
      ],
    );
  await query(
    `insert into public.wall_sections values($1,$2,'Sale cards',0,true),($3,$4,'Other private name',0,true)`,
    [section, owner, id(21), other],
  );
  await query(
    "insert into public.wall_section_memberships values($1,$2),($1,$3)",
    [section, copy, privateCopy],
  );

  await check("rollout defaults off even for database grant", async () =>
    assert.rejects(
      as(
        owner,
        "select vendor_store_save_v1('test-store','Fixture Cards','A synthetic store')",
      ),
      /access unavailable/,
    ),
  );
  await query(
    "update public.vendor_store_rollout set app_enabled=true,web_enabled=true",
  );
  await check("create store is a private draft", async () => {
    const value = (
      await as(
        owner,
        "select vendor_store_save_v1('test-store','Fixture Cards','A synthetic store') as value",
      )
    ).rows[0].value;
    storeId = value.store.id;
    assert.equal(value.store.app_published, false);
    assert.equal(value.store.web_published, false);
    assert.equal(await read(), null);
  });
  await check(
    "another owner cannot read draft or select foreign copy/section",
    async () => {
      assert.equal(await read("preview", other), null);
      assert.equal(
        (await as(other, "select * from vendor_stores")).rowCount,
        0,
      );
      await as(other, "select vendor_store_save_v1('other-store','Other','')");
      await assert.rejects(
        as(other, "select vendor_store_select_item_v1($1,true)", [copy]),
        /no longer owned/,
      );
      await assert.rejects(
        as(owner, "select vendor_store_select_section_v1($1,true,0)", [id(21)]),
        /Section unavailable/,
      );
    },
  );
  await check(
    "anonymous cannot access base tables or mutation functions",
    async () => {
      await assert.rejects(
        as(null, "select * from vendor_stores", [], "anon"),
        /permission denied/,
      );
      await assert.rejects(
        as(null, "select vendor_store_save_v1('evil','Evil','')", [], "anon"),
        /permission denied/,
      );
      await assert.rejects(
        as(owner, "update vendor_stores set web_published=true"),
        /permission denied/,
      );
    },
  );
  await check(
    "section selection and price change do not select inventory",
    async () => {
      await as(owner, "select vendor_store_select_section_v1($1,true,0)", [
        section,
      ]);
      await query(
        "update vault_item_instances set asking_price_amount=30 where id=$1",
        [copy],
      );
      assert.equal((await read("preview", owner)).total, 0);
      await assert.rejects(
        as(owner, "select vendor_store_publish_v1('web',true)"),
        /Select eligible/,
      );
    },
  );
  await check(
    "private copies cannot be selected; owner sees reason",
    async () => {
      await assert.rejects(
        as(owner, "select vendor_store_select_item_v1($1,true)", [privateCopy]),
        /not for sale/,
      );
      const own = await read("manage", owner);
      assert.match(
        own.items.find((x) => x.id === privateCopy).ineligible_reason,
        /not for sale/,
      );
    },
  );
  await as(owner, "select vendor_store_select_item_v1($1,true)", [copy]);
  await as(owner, "select vendor_store_select_item_v1($1,true)", [sibling]);
  await check(
    "selection does not publish; explicit publish enables each surface",
    async () => {
      assert.equal(await read(), null);
      await as(owner, "select vendor_store_publish_v1('app',true)");
      assert.equal(await read(), null);
      assert.equal((await read("app", visitor)).total, 2);
      assert.equal(await read("app"), null);
      await as(owner, "select vendor_store_publish_v1('web',true)");
      assert.equal((await read()).total, 2);
    },
  );
  await check(
    "app/web parity preserves exact siblings, prices, IDs, and filters",
    async () => {
      assert.deepEqual(
        (await read()).items,
        (await read("app", visitor)).items,
      );
      assert.equal(
        new Set((await read()).items.map((x) => x.gv_vi_id)).size,
        2,
      );
      assert.equal((await read("web", null, { section })).total, 1);
      assert.equal((await read("web", null, { query: "GV-PK-TEST" })).total, 2);
      assert.equal(
        (await read("web", null, { query: "GV-PK-TEST-001-HOLO" })).total,
        2,
      );
      assert.equal((await read("web", null, { condition: "LP" })).total, 0);
      assert.equal((await read("web", null, { kind: "slab" })).total, 0);
      assert.equal(
        (await read("web", null, { limit: 1, offset: 1 })).items.length,
        1,
      );
    },
  );
  await check(
    "slug freezes at first publication and duplicate slug rejects",
    async () => {
      await assert.rejects(
        as(owner, "select vendor_store_save_v1('renamed','Fixture','')"),
        /cannot change/,
      );
      await assert.rejects(
        as(other, "select vendor_store_save_v1('test-store','Other','')"),
        /unique/,
      );
    },
  );
  await check(
    "reserved owner route slug is rejected; profile-style normalization is authoritative",
    async () => {
      await assert.rejects(
        as(other, "select vendor_store_save_v1('owner','Other','')"),
        /check constraint/,
      );
      await as(
        other,
        "select vendor_store_save_v1(' --Other__Store-- ','Other','')",
      );
      assert.equal(
        (await as(other, "select vendor_store_owner_v1() as data")).rows[0].data
          .store.slug,
        "other-store",
      );
    },
  );
  await check(
    "wrong-parent printing, missing printing identity and missing parent identity stay excluded",
    async () => {
      await query(
        "insert into card_prints(id,gv_id,name) values($1,'GV-OTHER','Other parent')",
        [id(31)],
      );
      await query("update card_printings set card_print_id=$1 where id=$2", [
        id(31),
        printing,
      ]);
      assert.equal((await read()).total, 0);
      await query(
        "update card_printings set card_print_id=$1,printing_gv_id=null where id=$2",
        [card, printing],
      );
      assert.equal((await read()).total, 0);
      await query(
        "update card_printings set printing_gv_id='GV-PK-TEST-001-HOLO' where id=$1",
        [printing],
      );
      await query("update card_prints set gv_id=null where id=$1", [card]);
      assert.equal((await read()).total, 0);
      await query("update card_prints set gv_id='GV-PK-TEST-001' where id=$1", [
        card,
      ]);
      assert.equal((await read()).total, 2);
    },
  );
  for (const [name, change, restore] of [
    ["private intent", "intent='hold'", "intent='sell'"],
    ["zero price", "asking_price_amount=0", "asking_price_amount=30"],
    ["archived", "archived_at=now()", "archived_at=null"],
    ["transfer", `user_id='${other}'`, `user_id='${owner}'`],
    ["unassigned", "card_printing_id=null", `card_printing_id='${printing}'`],
  ])
    await check(
      `${name} is removed immediately, without changing membership`,
      async () => {
        await query(`update vault_item_instances set ${change} where id=$1`, [
          copy,
        ]);
        assert.equal((await read()).total, 1);
        await query(`update vault_item_instances set ${restore} where id=$1`, [
          copy,
        ]);
        assert.equal((await read()).total, 2);
      },
    );
  await check(
    "public profile privacy removes store and preview eligible items",
    async () => {
      await query(
        "update public_profiles set vault_sharing_enabled=false where user_id=$1",
        [owner],
      );
      assert.equal(await read(), null);
      assert.equal((await read("preview", owner)).total, 0);
      await query(
        "update public_profiles set vault_sharing_enabled=true where user_id=$1",
        [owner],
      );
    },
  );
  await check(
    "active quarantine and inactive finish cannot publish",
    async () => {
      await query(
        "insert into card_printing_truth_reviews values($1,true,'hidden_pending_review')",
        [printing],
      );
      assert.equal((await read()).total, 0);
      await query("delete from card_printing_truth_reviews");
      await query("update finish_keys set is_active=false");
      assert.equal((await read()).total, 0);
      await query("update finish_keys set is_active=true");
    },
  );
  await check("canonical suppression is respected", async () => {
    await query(
      `update card_prints set data_quality_flags='{"app_visibility_v1":{"status":"suppressed"}}'`,
    );
    assert.equal((await read()).total, 0);
    await query("update card_prints set data_quality_flags='{}'");
  });
  await check(
    "app, web and owner preview all exclude signed-in-only set releases",
    async () => {
      await query(
        "insert into catalog_set_release_controls(set_id,release_status,release_version) values($1,'signed_in','fixture')",
        [id(10)],
      );
      assert.equal((await read()).total, 0);
      assert.equal((await read("app", visitor)).total, 0);
      assert.equal((await read("preview", owner)).total, 0);
      await query("delete from catalog_set_release_controls");
    },
  );
  await check(
    "non-Pokemon game releases require public status equally on app and web",
    async () => {
      await query("update sets set game='mtg'");
      await query(
        "insert into catalog_game_release_controls values('mtg','signed_in')",
      );
      assert.equal((await read()).total, 0);
      assert.equal((await read("app", visitor)).total, 0);
      await query(
        "update catalog_game_release_controls set release_status='public'",
      );
      assert.equal((await read()).total, 2);
      assert.deepEqual(
        (await read()).items,
        (await read("app", visitor)).items,
      );
      await query("update sets set game='pokemon'");
      await query("delete from catalog_game_release_controls");
    },
  );
  await check(
    "$50 to $30 downgrade suspends web; upgrade does not republish",
    async () => {
      await query(
        `update user_entitlements set features='{"store_app":true,"store_web":false}' where user_id=$1`,
        [owner],
      );
      assert.equal(await read(), null);
      assert.equal((await read("app", visitor)).total, 2);
      await assert.rejects(
        as(owner, "select vendor_store_publish_v1('web',true)"),
        /Package/,
      );
      await query(
        `update user_entitlements set features='{"store_app":true,"store_web":true}' where user_id=$1`,
        [owner],
      );
      assert.equal(await read(), null);
      await as(owner, "select vendor_store_publish_v1('web',true)");
    },
  );
  await check(
    "loss of all grants preserves owner preview and unpublish",
    async () => {
      await query(
        "update user_entitlements set is_active=false where user_id=$1",
        [owner],
      );
      assert.equal(await read(), null);
      assert.equal((await read("preview", owner)).total, 2);
      await as(owner, "select vendor_store_publish_v1('app',false)");
      await assert.rejects(
        as(owner, "select vendor_store_save_v1('test-store','Denied','')"),
        /access unavailable/,
      );
      await query(
        "update user_entitlements set is_active=true where user_id=$1",
        [owner],
      );
      assert.equal(await read(), null);
      await as(owner, "select vendor_store_publish_v1('web',true)");
      await as(owner, "select vendor_store_publish_v1('app',true)");
    },
  );
  await check(
    "private media paths require store owner and uploaded object",
    async () => {
      const media = `${storeId}/logo/${id(90)}.png`;
      await assert.rejects(
        as(other, "insert into storage.objects(bucket_id,name) values($1,$2)", [
          "vendor-store-media",
          media,
        ]),
        /row-level security/,
      );
      await as(
        owner,
        "insert into storage.objects(bucket_id,name) values($1,$2)",
        ["vendor-store-media", media],
      );
      await as(owner, "select vendor_store_set_media_v1('logo',$1)", [media]);
      await assert.rejects(
        as(other, "select vendor_store_set_media_v1('logo',$1)", [media]),
        /Media unavailable/,
      );
      assert.equal(
        (await as(other, "select * from storage.objects")).rowCount,
        0,
      );
      await assert.rejects(
        as(null, "select * from storage.objects", [], "anon"),
        /permission denied/,
      );
      await as(owner, "select vendor_store_set_media_v1('logo',null)");
    },
  );
  await check(
    "clients cannot invoke signup-credit RPC or ledger writes",
    async () => {
      await assert.rejects(
        as(
          owner,
          "select vendor_referral_credit_v1($1,$2,null,now(),now()+interval '1 day')",
          [newUser, storeId],
        ),
        /permission denied/,
      );
      await assert.rejects(
        as(owner, "select * from vendor_referral_signups"),
        /permission denied/,
      );
    },
  );
  const creditSql =
    "select vendor_referral_credit_v1($1,$2,null,now()-interval '1 hour',now()+interval '1 day') as result";
  await check(
    "old account, self-referral, expired context cannot earn credit",
    async () => {
      assert.equal(
        (await query(creditSql, [visitor, storeId])).rows[0].result,
        "not_new_account",
      );
      await query("update auth.users set created_at=now() where id=$1", [
        owner,
      ]);
      assert.equal(
        (await query(creditSql, [owner, storeId])).rows[0].result,
        "self_referral_blocked",
      );
      assert.equal(
        (
          await query(
            "select vendor_referral_credit_v1($1,$2,null,now()-interval '2 day',now()-interval '1 day') as result",
            [newUser, storeId],
          )
        ).rows[0].result,
        "invalid_context",
      );
    },
  );
  await check(
    "concurrent verified callbacks credit actual signup exactly once",
    async () => {
      const calls = Array.from({ length: 8 }, async () => {
        const concurrent = new pg.Client({ ...options, database });
        await concurrent.connect();
        try {
          return (await concurrent.query(creditSql, [newUser, storeId])).rows[0]
            .result;
        } finally {
          await concurrent.end();
        }
      });
      const values = await Promise.all(calls);
      assert.equal(values.filter((x) => x === "credited").length, 1);
      assert.equal(values.filter((x) => x === "already_credited").length, 7);
      assert.equal(
        (await query("select * from vendor_referral_signups")).rowCount,
        1,
      );
    },
  );
  await check(
    "runtime kill switch prevents public access without changing inventory",
    async () => {
      await query("update vendor_store_rollout set web_enabled=false");
      assert.equal(await read(), null);
      assert.equal(
        (await query("select * from vault_item_instances")).rowCount,
        4,
      );
      await query("update vendor_store_rollout set web_enabled=true");
    },
  );
  await check("negative query limits fail closed", async () => {
    await assert.rejects(
      read("web", null, { limit: 101 }),
      /Invalid store query/,
    );
    await assert.rejects(
      read("web", null, { offset: -1 }),
      /Invalid store query/,
    );
  });
  await check(
    "presentation foreign keys do not prevent governed hard deletion",
    async () => {
      await query("begin");
      try {
        await query("delete from vault_item_instances where id=$1", [sibling]);
        assert.equal(
          (
            await query(
              "select * from vendor_store_items where instance_id=$1",
              [sibling],
            )
          ).rowCount,
          0,
        );
        await query("delete from vendor_stores where id=$1", [storeId]);
        assert.equal(
          (await query("select * from vendor_referral_signups")).rowCount,
          0,
        );
      } finally {
        await query("rollback");
      }
    },
  );
} finally {
  const receipt = {
    baseline: "a14388f689235d62b3165c1dd88aaa4c562ab186",
    database,
    host: options.host,
    port: options.port,
    proof:
      "Representative synthetic PostgreSQL integration; not full Supabase migration-chain replay or production parity",
    results,
    fixture: { owner, other, visitor, newUser, storeId, slug: "test-store" },
    createdAt: new Date().toISOString(),
  };
  fs.mkdirSync(local, { recursive: true });
  fs.writeFileSync(
    path.join(local, `${database}.json`),
    JSON.stringify(receipt, null, 2),
  );
  fs.writeFileSync(
    path.join(local, "latest.json"),
    JSON.stringify(receipt, null, 2),
  );
  await client.end();
}
