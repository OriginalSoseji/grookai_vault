import {
  createMarketplaceLinksHandler,
  resolveMarketplaceLinks,
} from "./handler.ts";

const parent = "6c7b9f97-d89d-5810-92f1-a88ebeedd239";
const printing = "00000921-8e14-58e1-bf8f-59cbe9986fd2";
function assert(value: unknown, message = "Assertion failed"): asserts value {
  if (!value) throw new Error(message);
}
function client(current: unknown[], snapshots: unknown[], fail = false) {
  const calls: { table: string; filters: Record<string, unknown> }[] = [];
  return {
    calls,
    from(table: string) {
      const call = { table, filters: {} as Record<string, unknown> };
      calls.push(call);
      const query = {
        select: (_: string) => query,
        eq: (name: string, value: unknown) => {
          call.filters[name] = value;
          return query;
        },
        limit: async (_: number) => ({
          data: table === "v_market_price_current_v1" ? current : snapshots,
          error: fail ? { message: "private DB detail" } : null,
        }),
      };
      return query;
    },
  };
}
function rows(finish: string, subtype: string) {
  return [[{
    card_print_id: parent,
    card_printing_id: printing,
    finish_key: finish,
    provenance_id: "qualified-provenance",
  }], [{
    source_product_id: 610758,
    source_subtype_name: subtype,
    source_name: "tcgplayer",
  }]];
}

Deno.test("all five conditions retain exact product, printing and English language without affiliate IDs", async () => {
  for (
    const [finish, subtype] of [["normal", "Normal"], ["holo", "Holofoil"], [
      "reverse",
      "Reverse Holofoil",
    ]]
  ) {
    const [current, snapshots] = rows(finish, subtype);
    const db = client(current, snapshots);
    const result = await resolveMarketplaceLinks(db, parent, printing);
    assert(result?.conditions.length === 5);
    assert(result.card_printing_id === printing);
    for (const condition of result.conditions) {
      const url = new URL(condition.url);
      assert(
        url.origin === "https://www.tcgplayer.com" &&
          url.pathname === "/product/610758",
      );
      assert(url.searchParams.get("Condition") === condition.label);
      assert(
        url.searchParams.get("Printing") === subtype &&
          url.searchParams.get("Language") === "English",
      );
      assert([...url.searchParams.keys()].length === 3);
    }
    assert(db.calls[1].filters.provenance_id === "qualified-provenance");
    assert(
      db.calls.every((call) =>
        call.filters.card_print_id === parent &&
        call.filters.card_printing_id === printing
      ),
    );
  }
});

Deno.test("missing, ambiguous, mismatched finish, non-TCGplayer or unsafe product IDs never become links", async () => {
  const [current, snapshots] = rows("holo", "Holofoil");
  for (
    const db of [
      client([], snapshots),
      client([...current, ...current], snapshots),
      client(current, []),
      client(current, [...snapshots, ...snapshots]),
      client(current, [{ ...snapshots[0], source_product_id: "610758" }]),
      client(current, [{ ...snapshots[0], source_product_id: -1 }]),
      client(current, [{ ...snapshots[0], source_name: "ebay" }]),
      client(current, [{ ...snapshots[0], source_subtype_name: "Normal" }]),
      client([{ ...current[0], finish_key: "cosmos_holo" }], snapshots),
    ]
  ) {
    assert(await resolveMarketplaceLinks(db, parent, printing) === null);
  }
});

Deno.test("handler validates bounded requests before using privileged reads and hides DB errors", async () => {
  let reads = 0;
  const handler = createMarketplaceLinksHandler(() => {
    reads++;
    return client([], [], true);
  });
  assert(
    (await handler(new Request("http://local", { method: "GET" }))).status ===
      405,
  );
  assert(
    (await handler(new Request("http://local", { method: "POST", body: "{" })))
      .status === 400,
  );
  assert(
    (await handler(
      new Request("http://local", {
        method: "POST",
        body: JSON.stringify({
          card_print_id: "guess",
          card_printing_id: printing,
        }),
      }),
    )).status === 400,
  );
  assert(
    (await handler(
      new Request("http://local", { method: "POST", body: "x".repeat(1025) }),
    )).status === 413,
  );
  assert(reads === 0);
  const response = await handler(
    new Request("http://local", {
      method: "POST",
      body: JSON.stringify({
        card_print_id: parent,
        card_printing_id: printing,
      }),
    }),
  );
  assert(
    response.status === 503 &&
      !(await response.text()).includes("private DB detail"),
  );
});
