# Pricing Canary Incident, Repair, and Restart

## Result

The recent red GitHub Actions were investigated rather than blindly rerun.

- The canary observer failures were legitimate and exposed a broken source
  continuity boundary.
- The pricing legacy-key guard failure was repaired and superseded by green
  checks.
- The visual-search failures were one repeated Lane A artifact-hash mismatch
  and were superseded by a green runtime-protection run.
- Current open pull requests have no failing checks.

The production pricing defects were repaired, deployed, and proven through a
replacement activation.

## Runtime Repair

- Producing pricing SHA:
  `ffb2513fd530930dbfaee714b84df2358f7eaafc`
- Runtime repair PR:
  `https://github.com/OriginalSoseji/grookai_vault/pull/115`
- Runtime migration:
  `20260729190000_tcgplayer_market_assignment_prepare_runtime_repair_v1`
- Migration SHA-256:
  `12149124d3a49659186a7d8be543c55fcfa030cddb14c3a31a5221cfd6512fed`

The migration and function ACL/configuration readback passed. The source worker
now preserves successful terminal rows on same-key replay, and publication
uses the production-scale assignment preparation path.

## Replacement Activation

Run key:

`TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-07-29-REPAIR3`

Results:

| Check | Result |
| --- | ---: |
| Scheduled attempts | `1` |
| Source status | `completed` |
| Source requests | `9,200` |
| Source products | `497,527` |
| Source price rows | `540,624` |
| Source failures | `0` |
| Publication state | `verified` |
| Selected / mapped / eligible | `100 / 100 / 100` |
| Snapshots | `100` |
| Excluded / quarantined / delayed / suppressed | `0 / 0 / 0 / 0` |
| Missing provenance / stale / broken trace | `0 / 0 / 0` |

The repaired assignment phase prepared and reconciled `33,432` rows in
`20.599` seconds. The prior planner path had exceeded its runtime envelope.

The same-key source replay completed successfully without a provider request
or mutation of the terminal source row.

## Replacement Observer

- Observer binding PR:
  `https://github.com/OriginalSoseji/grookai_vault/pull/116`
- Main merge:
  `6dc2ea3ab4ccacb5c45939a010caae80bcae32a9`
- First workflow run:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/30488967875`
- Window start:
  `2026-07-29T20:26:44.820Z`
- Required end:
  `2026-08-01T20:26:44.820Z`

The first observer result is `observing` with zero findings. Source health is
`healthy`, source continuity is `completed_sync`, authenticated access works,
anonymous runtime access is denied, and rollback remains available.

## Boundaries

- No post-canary migration package was applied.
- No full publication rollout was started.
- Anonymous pricing remains denied.
- No canonical identity, Vault, or modeled-value writes were enabled.
- Historical failed workflow evidence was preserved.

## Next Gate

Wait for the full replacement 72-hour window. At or after
`2026-08-01T20:26:44.820Z`, require an enforcing observer result of `passed`
before migration preflight or broader signed-in rollout begins.
