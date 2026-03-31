import "dotenv/config";

const DEFAULT_BASE_URL = process.env.RESOLVER_BASE_URL ?? "http://127.0.0.1:3101";
const QUERIES = [
  "pika",
  "pikachu",
  "asc pika",
  "asc pikachu",
  "asc pikachu 55",
  "pika asc 55",
  "pikachu asc",
  "pikachu asc 055",
  "pikachu ex",
  "pikachu sv promo",
  "pikachu promo",
  "svp pikachu",
  "pikachu 25 svp",
  "pikachu sir",
  "charizard alt art",
  "mewtwo gold",
  "baby shiny pikachu",
  "pikachu felt hat",
  "pikachu stamp promo",
  "zard rainbow",
  "zard base",
  "mewtwo promo",
  "charizard",
  "greninja gold star",
  "charizard 4/102 base",
];

function parseArgs(argv) {
  const config = {
    baseUrl: DEFAULT_BASE_URL,
    queries: QUERIES,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") {
      config.baseUrl = argv[index + 1] ?? config.baseUrl;
      index += 1;
      continue;
    }

    if (arg === "--query") {
      const query = argv[index + 1];
      if (query) {
        config.queries = [query];
      }
      index += 1;
    }
  }

  return config;
}

async function fetchRanked(baseUrl, query) {
  const url = new URL("/api/resolver/search", baseUrl);
  url.searchParams.set("q", query);
  const response = await fetch(url, { redirect: "follow" });
  const json = await response.json();
  return {
    status: response.status,
    body: json,
  };
}

async function fetchDirect(baseUrl, query) {
  const url = new URL("/search", baseUrl);
  url.searchParams.set("q", query);
  const response = await fetch(url, { redirect: "manual" });
  return {
    status: response.status,
    location: response.headers.get("location"),
  };
}

async function run() {
  const { baseUrl, queries } = parseArgs(process.argv.slice(2));
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  const results = [];
  for (const query of queries) {
    const [ranked, direct] = await Promise.all([
      fetchRanked(normalizedBaseUrl, query),
      fetchDirect(normalizedBaseUrl, query),
    ]);

    const top = ranked.body?.rows?.[0] ?? null;
    results.push({
      query,
      direct: {
        status: direct.status,
        location: direct.location,
        autoResolved:
          typeof direct.location === "string" &&
          (direct.location.includes("/card/") || direct.location.includes("/sets/")),
      },
      ranked: {
        status: ranked.status,
        resolverState: ranked.body?.meta?.resolverState ?? null,
        topCandidate: top
          ? {
              gv_id: top.gv_id ?? null,
              name: top.name ?? null,
              set_code: top.set_code ?? null,
              printed_set_abbrev: top.printed_set_abbrev ?? null,
              number: top.number ?? null,
            }
          : null,
        score: ranked.body?.meta?.topScore ?? null,
        autoResolved: ranked.body?.meta?.autoResolved ?? false,
      },
    });
  }

  console.log(JSON.stringify({ baseUrl: normalizedBaseUrl, results }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
