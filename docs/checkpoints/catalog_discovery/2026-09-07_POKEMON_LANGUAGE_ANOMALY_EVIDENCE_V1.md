# Pokemon Language Anomaly Evidence - 2026-09-07

## Status

Korean recovery PR 434 merged at
`b698105d7df570c7b09398daa1035afc4dc4df78`. The latest scheduled refresh at
inspection was run `34101350654`, started `2026-09-07T08:35:00Z`, using older
commit `c63ff3f557872b93056270649df988cdf2311b68`. It succeeded, but is not proof
of the later recovery code. No full refresh was manually dispatched in this task.

This follow-up adds a bounded daily evidence diagnostic. It does not apply new
index records, change quarantines, access the database, upload images, or change
any pricing, Vault, client or release authority.

## Findings

All 250 German orphan rows have fresh, exact card-detail identity evidence and
an explicit set owner. The 16 set endpoints return 404. The candidate baseline
already retains these 250 cards; this was not data loss or 250 new catalog cards.
Counts within each group agree with the set totals declared by the card details.
This is consistency within one provider, not independent canonical admission.

| Source set ID | Verified card details |
| --- | ---: |
| 2011bw | 12 |
| 2019sm | 12 |
| 2021swsh | 25 |
| 2022swsh | 15 |
| 2023sv | 15 |
| 2024sv | 15 |
| pop1, pop2, pop3, pop4, pop6, pop7, pop8, pop9 | 17 each |
| tk-ex-latia, tk-ex-latio | 10 each |

The two Chinese anomalies are an upstream declared-ID collision. In pinned
`tcgdex/cards-database` commit `1c30c50253756bafecf0f065fc377f77016ad12f`:

- `data-asia/SV/CSV1C.ts` declares ID `CSV1C`, official count 127.
- `data-asia/SV/CBB1C.ts` also declares ID `CSV1C`, official count 9, with a
  different Chinese set name (Gem Pack volume one).
- `/v2/zh-cn/sets/CSV1C` returns only the 127-card set and an empty card list.
  That endpoint cannot prove the other record should be discarded or renamed.

Both Chinese rows stay quarantined. We did not override the declared ID with
the filename, infer which physical set is meant, or copy the other set's cards.

## Retained Evidence

Root: `C:/grookai_vault_operator_artifacts/catalog/20260907_language_anomaly_evidence/`.

```powershell
node --use-system-ca scripts/audits/pokemon_language_anomaly_evidence_v1.mjs --out-dir=C:/grookai_vault_operator_artifacts/catalog/20260907_language_anomaly_evidence/live_audit
```

Use a NEW output directory on any future run; the command above identifies the
completed run and must not overwrite it.

- Selected anomalies: 252, each reconciled once.
- Planned/attempted detail and set requests: 267/267; retries 0, skipped 0.
- HTTP 200: 251; expected set-endpoint HTTP 404: 16.
- Supported candidate revalidations: 250; unresolved collisions: 2.
- No source request transport failures.
- `live_audit/run_plan.json` SHA-256:
  `fc87a6899e21e31b63cc00685ca9ed7a5622c6924a13ffad2e479b21fdd94cf8`.
- `live_audit/summary.json` SHA-256:
  `33350ae65307449015ecdfd7483a49ebdb30c33d43fede093a181902d0245679`.
- `verification.json`: exact replay, all 267 response hashes valid, raw JSON
  bodies equal parsed bodies, and all selected IDs accounted for.
- `upstream/`: two original source files, retrieved from pinned URLs separately
  from the 267-request audit. AST inspection (no source execution) verified the
  duplicate declared ID. Their URLs and byte hashes are in `verification.json`.
- The run plan records the audit implementation byte hash and input fingerprints.

## Automation And Tests

- 95/95 combined anomaly/language/English/Japanese/discovery contracts pass.
- The 12 new diagnostic tests include identity/owner mismatch, count conflicts,
  duplicate Chinese IDs, response reconciliation, hard limits, rate-limit circuit,
  raw artifact hashes, baseline preservation and fresh-output enforcement.
- Syntax and diff checks pass.
- Final classifier hardening rejects incomplete probe evidence, impossible count
  relationships and duplicate card evidence. Offline replay of all 252 retained
  rows remains exactly equal; no additional provider requests were made.
- PR 435 review hardened the circuit timing: 401/403/429 response headers stop
  new calls immediately, even if the response body is slow. The regression test
  mixes one slow blocked response with fast successful responses and confirms
  that only the original three in-flight calls can proceed.
- Daily workflow diagnostic output is a sibling of `candidate_index`, not a
  publishable candidate input. Failure/skip counts and job outcome appear in
  adapter health; they cannot silently close issue 260.
- No source provider issue was posted externally. No database or Storage access.

## Next Gates

1. Merge this tested audit through GitHub checks, then observe the first scheduled
   run with both PR 434 and this diagnostic. Do not substitute an old green run.
2. Seek upstream corrections for the missing German set endpoints and the two
   Chinese descriptors. Exact reproducible paths above support an upstream report.
3. Any later revalidation must preserve original source anomalies and explicitly
   link its decision to this evidence. No automatic deletion or canonical admission.
4. Remaining sealed/product gates remain in
   `docs/checkpoints/SEALED_CLIENT_CLOSEOUT_20260907.md`. This work does not close
   source image gaps, stale-price exclusions, device acceptance, sealed Vault or
   anonymous licensing. Background image isolation remains deferred.
