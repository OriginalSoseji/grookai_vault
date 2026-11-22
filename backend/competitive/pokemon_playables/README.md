# Pokémon playable usage

The backend computes recent Standard decklist usage for existing canonical cards. It does not certify each physical printing's tournament eligibility or modify cards, mappings, pricing or ownership.

## Signal

- Completed, published physical Standard decklists with publisher event dates within the rolling 30 days.
- At least three events / 20 lists overall; each positive gameplay identity appears in at least three lists across two events.
- Exact current provider/catalog bindings and retained source metadata. Identical structured mechanics share support across known artwork/rarity versions. Unknown coordinates remain unmatched.
- Coverage, attribution and a maximum 24-hour publication lifetime. Expired or unavailable output never becomes an unrestricted playable search.

The starting cohort contained 292 catalog members. Additional verified artwork versions can join the same retained metadata seed; coverage remains bounded rather than an exhaustive claim about the entire Pokémon catalog.

Current usage grouping records `pokemon_standard_usage_mechanics:v2`. It ignores TCGdex's artwork-only `cameoDexIds` alongside the established presentation exclusions. Attacks, abilities, rules, costs, types, HP and unrecognized fields still distinguish profiles. Retained source bodies and the legacy exact-profile comparison are preserved. A full-art, IR or SIR label alone never establishes matching mechanics or canonical ownership.

## Worker

```powershell
# Local build from retained verified input.
node backend/competitive/pokemon_playables/current_standard_cli.mjs --input <input.json> --directory <preview-directory>

# Bootstrap the private metadata seed once, then collect fresh events without local files.
node backend/competitive/pokemon_playables/current_standard_cli.mjs seed --input <current-input.json> --project-ref ycdxbpibncqcchqiihfz
node backend/competitive/pokemon_playables/current_standard_cli.mjs daily --project-ref ycdxbpibncqcchqiihfz
```

Workers use the existing shared backend Supabase client and verify the canonical project/counts before remote work. Fresh bindings replace any supplied catalog state. Source originals enter private `raw_imports` receipts; operational success, failure and backoff receipts are persisted. Publication uses immutable snapshots and an atomic private object at `standard-usage/current.json` in `pokemon-playables-private`. The previous complete publication is preserved on failure. The separate metadata seed is `standard-usage/refresh-seed.json`; it contains no positive flags. Existing artifact retention dates and the retention-plan/apply lifecycle remain binding.

The collector discovers up to three pages, checks at most 25 candidate events and uses at most 20 completed events per run. It bounds response sizes and request totals, respects per-origin spacing and provider rate headers, retries a 429 once and otherwise preserves the current output. Results/pairings do not contribute. Metadata nearing retention is actually fetched again; repository captures retain fixed commit/blob/license checks. An already expired seed requires fresh bootstrap input.

`pokemon-playables-refresh.yml` prepares attempts at 06:23 and 18:23 UTC. It requires the canonical Actions secrets `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. Hosted activation requires the reviewed workflow/dependencies on the default branch. Never upload source originals or credentials as public Actions artifacts.

## Web

The server reads private Storage and projects the public card IDs, support counts and freshness fields. `/api/playables` exposes that projection. The search parser recognizes `playable` / `playables` and `playable=1`, scopes canonical candidates before filters/ranking/paging and retains current complete-search semantics. Grid, list, table and card-detail views share the expiring Playable badge.

For development fixtures, `POKEMON_PLAYABLES_PREVIEW_DIRECTORY` may name an absolute local artifact directory. Production ignores that override and uses the server-only Storage reader. The service-role key and original source material never enter browser code.

## Verification

```powershell
node --test backend/competitive/pokemon_playables/test/current_standard_usage.test.mjs backend/competitive/pokemon_playables/test/current_standard_refresh.test.mjs
node --experimental-strip-types --test apps/web/src/lib/playables/*.test.*
npm --prefix apps/web run typecheck
```

Source access uses the documented public [Limitless tournament endpoints](https://docs.limitlesstcg.com/developer/tournaments) and the retained TCGdex API/repository metadata/license proofs. No provider categorization endpoint, private API access, public raw decklist archive or AI decision is required.
