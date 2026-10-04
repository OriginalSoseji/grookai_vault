# Jungle edition canonical preparation

This reviewed base-release scope contains 64 First Edition and 64 Unlimited
parents, each with one source-supported child: 32 Holo and 96 Normal in total.
The UUIDs remain proposals for production; a local rehearsal materialized them
with staged identity links. The manifest preserves the existing
83 parents, 84 children, special variants, mappings, images and owned copies.

`master.json` records the source facts. `manifest.json` binds proposed identities,
species memberships, preservation boundaries and actual source hashes.
`review.json` binds the complete reviewed projection. Review does not authorize
database writes or make the generic child-only executor suitable for new parents.

Source bytes and the read-only production snapshot are retained privately under
`C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001/catalog-authority-v2`.
The corresponding remote evidence is under
`/var/lib/grookai/ops/jungle-edition-pricing-20261001`.
Use the private `artifact-map.json`, or restore its exact files and update paths
without changing their bytes. Hashes alone cannot pass validation.

```powershell
node scripts/audits/validate_jungle_edition_master_v1.mjs --artifact-map=C:/evidence/artifact-map.json --as-of=<UTC-time> --out-dir=C:/evidence/new-validation
```

The offline validator requires a snapshot no more than 24 hours old at the
explicit comparison time. A historical validation is not live execution proof.
Fresh state or legitimate ownership changes require reviewed reconciliation;
do not silently replace input hashes or allocate another set of UUIDs.

TCGdex detailed variant types are checked against the preserved PSA chart and
edition explanation. Species numbers independently agree with the PokemonTCG
dataset: 126 primary memberships across 47 species, and none for Poké Ball.
Source card ID and variant descriptor form the reference together, because the
provider's variant ID repeats across cards. Prices and generic flags are not
printing authority. Electrode #18 has edition-specific artwork; all proposed
images remain missing until separately reviewed.

Production independently advanced to migration 412 through PR568. The Jungle
candidate is now integrated with main bc4b80629 and passes combined 413 replay
and retained 412-to-413 upgrade in the V16 labs. Production remains unchanged.
The local-only canonical executor now passes transaction, rollback, conflicting
retry and lost-commit-response recovery proofs, with all saved copies preserved.
Production execution, populated source pricing shadow and deployment gates remain
outstanding. Manifest execution_authorized/write_ready remain false.
See the [Jungle operator note](../../../ops/JUNGLE_EDITION_PRICING_20261001.md).

`pricing-source-review.json` records the subsequent fresh compatibility review
of128 exact source quotes. It is separate from the unchanged canonical authority
manifest.126 matched the earlier SQL. Additive20261001203000 now admits both #64
aliases, passing full415 replay, retained upgrade and128-binding rollback proof.
The historical review bytes remain unchanged; the correction is not deployed.
All execution, mapping and publication authority flags remain false. Private
raw evidence and receipts are under `production-reconciliation-v1` in the same
local/remote artifact roots. Snapshot prices are review evidence, not live prices.
