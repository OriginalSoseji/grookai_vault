# Best of Game Supabase17 rehearsal — November19,2026

Status: authorized Docker recovery and Supabase17 transaction/API qualification
complete. Production data and schema remain unchanged. Normal managed release
checks and a separately bounded production repair package remain pending.

## Docker recovery

The owner explicitly answered **Restart Docker Desktop** to the shared-service
restart question. The original pending [recovery checkpoint](BEST_OF_GAME_DOCKER_RECOVERY_20261118.md)
is historical. The normal Desktop restart command timed out; verified installed
Docker application processes were closed and relaunched. Startup then reported
`WSL_E_USER_VHD_ALREADY_ATTACHED`. Recovery stopped only `docker-desktop`, detached
only its already-identified125119234048-byte data VHD, and relaunched the installed
application. No factory reset, prune, data relocation, WSL unregister or all-disk
unmount occurred. The disk file was retained at the same size when reattached.

The normal Docker API now responds with engine29.8.2. All21 repair containers
and six named retained volumes match the pre-outage closure. All434 containers
and393 volumes in the recovered inventory remained present after qualification.
The existing shared63340/63341 runtime was restored; its actual Auth health returns
HTTP200. No temporary Docker API listener or Docker context change was needed.
The earlier failed restart/probe/bootstrap receipts remain preserved.

## Isolated full-platform fixture

New project: `bog-platform-511-20261119`, internal subnet `10.253.117.0/24`.
The original qualified Shrouded511 DB/storage volumes were copied read-only while
their source containers stayed stopped. Original volumes were never reused as
writable mounts. The cloned original database still has1327 fixture parents,
19 saved copies and one original Auth user, with its full fingerprints unchanged.

A separate database `bog_printing_rehearsal_20261118_v1` was created from that
qualified511 template. Database-level test settings were copied using the existing
configured local admin role; no role flags or grants were changed. The first
ordinary-role setting attempt and the credential-less admin attempt failed and
are retained. No authority or credential was manufactured to clear them.

The fixture runs the cached Supabase PostgreSQL17.6, Auth, PostgREST, Storage,
Kong and local mail images. It preserves the complete511 schema. The current
canonical production runtime is17.4; all four application schema models compile
to zero differences and the complete security snapshot matches. This phase cloned
the prior qualified replay; it did not reset a populated database or claim a new
empty-database CLI replay. Fresh strict511 preflight passed immediately beforehand.

The transaction engine and native CLI source are unchanged, producer
`e860f9acc036841f3c99434b55bba026b34f322d1633f9073a9f260ce74fcb03`.
The backend runs in the verified DB container network namespace against its actual
loopback64240 listener and the dedicated named database. No native target guard
was relaxed. A new plan, rather than the PostgreSQL16 plan, binds the full426
application tables:
`97d6be89ba5ff4107de0f5668a49d11296eff1c6b7f82c89dabf38aeb428342f`.

Catalog fixture adaptations are explicit: canonical parent/printing IDs remain
exact; the game FK targets the fixture's Pokemon row and mapping serial IDs are
allocated locally. Two synthetic, confirmed Auth users and one synthetic BP5
owned copy exercise real ownership policy. No production customer-owned row or
customer credentials were imported. All19 earlier copies and the original Auth
user remain byte-for-byte identical.

## Results

- Read-only preflight, complete transaction rollback and independent before-state
  equality passed against all426 protected application tables.
- An actual duplicate-key failure after the full proposed writes rolled back.
  Deliberate mapping-JSON and owned-price changes also failed and rolled back.
- Local commit admitted exactly one raw record, two reverse children and two
  append-only reviews, with zero existing-row updates/deletes.
- Independent readback matched18 exact family printing options. Repeating the
  transaction wrote zero rows, including zero new raw records or sequence changes.
- Real Auth-issued tokens passed PostgREST checks for anon, ownerA, other ownerB
  and service role. All see the18 printing choices; ownerA sees its test copy,
  ownerB and anon do not. No hand-rolled token was used.
- Windows SDK requests through the loopback test API also passed all four roles,
  including exact new BP8/BP9 and retained BOG8 printing-ID lookups, under the
  unchanged three-second request budget.
- The new internal services use a fixed, source-hashed loopback relay for host
  access. It forwards bytes to the attested DB/Kong addresses and emits no fake
  responses. All database/application services stay on the private internal
  network; no public Docker API port is exposed.
- Ledger511, all four application schemas and complete security match the fresh
  canonical audit. The existing220 focused-test sources/hash bindings are unchanged;
  these integration checks do not substitute for the managed full shipcheck.

The dedicated test services and relay are stopped, with both copied volumes and
every container/receipt retained. The original repair labs remain stopped and
untouched. The shared verification runtime remains healthy. The native16 fixture
also remains stopped and preserved.

## Proof and next gate

Private root: `C:/grookai_vault_operator_artifacts/best_of_game_repair_20261118/`.
Docker authorization, application/WSL/disk recovery and retained-resource proof
are under `docker-recovery-preparation-v1/`. Start with
`USER_RESTART_AUTHORIZATION_V1.json`, `targeted-data-detach-v1.json`,
`retained-resources-verified-v1.json` and `final-api-health-v3.json`.

Full-platform evidence is under `platform-v1/`: `platform-start-result-v3.json`,
`qualification-v1/result.json`, its rollback/failure/readback/idempotency and
HTTP-role receipts, `schema-preservation-result-v1.json`, `host-api-result-v1.json`
and `stopped-retained-v1.json`. Failed starts and all producer sources remain
alongside them. Full credentials, Auth tokens and before rows remain private.

Final verified-TLS production read `production-read-v4.json` at
`2026-11-19T07:34:42Z` still reports511 migrations,173837 parents,3420 sets,
47409 traits and325 vault projection rows. The two sets,22 family parents,
16 existing children,30 mappings,22 identity rows and the owned copy hash-match
the previous before-state; proposed UUID/GV-ID collision checks remain clear.

Next: normal managed release checks and a separately frozen, source-bound
production executor/plan. Docker restart approval does not authorize production
printing writes. The native/full-platform local plans must not be presented as
production authority. The nine BOG/BP discovery aliases remain pending after the
printing repair, preserving all Winner identities and global Bog/Boggart searches.
