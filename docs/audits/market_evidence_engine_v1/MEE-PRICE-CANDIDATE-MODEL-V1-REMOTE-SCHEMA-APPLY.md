# MEE-PRICE-CANDIDATE-MODEL-V1-REMOTE-SCHEMA-APPLY

- Mode: `targeted_remote_schema_apply_only_corrected_grants`
- Applied object: `public.v_market_evidence_price_candidates_v1`
- SQL hash: `3ac60c51510538bd002caaf4a1456a1797dbbe3f7e140b0bad64565990b201ff`
- Package fingerprint: `69f466157ff2a5ce4b3c852a7ecb772eb77a06a3595635af04dd17ea910ff791`
- Findings: `none`

## Readback

```json
{
  "total_candidate_rows": 16833,
  "priced_candidate_rows": 16833,
  "can_publish_price_directly_rows": 0,
  "publishable_rows": 0,
  "app_visible_rows": 0,
  "market_truth_rows": 0,
  "raw_single_high_confidence_internal_candidates": 988,
  "slab_high_confidence_internal_candidates": 820,
  "reference_context_rows": 14572
}
```

## Grants

```json
[
  {
    "grantee": "postgres",
    "privilege_type": "DELETE"
  },
  {
    "grantee": "postgres",
    "privilege_type": "INSERT"
  },
  {
    "grantee": "postgres",
    "privilege_type": "REFERENCES"
  },
  {
    "grantee": "postgres",
    "privilege_type": "SELECT"
  },
  {
    "grantee": "postgres",
    "privilege_type": "TRIGGER"
  },
  {
    "grantee": "postgres",
    "privilege_type": "TRUNCATE"
  },
  {
    "grantee": "postgres",
    "privilege_type": "UPDATE"
  },
  {
    "grantee": "service_role",
    "privilege_type": "SELECT"
  }
]
```
