# MEE Reference Runtime Repair and Main Parity

Date: 2026-09-09 UTC. Scope: reference refresh only, not a full MEE policy merge.

## Production Evidence

The deployed baseline was 87632e01b4ebb47a7b3ae35684b2fbe3935907b9,
not main. A runtime-only backport preserves that baseline's behavior:

- Memory selector hotfix: fc26dda1144f2387d3a3af0e5b94a505f55ca6d3.
- Source pairing hotfix: ed7414b98034641632ad378d3c5766095a6d53f7.
- Immutable tag: runtime/mee-source-pairing-20260909.
- Active runtime: /opt/grookai/releases/backend/ed7414b980.
- Prior unit and pointer backup: /var/lib/grookai/ops/mee-pairing-deploy-20260909.

The original OOM came from loading historical normalized payloads together.
Metadata-first discovery fixed that without weakening validation. Its read-only
preflight then exposed a second defect: the scheduled shell loop selected the
two newest acquisitions globally. Both were Pokemon, so yesterday's input was
normalized after today's and incorrectly became the latest normalized payload.

`--latest-per-source` now normalizes one latest Pokemon acquisition and one
latest TCGCSV acquisition. Missing inputs fail closed. Input path and SHA-256
are recorded in normalized JSON. No provider reacquisition was needed.

At 05:13:47 UTC the guarded missing-row recovery completed:

- 8701 candidate rows inserted into market_reference_candidates.
- 8701 matching normalized rows inserted into market_reference_normalized_evidence.
- Readback: zero missing rows and zero unresolved hashes/findings.
- No source calls, public pricing, canonical identity, Vault, Storage or deletion.
- Peak process RSS: 387644 KiB; elapsed 105.7 seconds including readbacks.

This is a missing-row recovery, not a new full nightly acquisition and not an
unattended-cycle claim. Preserve the original failed run. The existing daily
reference timer is unchanged; its next run must prove scheduled recovery.

## Main Reconciliation Boundary

This patch restores ONLY reference-lane protections already on the deployed
baseline, plus the two tested repairs:

- external artifact-root resolution across reference producers/consumers;
- bounded candidate-hash and normalized-key lookups;
- immutable runtime pointer and private reference lock in the unit;
- per-source normalization and input provenance;
- regression tests and this execution record.

No older application tree is merged. No changes to nightly eBay reuse, phase
blocking/nonblocking policy, retention execution, warehouse schema, publication,
pricing qualification or canonical identity are included. The separate nightly
runtime still has baseline differences that need review before replacing the
entire MEE runtime from main. Keep its immutable runtime pin in the meantime.

## Evidence Location

Local operator evidence:
`C:/grookai_vault_operator_artifacts/release_closeout/20260909/`.

Key receipts: mee_pairing_final_preflight.log, mee_pairing_activation.log,
mee_missing_rows_recovery_result.json and mee_missing_rows_recovery.log.
The result JSON links exact production preflight/apply/readback artifacts.
The hotfix commit and tag push each passed 2477 Node and 634 Flutter tests.
This main-parity patch must pass main's own full gates before merge.

## Next Gates

1. Keep pricing recovery frozen on 60d1c1d07f85504d747519b6cd566f253ddc96f8
   until its guarded publication and artifact reconciliation finish.
2. Merge this source-parity patch only after its independent checks pass.
3. Observe the next scheduled reference refresh without relabeling old failures.
4. Retention/capacity and final launch acceptance remain separate blockers.
