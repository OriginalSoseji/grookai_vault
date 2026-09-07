# Pokemon Sealed Freshness Proof

Date: 2026-09-07. Scope: exact-price lineage, expiry regression tests, and an
audit-only production health run. No publication or image repair was applied.

## Authoritative Findings

- Canonical production target verified before read-only SQL. Sanity: 170,404
  card_prints, 3,397 sets, and 32,903 traits.
- Latest completed warehouse sync: `6501c3af-749f-469d-b60a-5a90425d538a`,
  observed September 7, 548,022 price rows, zero failed fetches.
- All 16 aging published Pokemon sealed quotes already match the newest exact
  warehouse observation dates. There is no newer Normal quote hidden behind
  a stale publication pointer for these products.
- Retrieved eight existing source response archives from the warehouse host,
  read-only. All 508,468 bytes match database artifact SHA-256 and size. All
  responses declare success, no errors, and contain 3,331 total price rows.
- None of the 16 products appears in its exact latest archived group response,
  under any subtype. This proves absence from those frozen source responses,
  not global absence from TCGPlayer or a different future response.
- Group-fetch status rows were empty for this run. That is not used as success
  evidence; the immutable artifact hashes and inspected response bodies are.

## Expiry And Recovery

The deployed `get_active_pokemon_sealed_catalog_v1` requires
`qualification.observed_on >= current_date - 7` and rejects future dates.
Consequently, absent fresh evidence, these quotes are withheld September 8:

| Product | Source ID | Last observation |
| --- | --- | --- |
| Mythical Pokemon Collection Box [Victini] | 123433 | 2026-08-31 |
| Mythical Pokemon Collection Box [Genesect] | 126569 | 2026-08-31 |
| Mythical Pokemon Collection Box [Meloetta] | 126568 | 2026-08-31 |

The other eight September 2 quotes expire September 10; five September 3 quotes
expire September 11. Exact names and IDs are in `verification.json` below.
These are predicted boundaries from current evidence, not a claim that tomorrow's
production behavior has already been observed. No production clock was changed.

New regression tests prove a seven-day quote is accepted, an eight-day quote is
excluded despite a fresh warehouse sync, price and image membership remain paired,
and genuine new exact observations restore eligibility without re-dating images.
The existing five-file sealed suite passes 26/26; syntax and secret-packaging
checks pass. No production policy, schema, prompt, or client behavior changed.

## Evidence And Health

Operator artifact root:
`C:/grookai_vault_operator_artifacts/pokemon_sealed/20260907_freshness_followup/`

- `readback.json`: production sanity, pointers, exact quotes, deployed RPC text.
- `lineage.json`: source artifacts, current product state, latest subtype quotes.
- `source/`: eight hash-verified existing response files; no new provider requests.
- `verification.json`: deterministic source-body reconciliation and expiry dates.
- Verification SHA-256:
  `9c7c66648f8dbc4a606045720298ac1fa46e9090fb61a3acf90aff8d31c8fdf4`.

Audit-only workflow run: `34137443070`, source
`17a545b9ffad69ec7d319a47064e302771565985`. Publication step verified skipped.
Final workflow conclusion: success. Downloaded health summary at 15:20:51 UTC:
1,721 published / 1,721 expected; source age zero days; zero mapping drift or new
products; three authenticated signed-image full-byte hash checks passed; cross-game
request denied. Health correctly remains `attention_required` solely for aging
quotes (16 aging, three expiring next day, zero already expired). This successful
audit is not proof of a scheduled publication run: publication was skipped.
Downloaded evidence is under `github_health/` in the operator artifact root.
Maintenance issue #426 remains open with the exact source-body diagnosis.

## Remaining Work

1. Daily governed warehouse and sealed refresh remain responsible for new quotes.
   Do not rerun publication merely to re-date these 16 missing source observations.
   Do not close maintenance issue #426 until its source gaps actually resolve.
2. Check September 8 readback: stale rows must disappear if no genuine quote
   arrived. More than five percent baseline loss must still stop refresh.
3. Preserve the 35 missing-image exclusions documented in
   `POKEMON_SEALED_SOURCE_MAINTENANCE_20260907.md`; no source image was recovered
   by this price audit. Do not substitute package art or retry access blocks.
4. First scheduled language recovery/anomaly-audit proof is still separate from
   this sealed health run. See the September 7 catalog-discovery checkpoints.
5. Signed-in physical-iPhone acceptance and the other release gates remain in
   `SEALED_CLIENT_CLOSEOUT_20260907.md`. This backend proof needs no app rebuild.

Business-data, Storage, pricing, pointer, visibility, Vault, and cross-game writes:
zero. The health workflow's established bounded authentication probe creates and
revokes only its temporary test session; it is not a publication operation.
