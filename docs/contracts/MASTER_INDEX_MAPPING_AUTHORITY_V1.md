# Master Index Mapping Authority V1

Date: 2026-09-17
Status: Local implementation candidate. Not deployed or production authority.

## Purpose

An exact-looking provider match is not a reviewed canonical mapping. The bounded
TCGPlayer mapping executor must receive the source-backed Master Index authority
for every selected parent before it connects to the database. Existing maintenance,
producer, plan, confirmation and transaction gates remain independently required.
This extends `MASTER_INDEX_PRINTING_AUTHORITY_V1.md`; stricter identity rules win.

## Bound Evidence

`MASTER_INDEX_MAPPING_AUTHORITY_V1` packages exact selected candidate fingerprints,
reviewed manifests and actual artifact bytes encoded as canonical base64. Every
artifact reference must be unique and required by its manifest. No source bytes
are silently discarded. Every scope must be used. Selected parents and normalized
source product IDs must each be unique, even outside the existing batch selector.

Each manifest includes `external_mapping_assertions`, covered by its existing
projection-bound review, with these fields:

- `source`: `tcgplayer`
- `external_id`: exact source product ID as a string
- `card_print_id`: existing canonical parent UUID
- `candidate_fingerprint`: complete reviewed mapping candidate fingerprint
- `source_ref` and `source_sha256`: reviewed `exact_printing_mapping` evidence

A printing-only review cannot approve mapping assertions added afterward.
Neither an envelope hash nor a matching price bucket creates authority. Review
records are issued only after actual adjudication, never by the packaging command.
The executor remains limited to English physical Pokemon base identities; this
change does not introduce authority for Japanese, stamps, other games or sealed.

## Live Identity

The frozen Master Index binds set, parent UUID, GV-ID, name, domain, variant,
printed coordinate and other recorded parent identity fields. Every recorded
field is compared against the live parent snapshot. The raw live `number` must
also equal the candidate's frozen `canonical_number`; normalization may not hide
an event label or another change. Review may intentionally reconcile Master Index
coordinate formatting, but cannot authorize later drift in the frozen DB target.

The writer verifies package file SHA before connection, during transactional
preflight and before commit. It rechecks live parents before commit and binds
source/review/manifest fingerprints into mapping metadata for exact readback.
This evidence package explicitly reports `execution_authorized:false`.

## Offline Packaging

Use the exact selected JSONL from bounded selection, not the full unselected plan.
Create `scopes.json` as an array of `{manifest, artifact_map}` file paths relative
to that file. Each artifact map is an array of `{ref,path}` entries, with paths
relative to the map. Inputs must already contain genuine reviewed authority.

```powershell
node scripts/ingest/master_index_mapping_package_v1.mjs --selected=C:/evidence/selected.jsonl --scopes=C:/evidence/scopes.json --out-dir=C:/evidence/new-package
```

The command performs no network or database calls. It refuses an existing output
directory and preserves selected input bytes. Outputs are `master_authority.json`,
`selected_candidates.jsonl`, and `receipt.json` with deterministic SHA-256 bindings.
An incomplete output directory must not be overwritten or mistaken for success.

The executor requires `TCGPLAYER_EXACT_MAPPING_MASTER_AUTHORITY_PATH` and
`TCGPLAYER_EXACT_MAPPING_MASTER_AUTHORITY_SHA256` in dry-run and apply modes.
Use a repository-contained immutable package and the receipt's file hash.
The package is not a replacement for the independently frozen apply authority.

## Release Proof Still Required

Negative CLI tests prove missing/invalid authority stops before any DB connection.
Pure contracts prove evidence, raw identity and duplicate-selection rejection.
The local PostgreSQL rehearsal also proves valid dry-run, raw identity drift
rejection and a real server commit with a deliberately lost client response.
Its synthetic schema is not proof of full production schema or apply parity.
The connection guard reuses the exact production host/project policy, strips URL
TLS overrides, verifies remote certificates, and checks the authenticated stream.
Only explicitly named isolated loopback rehearsal databases may use plaintext.
Dry-run sets read-only at connection startup as well as transaction start.
No remote TLS handshake or production connection is claimed by local tests.

A COMMIT attempt without acknowledgement reports `committed:null`,
`commit_uncertain:true`, and `reconciliation_required`. It is never followed by
a misleading rollback or automatic retry. Post-commit readback failure also
requires reconciliation. Precommit evidence is saved before sending COMMIT.
Rollback is proven only by an acknowledged ROLLBACK; lost rollback responses
remain explicit uncertainty. Failures must be investigated by independent readback.
Before release: finish real local apply/readback proof, full hooks and review.
Do not repeat or alter the separately frozen McDonald's executor or its approval.
