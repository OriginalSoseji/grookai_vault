# CONTRACT_PRECEDENCE_MATRIX_V1

Status: Active runtime support document  
Source of truth for contract names: [docs/CONTRACT_INDEX.md](/C:/grookai_vault/docs/CONTRACT_INDEX.md)

## Scope

This matrix covers the contracts and checkpoints that are actually in `CONTRACT_RUNTIME_LAYER_V1` scope.

Runtime scope names must match `docs/CONTRACT_INDEX.md` exactly. The following names were found in worker docs or playbooks but are **not authoritative** because they do not appear in the index:

| Drifted Name | Current Repo Surface | Runtime Decision |
| --- | --- | --- |
| `WAREHOUSE_SOURCE_IDENTITY_CONTRACT_V1` | docs/contracts + worker docs | Excluded from runtime scope |
| `STAMPED_IDENTITY_RULE_V1` | docs/contracts + worker code comments | Excluded from runtime scope |
| `SET_CLOSURE_PLAYBOOK_V1` | docs/contracts | Excluded from runtime scope |

If one of those names appears in runtime scope, execution must fail closed.

## Deterministic Authority Order

1. Identity / Frozen Canon Contracts
2. Existing Stabilization / Checkpoint Authority
3. Schema / DB Constraints
4. Ingestion Contracts
5. Enrichment Contracts
6. Pricing Contracts
7. View / UI Contracts

Rules:

- Higher-precedence authority wins.
- Lower-precedence authority may not silently override higher authority.
- If the conflict cannot be resolved deterministically, runtime must block the write.
- If the payload is preservable but non-canonical, runtime must quarantine it.
- Runtime never self-authorizes ambiguous canon mutation.

## Runtime Matrix

| Contract / Checkpoint | Status | Authority Class | Conflict Behavior | Winning Case | Losing Case |
| --- | --- | --- | --- | --- | --- |
| `IDENTITY_CONTRACT_SUITE_V1` | Frozen | Identity / Frozen Canon | Blocks any lower-precedence identity override | Printed identity lane rejects guessed external remap | Source-backed discovery cannot replace a lawful printed identity |
| `IDENTITY_PRECEDENCE_RULE_V1` | Frozen | Identity / Frozen Canon | Printed identity outranks external identity | Promotion chooses printed identity owner | External payload cannot force alias remap when printed owner exists |
| `GV_ID_ASSIGNMENT_V1` | Frozen | Identity / Frozen Canon | Rejects malformed or colliding `gv_id` writes | `gv_id_assignment_worker_v1` assigns a unique planned `gv_id` | Compatibility lanes cannot mint a fallback `gv_id` |
| `GV_ID_VARIANT_SUFFIX_CONTRACT_V2` | Active | Identity / Frozen Canon | Deterministic suffix rules win over loose namespace guesses | Variant suffix path writes `GV-...S` / `RH` / `PB` / `MB` only when builder resolves it | Manual worker input cannot invent a new suffix family |
| `CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1` | Frozen | Identity / Frozen Canon | `card_print_identity` uniqueness outranks permissive legacy rows | Active identity uniqueness stays authoritative | Legacy missing identity rows cannot justify bypassing subsystem rules |
| `REPRINT_ANTHOLOGY_SET_CONTRACT_V1` | Active | Identity / Frozen Canon | Set-level identity model wins over carve-out shortcuts | Anthology set routes through explicit identity model | Older set-code carve-outs cannot override anthology model |
| `PRINTED_IDENTITY_CONTRACT_V1` | Frozen | Identity / Frozen Canon | Printed number / total signals outrank loose text-only match | Warehouse bridge requires lawful printed identity signals | Free-text same-name match cannot self-authorize canon |
| `GROOKAI_GUARDRAILS` | Active | Existing Stabilization / Checkpoint Authority | Missing scope, unknown names, or missing enforcement map hard fail | Registered execution with exact contract names proceeds | Undeclared execution cannot write canon |
| `NO_ASSUMPTION_RULE` | Active | Existing Stabilization / Checkpoint Authority | Ambiguity fails closed or quarantines | Exact-match image enrichment proceeds | Ambiguous image group cannot write representative image |
| `STABILIZATION_CONTRACT_V1` | Active | Existing Stabilization / Checkpoint Authority | Canonical tables beat compatibility surfaces | Writes target `card_prints`, `external_mappings`, `canon_warehouse_*` | Compatibility views cannot become mutation truth |
| `CONTRACT_RUNTIME_LAYER_V1` | Active Checkpoint | Existing Stabilization / Checkpoint Authority | No canon-affecting write completes without scope, validation, and post-write proof | Scoped worker logs proof-backed success | Validation-free write is incomplete and invalid |
| `PRODUCTION_READINESS_GATE_V1` | Active Checkpoint | Existing Stabilization / Checkpoint Authority | Keeps fail-closed safety gates in place | Runtime rejects drift before deploy | Speed-only shortcut cannot bypass audit requirements |
| `reprint_anthology_identity_model_v1` | Active Checkpoint | Existing Stabilization / Checkpoint Authority | Confirms anthology identity model before promotion | Promotion stage honors anthology checkpoint | Legacy same-number carve-out loses |
| Existing DB uniqueness / FK / trigger constraints | Live schema | Schema / DB Constraints | DB rejects violating rows before commit | `external_mappings(source, external_id)` uniqueness holds | Runtime cannot paper over a real DB uniqueness violation |
| `INGESTION_PIPELINE_CONTRACT_V1` | Active | Ingestion Contracts | Raw-first staging beats direct canon mutation | Bridge/classification stage warehouse rows first | Direct canon write from raw discovery loses |
| `EXTERNAL_SOURCE_INGESTION_MODEL_V1` | Active | Ingestion Contracts | External sources may stage evidence, not define canon | Source-backed mapping upsert passes after exact checks | External batch cannot claim canon authority by itself |
| `EXTERNAL_DISCOVERY_STAGING_BOUNDARY_V1` | Active | Ingestion Contracts | Discovery staging remains non-canonical until explicit approval | Warehouse candidate insert stays in staging lane | Discovery row cannot appear as canon card |
| `TCGDEX_SOURCE_CONTRACT_V1` | Active | Ingestion Contracts | Only deterministic source-backed TCGdex rows may inform enrichment | One-set exact-match TCGdex representative image write succeeds | Missing/ambiguous TCGdex row loses |
| `SOURCE_IMAGE_ENRICHMENT_V1` | Active | Enrichment Contracts | Exact-match-first image rules beat fallback or guessed imagery | Representative image writes only when exact slot is empty | Batch cannot overwrite exact image truth |
| `REPRESENTATIVE_IMAGE_CONTRACT_V1` | Active | Enrichment Contracts | Representative image must remain distinct from exact image | `representative_image_url` fills fallback lane only | Representative image cannot replace `image_url` |
| `REPRESENTATIVE_IMAGE_FALLBACK_RULE_V1` | Active | Enrichment Contracts | Sibling-base fallback allowed only inside lawful identity family | Stamped sibling fallback uses verified sibling base | Cross-family image fallback loses |
| `PRICING_ENGINE_V1` | Active | Pricing Contracts | Pricing mappings cannot override identity truth | Exact source-backed JustTCG mapping upsert succeeds | Pricing worker cannot remap a conflicting identity owner |
| `GV_VAULT_INSTANCE_CONTRACT_V1` | Active | View / UI Contracts | Exact-copy ownership beats grouped compatibility surfaces | Future owner-write scopes must target `vault_item_instances` | Grouped compatibility rows cannot author canon ownership |
| `WALL_SECTIONS_SYSTEM_CONTRACT_V1` | Active | View / UI Contracts | Quarantine and grouped drift may not surface as public wall truth | Public views remain section-safe and quarantine-free | Quarantined record cannot appear on Wall or Sections |

## Live DB Reality That Affects Precedence

Audited on 2026-04-23 against live `SUPABASE_DB_URL`:

- `card_print_identity` active uniqueness is already DB-enforced.
- `card_prints.gv_id` uniqueness is already DB-enforced.
- `external_mappings(source, external_id)` uniqueness is already DB-enforced.
- `canon_warehouse_promotion_staging` already enforces one active row per candidate.
- `wall_section_memberships` already enforces exact-copy ownership safety.

Those DB rules sit below frozen identity/stabilization authority in conflict resolution, but above lower-precedence write lanes during actual commit.
