# Fifteen GameStop registry entries — local qualification

Status: locally qualified preparation; no production execution entry point or release.

Authority: [master rulebook](../../GROOKAI_RULEBOOK.md) and the frozen
[identity subsystem](../../contracts/CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1.md).
This restores existing `pokemon_eng_standard:v1` registry coverage; it does not
change stamp identity, create parents or printings, or adjudicate finishes.

The canonical read-only audit found fifteen existing GameStop-stamped parents
without any registry row. Each already has one verified-visible child: eight
Cosmos, three Holo and four Reverse. Current SQL backfill projection produced
fifteen distinct hashes with no global collision. All targets are disjoint from
the 298 held Play!/Prize Pack parents. Canonical maturity was 173,994 parents,
3,421 sets and 47,409 traits on `ycdxbpibncqcchqiihfz`.

The checked-in manifest freezes the exact public parent/child/review rows,
fifteen proposed identity UUIDs, existing-law projections and reviewed INSERT
effects. No ownership row or account was copied into source. The implementation
pins actual columns, constraints, indexes, policies, functions, defaults and
triggers. There are no identity INSERT triggers or rewrite rules. Existing
identity rows remain protected by a complete server-serialized digest. The
state reader accounts for all 98 incoming foreign keys across 79 relations,
plus thirteen additional canonical-reference UUID columns. Six explicitly
excluded pricing mapping-entity fields use mapping IDs; their actual card and
printing foreign keys are included. This does not claim an exhaustive census
of arbitrary JSON/text references.

`qualifyGameStopRegistryTransaction` accepts only the owned PostgreSQL 17
database `gamestop_registry_fifteen_qualification_v1` on loopback port 5432,
with background workers disabled. It exposes no production apply adapter.
The transaction uses SERIALIZABLE, target row locks, current schema/projection
checks and a plain fifteen-row INSERT. It has no UPDATE, DELETE, conflict
suppression, retry, pricing, image, mapping or owner mutation. Existing/new
identity timestamps are bound by the actual committed receipt for readback and
replay. Unknown commit acknowledgement sets `commitUncertain`; do not retry.

Actual local PostgreSQL 17.6 qualification passed:

- Preflight: zero writes.
- Rollback: fifteen tentative identity INSERTs, exact independent before-state readback.
- Apply: exactly fifteen identity INSERTs; every other table unchanged.
- Fresh readback: all fifteen full rows, including timestamps, match the apply receipt.
- Committed replay: zero writes.
- Six rejection cases: duplicate active identity; unrelated existing identity
  mutation; retained printing artwork-note mutation; new identity timestamp
  mutation; assigned and unassigned owner UPDATE attempts.
- Thirty synthetic copies stayed exact: fifteen assigned and fifteen unassigned.
  Owner UPDATE cases were rejected by the existing stock isolation guard, not
  presented as mutations that reached the final preservation checker.
- Actual SQL `anon` role returned the same fifteen public options and was denied
  direct identity INSERT with `42501`. This is not HTTP/RLS deployment acceptance.
- Simulated acknowledgement loss after an actual **zero-write replay commit**
  was flagged uncertain; independent readback remained exact. No claim is made
  about losing acknowledgement of the initial fifteen-row commit.
- Six focused source tests passed, including canonical/retained database route
  rejection before any query, rejection of a resealed replacement manifest,
  and rejection of nested identity/schema mutations by callers. All parsed
  manifest values are recursively frozen; a shallow target wrapper alone does
  not protect the approved active flag or identity payload.

Fixture creation cloned the retained 523-schema lab without changing it.
Only the newly owned database was seeded. It has one synthetic `.invalid`
account, no auth session, and one unrelated synthetic identity. Independent
verification in a new process/connection confirmed the original retained lab
and thirty copies stayed exact. No Docker image, volume or persistent container
was created; a roughly 67 MB local database was added inside the existing engine.
The relay remained stopped.

Operator artifacts:
`C:/grookai_vault_operator_artifacts/all_stamped_reverse_holos_20261124/`:
`gamestop-registry-preservation-v6/`, `gamestop-local-lab-v1/`,
`gamestop-local-owned-v1/`, `gamestop-local-qualification-v1/`,
and `gamestop-local-independent-v1/`. All failed audit attempts and old labs
are retained. Local plan fingerprint:
`28bf6735f6c5b2c304e59d55640ad7e61ad1dc0421237bc7ef6c56b70dbbf135`.

Replay the SQL qualification only on a separately prepared, owned **before**
fixture. Never reset a retained laboratory to repeat these writes:

```sh
node scripts/audits/gamestop_registry_fifteen_local_qualification_v1.mjs \
  --fixture=/operator/gamestop-local-owned-v1 \
  --out=/operator/new-exclusive-qualification-output
```

An earlier source-check attempt for tree `84f02bc556369bf2133f1b1a82fef49e95a1496a`
was deliberately stopped before commit/publication when review found that the
exported identity objects were only shallowly frozen. Preserve its successful
contract/service/web results and its cancellation evidence; none qualifies the
corrected tree. The original SQL transaction body and frozen fifteen projections
are unchanged. The corrected source needs fresh full source checks.
The corrected module passed actual local readback, rollback and committed replay,
each with zero identity INSERTs and exact original committed rows. The complete
original transaction body is byte-identical (SHA256
`8e8cdca65dc9080882c4d65bac8d00e455d9d04467431c780652a91a6689a7f6`).
`gamestop-deep-freeze-qualification-v1/` retains this equivalence and current-source
SQL proof. No fresh fifteen-row apply from the corrected source is claimed.

Remaining: normal managed/hosted source qualification; a separately reviewed
production adapter with durable run/failure evidence; fresh production plan,
rollback and required release decision. No production write during the active
pricing verification window. The diagnostic audit is not an execution baseline.
The historical cause of the missing registrations is not proven; no generic
warehouse ingestion correction is claimed. Four-card Cosmos and duplicate-set
closures stay closed, and other main merges remain allowed.
