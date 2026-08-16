# MTG Catalog Ingestion Two-Set Canary Failure

- Status: **STOPPED_BEFORE_NEXT_SET**
- Mode: `rollback-canary`
- Selected sets: `2`
- Completed sets: `0`
- Retries: `0`
- Error code: `42703`
- Error: `column "image_source_ref" does not exist`
- Durable database writes: `0`

The independent verifier referenced a column that is not present in the
deployed `card_prints` schema. The failure was structural, so the executor did
not retry and stopped before advancing to another set. The active transaction
rolled back and no catalog, visibility, image, pricing, Vault, or Pokemon state
was changed.

This artifact is retained as fail-closed evidence. The verifier was repaired
to inspect only deployed parent and printing image columns, protected by a
contract regression test, and the identical two-set rollback canary later
passed.
