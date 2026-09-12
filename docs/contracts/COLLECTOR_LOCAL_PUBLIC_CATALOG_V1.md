# Local Public Catalog Preview

Date: September 10, 2026.
Authority: Founder requested "connect to db so I can see what cards look like."
Worktree: C:/grookai_vault_collector_real_local, design/collector-real-local.

This scoped follow-up permits a bounded public catalog copy into the existing
isolated LOCAL database and LOCAL image bucket. It supersedes the earlier
no-local-seeding constraint only for this sample. The application remains pointed
at loopback; it never receives production service credentials. No remote writes,
push, deployment, production authentication or account data import are permitted.

## Data Boundaries

- Read production only with the public/anon credential and GET-only transport.
- Allowlisted tables: sets, card_prints, card_printings. No RPC execution.
- Five English Pokemon sets: sv03.5, sv02, sv06, sv08, sv8pt5.
- Public 151 rows plus illustration/special illustration rares in the other sets.
- At most 600 cards and 1,800 printings. This is a sample, not the full catalog.
- Preserve card/set/printing IDs, names, numbers, image truth and exact finishes.
- Map only game_id to the pre-existing LOCAL Pokemon game ID; record both IDs.
- Keep raw source snapshot and compare projected local fields on readback.
- No pricing, accounts, Vault, memories, messages, reviews or release controls.
- Fetch only public Grookai card image responses; do not use private user images.
- Keep unsupported/unavailable image cases explicit; do not substitute identities.

## Local Execution

`scripts/preview/load_public_catalog_local.mjs` defaults to snapshot-only.
`--apply-local` additionally permits local inserts and local image caching.
It refuses a non-empty card catalog, a different branch or a non-loopback target.
Back up existing local catalog rows, rehearse inserts inside a rolled-back
transaction, upload local objects with upsert=false, verify bytes, then insert
the sample atomically and read back each projected field. No updates/deletes.

The launcher remains local-only. Existing public readers and permission gates
remain unchanged. Anonymous pricing stays hidden. Empty personal collection
pages remain empty; this sample does not prove live-account workflows.

No automatic re-run once populated. Preserve receipts and source snapshot outside
Git under C:/grookai_vault_operator_artifacts/collector_polish. Do not reset the
local database to repeat this preview.
