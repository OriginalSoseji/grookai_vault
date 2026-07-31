# Card Visual Search Production Database Capability

Date: 2026-07-29

GitHub Actions run: `30469205941`

Producing SHA: `5d36b6d0195f05851b188cba83ad2a9d9ea39163`

## Execution Boundary

- Transaction read-only: `true`
- Row payloads exported: `false`
- Database writes: `false`
- Migration apply: `false`
- Embeddings: `false`
- Public activation: `false`

## PostgreSQL

- Server: PostgreSQL `17.4`
- `pg_trgm`: installed, version `1.6`, schema `extensions`
- `unaccent`: installed, version `1.1`, schema `extensions`
- `vector`: installed, version `0.8.0`, schema `extensions`
- `btree_gin`: available, not installed
- `btree_gist`: available, not installed

## Existing Visual Storage

| Relation | Kind | Rows | RLS | Policies |
| --- | --- | ---: | --- | ---: |
| `card_print_visual_descriptions` | table | 1,078 | enabled | 0 |
| `card_visual_description_runs` | table | 12 | enabled | 0 |

Both tables are private service-role stores. Their lack of RLS policies is
intentional fail-closed behavior because direct `anon` and `authenticated`
grants were revoked by the applied migration.

`card_print_visual_descriptions` stores the versioned generated row and
`visual_attributes` Fact Graph, but it does not provide the normalized
artwork-group, document, evidence, or release-pointer structures required by
the governed ranker.

## Existing Search Surface

Existing generic card search relations/functions are present:

- `v_card_search`
- `v_cards_search_v2`
- `v_print_identity_search_documents_v1`
- `search_card_prints_v1`
- `search_cards`
- `search_cards_in_set`
- `search_print_identity_v1`

No current relation or RPC persists or serves the Card Visual Search V1
projection.

## Search Readiness

The production database supports:

- GIN full-text indexes;
- trigram indexes and similarity;
- accent normalization;
- pgvector storage and vector indexes after an embedding model and dimensions
  are separately governed.

No extension installation is required for structured/lexical Visual Search V1.
Vector infrastructure is available but must remain unused until the embedding
gate is explicitly approved.
