# Prismatic alias replay baseline — November 16, 2026

The subsequent candidate qualification is recorded in
[the discovery correction checkpoint](PRISMATIC_ALIAS_DISCOVERY_QUALIFICATION_20261116.md).
It includes the forward query-performance repair and successful local498 proof;
production remains unchanged.

The owner requested fixing duplicate Prismatic Evolutions discovery and then
continuing with the replay prerequisite. Read-only investigation found an
existing genuine 496-migration CLI replay and checked all historical source
hashes, the original reset/replay proof, and the explicitly synthetic local
647-pair prerequisite. No historical SQL or database records were changed.

`scripts/schema/audit_prismatic_alias_baseline_v1.mjs` now independently compares
that preserved lab with the canonical live project. On November 16 it found
zero schema differences across all four product schemas, exact owner/ACL/RLS
and function-definition equality, and unchanged before/after readbacks.

Successful receipt:
`C:/grookai_vault_operator_artifacts/prismatic_alias_discovery_20261116/baseline-02/qualification.json`.

The existing lab is now populated by later runtime tests. Preserve its eight
test users and 193 test instances; never reset it. The first new audit rejected
its populated state and is retained at `baseline-01`. The corrected read-only
audit verifies the earlier genuine reset receipt and protects its current state.

Run from this worktree with a new unused lowercase output suffix:

```powershell
node --use-system-ca scripts/schema/audit_prismatic_alias_baseline_v1.mjs --out-dir=C:/grookai_vault_operator_artifacts/prismatic_alias_discovery_20261116/baseline-03
```

The production reader defect remains reproduced: set catalog and search expose
both `sv08.5` and `sv8pt5`. Production already has 180 approved reversible aliases;
the legacy parents and all historical ownership, pricing and finish rows stay
retained. The next qualification must cover the exact discovery-only migration,
fresh/retained replay and affected-reader regressions. This diagnostic script
has no production/local-database mutation mode, does not waive the default
preflight, and does not authorize production apply.

Validation completed: actual read-only schema/security comparison, Node syntax
check, and whitespace verification. Boundary checks reject a consumed output
directory, an output outside the private audit root, and an unsupported apply
argument; the existing successful receipt remains unchanged.
