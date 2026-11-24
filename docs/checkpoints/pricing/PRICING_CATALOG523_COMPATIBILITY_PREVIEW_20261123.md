# Retained pricing: catalog523 source integration preview

November 23, 2026 (America/Denver). Prepared while the shared release hold remains
active. This is a separate preview; final accepted-source qualification is pending.

## Source and behavior

Merge the proposed catalog source `a975543e705c419f666f99e8e0b32b3b7ed43ffc`
into qualified pricing source `7503664bd4a2a901ef8eac3d81b9cb0be8e0ef7d` on
`fix/last-known-price-catalog523-preview-20261123`. Preserve draft PR1035 and all
earlier source/proof. The catalog release remains PR985, held before acceptance.

The pricing application behavior and original SQL remain exact: accepted old
prices survive age and missing successor quotes, retain their original source
dates/provenance and exact identity, and disclose stale values on native/web.
Price migration `20261124010000` retains SHA256
`bf85f532b45f88abf181f4e943c82493c440d4d7a034154b4a9f13df6139d03e`.
The catalog migration `20261124040000` retains SHA256
`3d633cc8e1f59a56c1f0e76e25f4c0f4945674f17a8289d367e1be3e1ee6c19e`.
Neither SQL file is renamed or edited. Japanese replacement coverage remains
guarded at0.1%; this source neither publishes replacements nor refreshes old dates.

The four merge conflicts were confined to migration routing and historical source
inventory tests. Preserve both exact operational routes. Catalog V14/V15/V16/V17
operational scripts, V17 SDK/authority producers and their routing blocks remain
byte-identical to the catalog source. Historical pricing B1 remains exact520 and
read-only. The operational V17 gate rejects pending pricing before artifacts/DB.

The new V4 source-test helper requires exactly523 pinned catalog files plus the
original price candidate. It strips only the exact V17 catalog hash before
delegating to the unchanged V3 and V1 validators. Negative cases cover extra,
omitted and changed historical/catalog/pricing files. No operational gate is
widened. The separate staged522 readiness branch and its receipts remain intact.

## Retained local qualification

Before this source integration, read-only official CLI diagnosis proved that the
older price migration is rejected after catalog523 unless `--include-all` is
specified. A bounded startup-read-only dry run then listed exactly the price file;
all449 frozen protected fingerprints and the ledger stayed exact.

A new owned populated clone subsequently completed official523-to524 price
dry-run/apply/no-op with that exact-one CLI path. All449 protected fingerprints
and existing security remained exact; only the four original pricing definitions
changed. Their installed hashes matched the prior qualified pricing implementation.
The catalog523 body and retained parent data/schema/security remained unchanged.

Authenticated/service database roles returned the synthetic retained31 quote with
its original `2020-01-01T08:00:00.000Z` source date across a missing successor quote.
Anonymous access stayed denied with42501. These are local synthetic observations;
no real signed-in session or new PostgREST SDK acceptance is claimed. No populated
lab was reset and no new empty524 reset is claimed. Earlier unsuccessful routing
checks and all consumed local intents remain preserved.

Receipts under
`C:/grookai_vault_operator_artifacts/pricing_visibility_schema_20261123`:
`catalog523-ordering-v3/result.json`,
`catalog523-populated-upgrade-v1/result.json`, and
`catalog523-populated-upgrade-v1/handoff.json`.

## This preview's checks and release boundary

All47 focused migration/compatibility checks passed, without skips. The preservation
receipt confirms24 pricing runtime/SQL/verifier files and eight catalog operational
files are exact, and all historical routing blocks remain unchanged. The complete
normal managed commit/push and exact-head hosted qualification are recorded after
this checkpoint's source freeze; this text does not claim their outcome in advance.

Private source/normal/hosted receipts belong under
`catalog523-source-preview-v1` and `normal-catalog523-v1` in the pricing artifact root.
No hook, assertion, screenshot tolerance, dependency or concurrency setting is
weakened. Normal builds use only loopback build inputs; canonical SQL health checks
use verified TLS and read-only startup options.

Production remains522 and the catalog hold is active at preparation. After genuine
catalog production/deployed closure and original control restoration, reconcile
the actual accepted main/schema with pricing, retain immutable SQL, and qualify
the final replay/upgrade/SDK/security/performance and exact strict release gate.
That gate must explicitly bind the one older pending price file before admitting
its CLI path. Separate exact pricing SQL authority and deployed signed-in card/Vault
acceptance remain required. This preview authorizes no production apply, merge,
protection change, dashboard activation or deployment.
