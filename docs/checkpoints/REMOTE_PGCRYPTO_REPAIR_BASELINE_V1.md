# REMOTE_PGCRYPTO_REPAIR_BASELINE_V1

Date: 2026-04-02

## Observed Failure

- Failed command: `supabase db push`
- Remote applied before stop:
  - `20260402100000__card_print_identity_table.sql`
  - `20260402100001__card_print_identity_indexes.sql`
- Remote failed at:
  - `20260402100002__card_print_identity_support_functions.sql`
- Read-only reproduction of the migration-time missing-function condition:
  - SQLSTATE: `42883`
  - error: `function digest(text, unknown) does not exist`
  - hint: `No function matches the given name and argument types. You might need to add explicit type casts.`

## Partial-Apply Warning

Remote is in a partially migrated state.

- `public.card_print_identity` exists remotely
- support indexes from `20260402100001` exist remotely
- `public.card_print_identity_hash_v1` does not exist remotely
- no identity backfill or BA promotion side effects were detected before repair

## Remote Explanation Status

The original root-cause candidate was `pgcrypto` missing on remote.

Read-only audit disproved that candidate:

- `pgcrypto` is already installed remotely
- extension schema is `extensions`
- the failed function body referenced unqualified `digest(...)`

Current repair target is therefore the migration's dependency resolution path, not migration history bypass or manual state marking.
