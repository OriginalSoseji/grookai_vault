# Pokemon Sealed Source Containment

Date: September 9, 2026. Scope: launch repair, not identity expansion.

Run 34369019748 failed on variant 42d3df7c-26a6-5de9-88ce-a39fc62e28b7,
TCGPlayer 624676, Destined Rivals Elite Trainer Box. Its supplier payload changed.
The existing exact-hash check correctly rejected it, but stopped every other
verified product's refresh. Original failure artifacts remain preserved under
the September 9 release-closeout operator directory.

`POKEMON_SEALED_SOURCE_CONTAINMENT_V1` excludes changed, inactive, missing or
cross-category source rows from both new price and image releases. It records
expected and observed evidence without changing canonical identity or mapping.
All exclusions share the existing 95% fixed-baseline coverage minimum; duplicate
inputs, corrupted image evidence and extreme price movements still stop writes.

Health readback distinguishes active drift (failure) from confirmed exclusion
from the current catalog (operator maintenance warning). Neither is called
healthy. Missing/inactive source rows are also reported, and an absent published
variant ID fails the evidence check instead of proving containment. The operator
issue stays open until the source identity is actually reconciled.

Verification: 31 targeted refresh, health, image-probe, maintenance and world
contracts passed locally. Live execution is pending a clean frozen commit,
fresh plan, transaction rollback proof and independent committed readback.
No production writes have been performed by this repair checkpoint yet.
