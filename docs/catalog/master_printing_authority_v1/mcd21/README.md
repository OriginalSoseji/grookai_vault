# McDonald's 2021 Reviewed Master Printing Scope

These three JSON files are preserved byte-for-byte from the source-adjudicated
Master Index package. They describe the English base release: 25 numbered
cards, each in Normal and Holo, for 50 exact printings.

- `manifest.json`: exact parent IDs, printing identities and evidence bindings.
- `master.json`: reviewed Master Index facts.
- `review.json`: source-review projection and identity scope binding.

The source HTML is preserved separately at
`C:/grookai_vault_operator_artifacts/master_index_top_down_20260917/mcd21/`
and in the frozen executor evidence bundle. It is not bulk republished here.
The runtime must receive those exact bytes through its artifact map. Missing or
changed bytes block authority validation; refetching a changed page does not
silently renew the old review.

This is printing evidence, not production apply approval or whole-catalog proof.
Follow `docs/contracts/MASTER_PRINTING_EXECUTION_V1.md` for execution boundaries.
