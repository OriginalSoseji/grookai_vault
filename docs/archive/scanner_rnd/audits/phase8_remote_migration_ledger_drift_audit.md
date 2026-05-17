# Phase 8 Remote Migration Ledger Drift Audit

Date: 2026-04-29

## Summary

Status: SCHEMA MATCHES PHASE 8 TARGET STATE

The remote schema matches the terminal state produced by these local Phase 8 migrations:

- `supabase/migrations/20260428234000_phase8_embedding_lookup_foundation_v1.sql`
- `supabase/migrations/20260429002000_embedding_lookup_v1_pgvector_rpc.sql`

The remote migration ledger does not contain either Phase 8 version. This is migration history drift only for the audited Phase 8 objects.

Recommended safe path: mark both Phase 8 versions as applied with `supabase migration repair`. Do not run a forward-only reconciliation migration and do not rollback/reapply, because the schema is already in the expected final state.

No schema changes, data writes, migration repairs, deletes, or embedding indexing were performed during this audit.

## Scope

Audited local migration files:

- `20260428234000_phase8_embedding_lookup_foundation_v1.sql`
- `20260429002000_embedding_lookup_v1_pgvector_rpc.sql`

Audited remote objects read-only:

- `public.card_embeddings`
- `public.embedding_lookup_v1(double precision[], text, integer)`
- `vector` extension
- `supabase_migrations.schema_migrations`

The remote inspection was performed through Postgres catalog `SELECT` queries inside a read-only transaction.

## Local Migration Expectations

### `20260428234000_phase8_embedding_lookup_foundation_v1.sql`

Expected effects:

- Ensure `public.card_embeddings` exists with:
  - `card_print_id uuid primary key references public.card_prints(id) on delete cascade`
  - `embedding double precision[]`
  - `model text`
  - `created_at timestamptz not null default now()`
- Ensure table and column comments for embedding/model semantics.
- Ensure `card_embeddings_model_idx` exists on `(model)`.
- Create `public.embedding_lookup_v1(double precision[], text, integer)` as an array-based cosine lookup.
- Function return shape at this intermediate step: `card_print_id`, `model`, `distance`, `similarity`.
- Grant function execute to `authenticated` and `service_role`.

### `20260429002000_embedding_lookup_v1_pgvector_rpc.sql`

Expected final effects:

- Ensure schema `extensions` exists.
- Ensure extension `vector` exists in schema `extensions`.
- Drop the intermediate `embedding_lookup_v1(double precision[], text, integer)`.
- Recreate `public.embedding_lookup_v1(double precision[], text, integer)` as a pgvector-backed cosine nearest-neighbor lookup.
- Final function return shape: `card_print_id`, `model`, `distance`.
- Function is `language sql`, `stable`, `security definer`, with `search_path = public, extensions`.
- Function casts `query_embedding` and `card_embeddings.embedding` to `extensions.vector` and orders by `<=>`.
- Grant function execute to `authenticated` and `service_role`.

## Remote Schema Evidence

Remote database metadata:

- Database: `postgres`
- User used for inspection: `postgres`
- Postgres server version: `17.4`

### `public.card_embeddings`

Remote table exists with expected core definition:

| Column | Type | Nullability | Default | Comment |
| --- | --- | --- | --- | --- |
| `card_print_id` | `uuid` | not null | none | none |
| `embedding` | `double precision[]` | nullable | none | `Array of float values representing the embedding vector (model-specific).` |
| `model` | `text` | nullable | none | `Name/identifier of the embedding model used.` |
| `created_at` | `timestamp with time zone` | not null | `now()` | none |

Remote table comment:

- `Numeric embedding vectors per card_print, for AI search/matching.`

Remote constraints:

- `card_embeddings_pkey`: `PRIMARY KEY (card_print_id)`
- `card_embeddings_card_print_id_fkey`: `FOREIGN KEY (card_print_id) REFERENCES card_prints(id) ON DELETE CASCADE`

Remote indexes:

- `card_embeddings_pkey`: unique btree on `card_print_id`
- `card_embeddings_model_idx`: btree on `model`

Additional remote security posture:

- Row-level security is enabled.
- Policy `service role all` exists for `service_role`.
- No table triggers were present.
- Table privileges are present for `postgres` and `service_role`; no direct `anon` or `authenticated` table grants were observed.

The RLS posture is not a Phase 8 mismatch. It is explained by earlier local migration history, specifically `20260304173000_enable_rls_remaining_tables.sql`, which classifies `card_embeddings` as a system table, enables RLS, revokes public/anon/authenticated table access, and creates the `service role all` policy.

### `public.embedding_lookup_v1`

Remote function found:

- Signature: `embedding_lookup_v1(double precision[],text,integer)`
- Arguments: `query_embedding double precision[], model_filter text DEFAULT NULL::text, limit_n integer DEFAULT 10`
- Result: `TABLE(card_print_id uuid, model text, distance double precision)`
- Language: `sql`
- Volatility: `stable`
- Security: `SECURITY DEFINER`
- Config: `search_path=public, extensions`

Remote function body matches the final pgvector migration behavior:

- Builds an input CTE with:
  - `query_embedding as embedding_array`
  - `query_embedding::extensions.vector as embedding_vector`
  - `array_length(query_embedding, 1) as dims`
- Reads from `public.card_embeddings`.
- Requires non-null embeddings and positive dimensions.
- Requires `array_length(ce.embedding, 1) = input.dims`.
- Applies optional `model_filter`.
- Computes distance with `(ce.embedding::extensions.vector <=> input.embedding_vector)::double precision`.
- Orders by `ce.embedding::extensions.vector <=> input.embedding_vector asc, ce.card_print_id asc`.
- Clamps limit with `greatest(1, least(coalesce(limit_n, 10), 50))`.

The prior intermediate `similarity` return column is absent, as expected after `20260429002000`.

Function execute privileges observed include `PUBLIC`, `anon`, `authenticated`, `postgres`, and `service_role`. This is not a Phase 8 mismatch because PostgreSQL grants function execute to `PUBLIC` by default unless explicitly revoked, and the Phase 8 migrations do not revoke it.

### Vector Extension

Remote extension status:

- Extension: `vector`
- Version: `0.8.0`
- Schema: `extensions`
- Type `vector` is present in schema `extensions`

This matches the final pgvector migration expectation.

## Migration Ledger Evidence

Remote migration ledger table shape:

- `version text`
- `statements ARRAY`
- `name text`

Recent remote ledger window from `20260422000000` through `20260430000000`:

| Version | Name |
| --- | --- |
| `20260422120000` | `display_image_read_model_unification_v1` |
| `20260422133000` | `wall_sections_data_model_v1` |
| `20260423000000` | `wall_sections_remove_public_gating_v1` |
| `20260423150000` | `contract_runtime_layer_v1` |
| `20260427090000` | `phase7_fingerprint_index_v1` |

Target Phase 8 version lookup returned no rows:

- `20260428234000` missing
- `20260429002000` missing

The narrower Phase 8 ledger window from `20260428000000` through `20260430000000` returned no rows.

Observed adjacent context: local migration `20260427110000_scanner_fingerprint_index_v1.sql` is also not present in the recent ledger window, but it is outside this Phase 8 embedding migration audit and was not schema-audited here.

## Match Assessment

Schema match status: MATCH

The remote schema matches the final state of the two audited Phase 8 migrations:

- `public.card_embeddings` has the expected columns, comments, constraints, and index.
- `public.embedding_lookup_v1` has the expected final pgvector signature, return shape, search path, and body behavior.
- `vector` is installed in the expected `extensions` schema.
- No Phase 8 reconciliation DDL is required.

Known non-issues:

- RLS and the `service role all` table policy are pre-existing local-history posture, not Phase 8 drift.
- Default/public function execute privilege is not a mismatch because the Phase 8 migrations do not revoke default function execute.

## Findings

1. The Phase 8 schema is present remotely.
2. The Phase 8 final RPC definition is present remotely and supersedes the intermediate array cosine function.
3. The vector extension is present remotely in `extensions`.
4. The remote migration ledger is missing both audited Phase 8 versions.
5. The drift is ledger-only for the audited Phase 8 embedding migrations.

## Recommended Safe Path

Recommended action after this audit, if the operator chooses to align history:

```powershell
supabase migration repair --status applied 20260428234000 20260429002000
```

Rationale:

- The schema already matches the final Phase 8 migration state.
- A forward-only reconciliation migration would be unnecessary and could create duplicate/no-op DDL noise.
- Rollback/reapply is not recommended because the table and function are already live, and rollback/reapply creates avoidable data and availability risk.
- Repairing the ledger is the narrowest operation that aligns migration history with the already-applied schema.

This command was not run during the audit.

## Termination Criteria

- Schema match/mismatch documented: complete.
- Migration ledger gap documented: complete.
- Safe repair path recommended: complete.
- No schema/data/history changes performed: complete.
