# JUSTTCG_BATCH_LOOKUP_CONTRACT_V1

Status: ACTIVE  
Type: Integration Contract  
Scope: Card-level JustTCG lookup by `tcgplayerId` for Grookai mapping promotion.

---

## Purpose

This contract defines the only allowed batch lookup path for card-level JustTCG resolution inside Grookai.

It exists because GET query-string pseudo-batching was proven unsafe and is not treated as an acceptable upstream contract.

---

## Problem Discovered

Unsafe behavior that must not return:

- repeated GET query params:
  - `/cards?tcgplayerId=86760&tcgplayerId=87103`
- comma-separated GET query params:
  - `/cards?tcgplayerId=86760,87103`
- array-style GET query params:
  - `/cards?tcgplayerId[]=86760&tcgplayerId[]=87103`

Why this is unsafe:

- public JustTCG docs prove single-value GET lookup by `tcgplayerId`
- reviewed docs did not prove GET query batching
- a 200 response is not enough to guarantee deterministic match-back
- response ordering must not be trusted

---

## Allowed Upstream Contract

Allowed batch path:

- `POST /cards`

Required request shape:

- JSON array body
- one lookup object per requested card
- one identity only per object

Allowed object shape for this worker:

```json
[
  { "tcgplayerId": "86760", "game": "pokemon" },
  { "tcgplayerId": "87103", "game": "pokemon" }
]
```

Rules:

- do not batch through query strings
- do not send multiple `tcgplayerId` values inside one object
- do not use `tcgplayerSkuId` for card-level mapping

Runtime batch-size policy:

- active default runtime batch size is `200`
- batch size is overrideable via `JUSTTCG_BATCH_SIZE`
- batch size is overrideable per run via `--batch-size=<n>`
- CLI override wins over env
- rollback is operational, not structural: lower the batch size and rerun

---

## Deterministic Resolution Rules

Grookai must resolve POST batch responses by returned `tcgplayerId`, not by array position.

Required behavior:

- re-key every returned row by normalized `tcgplayerId`
- never assume response order matches request order
- `200 OK` does not imply success for every requested card
- each requested `tcgplayerId` must resolve independently

Each requested input ID must classify as one of:

- success
- missing
- duplicate
- conflict
- malformed upstream row
- transport error

---

## Stop Rules

Stop and refuse batch trust if any of the following occurs:

- upstream returns duplicate rows for the same `tcgplayerId`
- upstream returns any row without `tcgplayerId`
- upstream returns an unrelated `tcgplayerId` not present in the request set
- observed runtime behavior diverges from the published POST `/cards` contract

When a stop rule is hit:

- do not promote mappings from that batch
- log the anomaly
- lower batch size if needed for containment
- re-audit the upstream contract before widening usage

---

## Mapping Scope

This contract is card-level only.

Allowed persistence:

- `external_mappings(source='justtcg').external_id = JustTCG card id`

Not allowed:

- persistence of search-derived matches
- persistence of JustTCG variant IDs
- persistence of `tcgplayerSkuId`
- any write outside `external_mappings(source='justtcg')`

---

## Guardrail Requirement

Grookai code must fail fast if GET `/cards` is called with:

- repeated `tcgplayerId`
- comma-separated `tcgplayerId`
- `tcgplayerId[]`

Unsafe GET batch behavior must be impossible to reintroduce silently.

---

## Related Files

- `backend/pricing/justtcg_client.mjs`
- `backend/pricing/promote_tcgplayer_to_justtcg_mapping_v1.mjs`
- `backend/pricing/test_justtcg_post_batch_probe.mjs`
- `backend/pricing/test_justtcg_batch_probe.mjs`
