# Duraludon GameStop source/pricing repair — October 1

Read `docs/contracts/REVIEWED_MAPPING_PRICE_QUARANTINE_V1.md`. Read-only production
tracing confirms mapping132914 associates unstamped product214239 with the existing
GameStop parent04e792f4-4de2-4026-994f-087e230c7bae and Holo child. The current
reader returns0.49USD from that source. Correct GameStop product247362 is distinct;
its exact image and the editorial release history establish the red stamp and
line Holo treatment. Cosmos belongs to the original unstamped product.

The repair preserves both canonical identities, the existing GameStop child and
representative image, source/raw/discovery evidence, owned copies and pricing
history. It first installs a reviewed-rejection pricing-read exclusion, then uses
one frozen manual mapping transaction to invalidate the wrong association and
insert the correct one. The obsolete mapping row remains as audit evidence.
No guessed replacement price, source ownership transfer or pricing activation.

Qualification and actual outcomes are indexed by
`C:/grookai_vault_operator_artifacts/gamestop_duraludon_20261001/CHECKPOINT.md`.
The isolated full413 and retained412-to413 labs use loopback64040/64140 with
internal Docker networks and background workers disabled. Preserve them and all
failed fixture receipts. RuntimeV4 is the successful Auth/HTTP proof; executorV2
is the complete actual-transaction proof. Never replay consumed fixture or
production intents. The separate clean runtime worker checkout is
`C:/gv_duraludon_runtime_worker_20261001`; it performs synthetic local work only.

The branch contains current main after a pending merge. Exact per-card evidence,
source commit, normal hooks, strict preflight, CLI dry run, production schema
readback and mapping readback remain distinct gates. Consult the private checkpoint
for their current state; checked-in preparation is not proof of a completed repair.
