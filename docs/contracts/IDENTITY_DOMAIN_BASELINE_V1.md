# IDENTITY_DOMAIN_BASELINE_V1

Status: ACTIVE
Type: Domain Baseline / System Initialization Contract
Scope: Declares the initial `identity_domain` baseline for existing legacy `sets` and `card_prints` rows.

---

## Statement

All existing `card_prints` are declared:

```text
pokemon_eng_standard
```

EXCEPT:

- `tcg_pocket` -> `tcg_pocket_excluded`
- future explicitly governed domains

## Reason

Legacy DB is known to be English-only.
Classification is not derived from stored evidence.
It is declared as system initialization.

## Scope

- Applies only to existing rows
- Future ingestion must follow proof-based classification

## Guardrails

- This baseline initializes system state for legacy rows only
- It does not convert `tcg_pocket` into a canonical domain
- It does not replace proof-based classification for future ingestion
- It does not amend Battle Academy law
- It does not amend `card_print_identity` uniqueness law

## Result

After baseline initialization:

- `sets.identity_domain_default` becomes explicit for existing rows
- `card_prints.identity_domain` becomes explicit for existing rows
- future proof-based domain assignment remains mandatory for new ingestion
