# Collectible Shadow Automation Status V2

## Status

`NO_WRITE_AUTOMATION_ACTIVE_WITH_SOURCE_AND_PARSER_GAPS`

This is the current background-catalog truth. It does not authorize canonical,
database, Storage, image-pointer, pricing, publication, or Vault writes.

## Core Catalog Automation

| Workflow | Cadence | Latest proof | Current result |
|---|---|---|---|
| Universal Catalog Discovery | every 6 hours | `33279433944` | success, degraded one source |
| Catalog Shadow Reconciliation | every 6 hours | `33275641165` | success, zero promotion candidates |
| Pokemon Master Index Refresh | daily | `33265698781` | success with quarantined source anomalies |
| MTG Catalog Supervisor | every 15 minutes | `33275454924` | 945/945 eligible sets complete, no dispatch |
| Collectible Shadow Adapter Probes | daily | `33280393291` | 11/16 healthy; five source constraints preserved |
| Collectible Shadow Parser Wave 1 | daily | `33280394160` | 46,302 candidates, zero validation failures, one review source |

## Fresh Discovery Truth

Run `33279433944` used exact SHA
`8457d8281fb7465b496837831b30adfd45fa69cd` and reported:

- `1,055` source sets;
- `85` source requests;
- `0` actionable canonical gaps;
- `0` canonical promotion candidates;
- `141,326` Pokemon language candidates across `18` language scopes;
- `3` Japanese Master Index update candidates;
- `312` recent Japanese cards scanned with zero missing recent cards;
- one unavailable lane: TCGdex English Pokemon.

The TCGdex lane timed out independently during a direct retry. Its prior
baseline is preserved; the worker did not convert source unavailability into a
false catalog gap.

## Current Game Reconciliation

The discovery projection is source and database reconciliation evidence, not a
claim that every source set is launch-visible.

| Game | Source sets | Exact complete | Present unverified | Other governed states |
|---|---:|---:|---:|---|
| MTG | 988 | 23 | 923 | 33 no eligible cards, 9 future |
| One Piece | 61 | 11 | 3 | 45 source behind, 2 ambiguous |
| Pokemon discovery scope | 6 | 3 | 3 | none |

Separately, MTG supervisor run `33275454924` reports all `945` eligible released
sets complete for signed-in use, with `7` future sets deferred and zero writer
dispatches.

The cross-TCG publication gate in run `33275641165` passed:

- `1,007` selected released sets;
- `1,006` eligible;
- `0` blocked;
- `1` MTG media coverage gap;
- `137` exact package covers;
- `870` representative-card covers;
- `0` unresolved media rows;
- `0` reconciliation mismatches.

## Expanded Collectible Coverage

The registry contains `20` adapters:

- `14` TCG card adapters;
- `1` vinyl figure adapter;
- `1` die-cast vehicle adapter;
- `3` sports-card adapters;
- `1` comics adapter.

Run `33280393291` used exact SHA
`3edc990157a5b454f26868226e08790d478c55c0` and proved eleven healthy official
probes. Three failed endpoints were changed to current official roots:

- Cardfight Vanguard: `/cardlist/`;
- Weiss Schwarz: `/cardlist/`;
- Funko: `/search/`.

The live proof cleared Funko. Vanguard and Weiss still returned identical HTTP
500 responses from the GitHub runner even though the official pages are current
and locally reachable. Five source constraints therefore remain visible:

- Flesh and Blood official gallery: HTTP 403;
- Cardfight Vanguard official card list: HTTP 500 from the GitHub runner;
- Weiss Schwarz official card list: HTTP 500 from the GitHub runner;
- Topps official checklist: HTTP 403;
- Panini official checklist: HTTP 403.

Comics remains intentionally blocked until a licensed cross-publisher source
exists. Hot Wheels and Upper Deck probes are healthy. Yu-Gi-Oh and Gundam are
the only expanded adapters with active typed parsers today.

## Parser Automation Change

Wave 1 parsing now runs daily at `08:03 UTC` after the daily source probes. Live
run `33280394160` used exact SHA
`3edc990157a5b454f26868226e08790d478c55c0` and produced:

- `46,302` candidates;
- `0` validation failures;
- `2/2` sources parsed;
- `1` source requiring review;
- Yu-Gi-Oh: `44,486` printing candidates with `124` unresolved alternative-art
  mappings;
- Gundam: `1,816` candidates with manifest and payload counts reconciled.

The worker remains secret-free and has no database, Storage, image-download, or
writer capability. Every manifest-listed artifact hash matched local readback.
The GitHub artifact archive digest is
`sha256:cef3fe10d3e990264fd611c7c54eddd3d76abb3bab23ad832e0d6ca151ee1740`.
Any source drift creates review evidence and cannot promote identity.

## Current Boundaries

- Candidate indexes are evidence only.
- All canonical promotion remains separately governed.
- No workflow in this checkpoint may write production data.
- Missing sources remain visible failures; no rows are invented.
- Image and text rights are not inferred from endpoint availability.

## Exact Next Gate

Keep the daily no-write schedules active and alert on source-health regression.
Add typed parsers one governed source at a time; do not retry source-blocked
sites aggressively or substitute unlicensed data. Flesh and Blood, Vanguard,
Weiss, Topps, Panini, comics, and the twelve registered adapters that do not yet
have typed parsers remain backlog. They do not block the Pokemon, MTG, or One
Piece launch catalogs.
