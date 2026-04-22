## Alias Mapping Execution V1

### Problem

The pipeline could already classify and resolve alias rows correctly:

- identity audit: `ALIAS`
- identity resolution: `MAP_ALIAS`

But execution stopped there. The system knew the right action and still could not perform it.

That left lawful alias rows stuck in warehouse flow even when:

- the target canonical `card_print` was deterministic
- no new canon row was required
- the correct action was simply `external_mappings` attachment

### Scope

This pass adds alias execution only.

It does not:

- create new `card_prints`
- modify identity audit rules
- modify identity resolution rules
- modify bridge logic
- run any global mapping job

### Current Mapping Model

`public.external_mappings` was audited live before patching.

Confirmed:

- columns include:
  - `card_print_id`
  - `source`
  - `external_id`
  - `meta`
  - `synced_at`
  - `active`
- uniqueness is enforced on `(source, external_id)`
- `card_print_id` is a foreign key to `public.card_prints(id)`

This makes alias execution a lawful upsert target as long as the target card and external id are deterministic.

### Design Decision

The warehouse candidate schema does **not** support:

- `RESOLVED`
- `RESOLVED_ALIAS`
- `resolution_type = ALIAS`

The existing candidate lifecycle only allows:

- `RAW`
- `NORMALIZED`
- `CLASSIFIED`
- `REVIEW_READY`
- `APPROVED_BY_FOUNDER`
- `STAGED_FOR_PROMOTION`
- `PROMOTED`
- `REJECTED`
- `ARCHIVED`

And `PROMOTED` requires a succeeded staging row.

Because alias execution must **not** create a promotion staging row, the bounded schema-safe terminal state is:

- `ARCHIVED`

with:

- explicit alias execution event
- explicit archive note
- trace metadata on the mapping row

### Files Patched

- `backend/warehouse/promotion_stage_worker_v1.mjs`
- `backend/warehouse/promotion_executor_v1.mjs`

### Alias Execution Logic

#### Stage Worker

When `identity_resolution = MAP_ALIAS`:

- do not create a promotion staging row
- build a deterministic mapping plan preview
- in `--dry-run`, return the mapping plan
- in `--apply`, call the executor alias helper directly inside the candidate transaction

This path is allowed for:

- `APPROVED_BY_FOUNDER`
- `STAGED_FOR_PROMOTION` only when the current staging row is `FAILED`

That second case is the bounded repair path for legacy bad staging like the `Ghastly` row.

#### Executor Helper

The executor module now owns the actual alias mutation:

- verify `identity_resolution = MAP_ALIAS`
- verify `source`
- verify `external_id`
- verify target `card_print_id`
- verify target `card_print` exists
- reject if an existing mapping row for `(source, external_id)` points to a different `card_print_id`
- upsert `external_mappings`
- archive the warehouse candidate
- emit an `ALIAS_MAPPING_EXECUTION_SUCCEEDED` event

### Mapping Rules

The write path is:

```sql
insert into public.external_mappings (
  card_print_id,
  source,
  external_id,
  meta,
  synced_at,
  active
)
values (...)
on conflict (source, external_id)
do update set
  card_print_id = excluded.card_print_id,
  meta = coalesce(public.external_mappings.meta, '{}'::jsonb) || excluded.meta,
  synced_at = excluded.synced_at,
  active = true
where public.external_mappings.card_print_id = excluded.card_print_id;
```

Important safety point:

- the conflict update only proceeds when the existing row already points to the same canonical target
- if a different target owns the mapping, execution rejects instead of overwriting it

### Candidate Terminal State

After successful alias execution:

- `state = ARCHIVED`
- `current_staging_id = null`
- `archive_notes` records the alias mapping target

This is the schema-safe equivalent of “resolved alias” under the current warehouse contract.

### Safety Guards

Alias execution rejects when:

- the target `card_print_id` does not exist
- `source` is missing
- `external_id` is missing
- the identity resolution is not `MAP_ALIAS`
- the candidate lacks founder approval
- the candidate is in an unsupported lifecycle state
- a staged candidate is not on a `FAILED` staging row
- an existing `(source, external_id)` mapping points at a different canonical target

### Verification Proof

#### Dry Run

`Ghastly` candidate `c6d73a89-3dd1-44e8-a0f6-3ab6d0823c0b` dry-run produced:

- `identity_resolution = MAP_ALIAS`
- `external_mappings` upsert plan
- target `card_print_id = 595ec587-4dcb-4f81-b43b-6ad61da852f3`
- canonical target `Gastly` in `me02`

#### Apply

Applied via:

- `node backend/warehouse/promotion_stage_worker_v1.mjs --candidate-id=c6d73a89-3dd1-44e8-a0f6-3ab6d0823c0b --apply`

Result:

- mapping row inserted into `public.external_mappings`
- `mapping_id = 120836`
- `source = justtcg`
- `external_id = pokemon-me02-phantasmal-flames-ghastly-common`
- `card_print_id = 595ec587-4dcb-4f81-b43b-6ad61da852f3`

Candidate result:

- previous state: `STAGED_FOR_PROMOTION`
- next state: `ARCHIVED`
- previous staging id: `ff8cd603-30d6-4d9c-b81e-56254f293f9f`

Trace event inserted:

- `ALIAS_MAPPING_EXECUTION_SUCCEEDED`

#### Canon Drift Check

Before and after:

- `select count(*) from public.card_prints where set_code = 'me02';`
- result remained `130`

No canon row count changed.

### Mixed Outcome Proof

The same dry-run pass still leaves the non-alias row alone:

- `Charcadet - 022` does **not** resolve to `MAP_ALIAS`
- it remains on the failed staged path and is not given an alias escape hatch

That proves the pipeline can now split mixed outcomes correctly:

- alias rows map
- slot conflicts still block

### Operational Outcome

Alias rows no longer stop at “known but unexecutable”.

They now follow a deterministic bounded terminal path:

`candidate -> classify -> resolve MAP_ALIAS -> write external_mappings -> archive candidate`

without creating any new canonical row and without disturbing canon counts.
