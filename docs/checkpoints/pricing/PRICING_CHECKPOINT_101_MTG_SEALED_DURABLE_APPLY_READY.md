# Pricing Checkpoint 101: MTG Sealed Durable Apply Ready

## Status

`DURABLE APPLY READY - SEPARATE PAYLOAD AUTHORITY REQUIRED - MTG HIDDEN`

## Context

PR `#402` merged the MTG sealed apply-authority binding repair as exact merged
`main@800d41e65fbaaaf52f1e32b5cde1ae0367e1a976`. The repair makes both the
GitHub workflow and durable writer compare separately approved producer, plan,
source, and count values. A live plan can no longer authorize itself.

The plan, production preflight, and complete rollback canary were then rerun
from that exact merged producer. No MTG sealed payload, Storage object, image
pointer, pricing publication, Vault row, or visibility change was committed.

## Problem

The pre-repair workflow regenerated a live plan and passed that same plan's
fingerprint into the writer. Although the earlier payload was transactionally
sound, this did not prove that a later durable apply would match a separately
approved payload. The write boundary needed independent authority inputs and a
new proof sequence from the repaired merged code.

## Risk

- Source drift between approval and apply could otherwise change the payload.
- A changed count could remain hidden behind a newly generated fingerprint.
- A cross-game defect could mutate the active One Piece sealed world.
- A partial operation could leave MTG tables or its active pointer divergent.
- Catalog visibility could be mistaken for sealed-product visibility.

## Decision

- Require separate authority for the exact producer SHA, plan fingerprint,
  source fingerprint, and complete counts object.
- Compare those values in the workflow before opening the durable writer.
- Compare them again inside the writer before any insert.
- Rebuild the full plan and repeat production preflight and rollback proof from
  the exact repaired merged SHA.
- Keep MTG sealed visibility `hidden` before, during, and after any later data
  apply.
- Stop before durable apply until exact payload authority is granted.

## Alternatives Rejected

- Reuse the pre-repair fingerprints: they were produced by code without the
  complete independent binding.
- Approve only a plan fingerprint: source and row-count drift must also fail
  closed.
- Apply and validate afterward: production mutation requires prior complete
  rollback proof.
- Activate signed-in visibility with the payload: visibility is an independent
  release decision.

## Exact Producer And Runs

- Producer SHA:
  `800d41e65fbaaaf52f1e32b5cde1ae0367e1a976`
- Preserved workflow dispatch ref:
  `ops/mtg-sealed-apply-800d41e65`
  - this remote branch resolves exactly to the producer SHA above;
  - preserve it until durable apply and independent readback are complete.
- Authority-binding PR:
  `https://github.com/OriginalSoseji/grookai_vault/pull/402`
- Fresh plan run:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33806092841`
- Read-only preflight run:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33806546050`
- Full rollback canary run:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33807221577`

## Frozen Payload

- Plan fingerprint:
  `45abdb1e37819e343274f82524d9e55dbf9c096345b4d600dca1e9d0ec6f79c4`
- Source fingerprint:
  `4930912401798650fee813993ca9e588b198cc1fc8d259e0aeb71e72d9f805af`
- Source rows inspected: `117,484`
- Candidate price products: `2,923`
- Latest price rows: `2,795`

| Entity | Count |
| --- | ---: |
| Candidates | 2,904 |
| Families | 237 |
| Variants | 2,904 |
| Reviews | 2,904 |
| Mappings | 2,904 |
| Evidence rows | 14,070 |
| Qualifications | 2,779 |
| Qualification holds | 144 |
| Frozen releases | 1 |
| Release members | 2,182 |

Qualification outcomes:

| Status | Count |
| --- | ---: |
| `qualified_exact` | 2,182 |
| `blocked_missing_price` | 480 |
| `blocked_stale` | 117 |

Exact compact counts authority input:

```json
{"candidates":2904,"families":237,"variants":2904,"reviews":2904,"mappings":2904,"evidence":14070,"qualifications":2779,"qualification_holds":144,"releases":1,"members":2182}
```

## Plan Artifact Proof

The standalone plan and both later proof runs reproduced the same plan, source,
counts, and compressed payload.

- `sealed_world_plan.json.gz` SHA-256:
  `c650f5b410912512cb7b0b70579b9d0f4ee8de651ee97400fdf10dfc075f6f87`
- plan `summary.json` SHA-256:
  `4481488bcf5fbed725f81ee0992d409f82432f5e374444c3ab84713b41d99adc`
- plan `run_plan.json` SHA-256:
  `3e2577636a3559da594036b3548b869863d1e943d5b13e55a82a693d430c29b1`

## Read-Only Preflight

Run `33806546050` passed with `database_writes: 0` and proved:

- the game-scoped sealed schema and visibility function remain valid;
- MTG catalog visibility is `signed_in` while MTG sealed is `hidden`;
- all MTG sealed target tables and the pointer remain empty;
- the hidden governed RPC returns zero MTG rows;
- the live plan fingerprint matches the frozen plan;
- One Piece remains unchanged.

The preflight `summary.json` SHA-256 is
`1014af861ccc63a32f4b8948faff350907fff3d450a7b519d14b2955f138bc8f`.

## Full Rollback Canary

Run `33807221577` inserted the complete payload inside one transaction and
proved exact projections for every family, variant, candidate, review, mapping,
evidence, qualification, release, and release-member row.

In-transaction proof included:

- one frozen MTG release with `2,182` expected members;
- one game-scoped MTG pointer referencing that release;
- release manifest fingerprint
  `2455c752047c27993d8afb826223cb72474f7d9214fdfa86855321410b46f9e3`;
- zero rows returned by the hidden governed RPC;
- identical One Piece before/after hashes.

After rollback:

- every MTG target table and pointer returned to count `0`;
- the MTG empty-boundary SHA-256 remained
  `fc248235be52833d33b5df0b5b4033028815c92e5b32b9900719e95b33960714`;
- the One Piece boundary SHA-256 remained
  `83e84e94755dce0dbecf5f02be2c25fa4c9ef2517c98dbe8f95225de5000be03`;
- `database_writes_committed: 0`.

The canary `summary.json` SHA-256 is
`f691ee6e31e571d4a8e78c7269c347cf335889abe200ce2404058501ae993796`.

## Current Truths

- Both sealed schema migrations are applied and independently read back.
- The apply-authority binding repair is merged and all PR checks passed.
- MTG sealed visibility remains hidden.
- The durable MTG target remains empty.
- The repaired producer produced one stable plan across plan, preflight, and
  rollback-canary runs.
- The complete payload has been transactionally proven with zero residue.
- One Piece data, release membership, and pointer remain unchanged.
- No durable MTG sealed payload authority has been granted or executed.
- Storage, images, pricing publication, Vault, and visibility remain separate.

## Invariants

- Durable apply must use the exact separately approved producer, plan, source,
  and counts recorded here.
- Durable apply must dispatch from
  `ops/mtg-sealed-apply-800d41e65`; a raw SHA is not a valid GitHub workflow
  dispatch ref, and a later `main` head is not this proven producer.
- Any mismatch or source drift must stop before the first insert.
- Apply remains insert-only for the authorized MTG payload and one MTG pointer.
- Existing One Piece rows and pointer must remain byte-stable by boundary hash.
- MTG sealed must remain hidden after payload apply.
- Independent readback must follow any durable apply.

## What Must Never Be Broken

- Game isolation and exact TCGPlayer source lineage.
- Immutable frozen release membership.
- Service-only write authority and signed-in read boundaries.
- Hidden-before-release behavior.
- Exact failure attribution and transaction rollback.
- Zero mutation of One Piece, card catalog, Vault, Storage, and unrelated price
  publication surfaces.

## Explicit Next Gate

Obtain separate production authority tied exactly to:

- producer SHA
  `800d41e65fbaaaf52f1e32b5cde1ae0367e1a976`;
- plan fingerprint
  `45abdb1e37819e343274f82524d9e55dbf9c096345b4d600dca1e9d0ec6f79c4`;
- source fingerprint
  `4930912401798650fee813993ca9e588b198cc1fc8d259e0aeb71e72d9f805af`;
- exact counts JSON recorded above.

That authority may permit only the frozen MTG sealed candidate, family,
variant, review, mapping, evidence, qualification, release, release-member,
and one MTG pointer insert set. It must not authorize cards, sets, Storage,
image pointers, pricing publication, Vault, One Piece mutation, updates,
deletes, cleanup, or visibility activation.

After authority, run `apply` once from the exact producer with all four approved
values:

```powershell
gh workflow run mtg-sealed-world-runner.yml `
  --ref ops/mtg-sealed-apply-800d41e65 `
  -f operation=apply `
  -f expected_sha=800d41e65fbaaaf52f1e32b5cde1ae0367e1a976 `
  -f expected_plan_fingerprint=45abdb1e37819e343274f82524d9e55dbf9c096345b4d600dca1e9d0ec6f79c4 `
  -f expected_source_fingerprint=4930912401798650fee813993ca9e588b198cc1fc8d259e0aeb71e72d9f805af `
  -f 'expected_counts_json={"candidates":2904,"families":237,"variants":2904,"reviews":2904,"mappings":2904,"evidence":14070,"qualifications":2779,"qualification_holds":144,"releases":1,"members":2182}'
```

Then run a separate `readback` from the same preserved ref, prove exact counts
and hashes, confirm One Piece is unchanged and MTG sealed remains hidden, and
stop before any visibility or client rollout.
