# ENRICH-13J Core Identity Batch Real Apply V1

Generated: 2026-06-15T20:59:24.898Z

## Summary

- Packages applied: 5
- Parent rows in batch: 124
- Child printings handled in batch: 343
- External mappings handled in batch: 124
- Blocked rows excluded: 208
- Stop findings: 0
- Proof hash: `2ae81edff0109cb3dcc008ae4ffafef07260b1bcefcbf2f09648a3324d003c02`

## Applied Packages

| Order | Package | Rows | Children | Mappings | Dependencies cleared | Owners present after |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | ENRICH-13D1 | 56 | 168 | 56 | true | 0 |
| 2 | ENRICH-13E1 | 40 | 99 | 40 | true | 0 |
| 3 | ENRICH-13C1 | 20 | 60 | 20 | true | 20 |
| 4 | ENRICH-13F1 | 4 | 12 | 4 | true | 4 |
| 5 | ENRICH-13G1 | 4 | 4 | 4 | true | 0 |

## Global Guards After

```json
{
  "active_identity_duplicate_groups": 0,
  "active_external_mapping_duplicate_groups": 0,
  "child_printing_duplicate_groups": 0
}
```

## Blocked Lanes Preserved

| Blocker | Rows | Status |
| --- | --- | --- |
| ENRICH-13B1 | 203 | blocked_domain_contract_required |
| ENRICH-13E-MANUAL-LUXRAY | 1 | blocked_manual_review |
| ENRICH-13F-BASE-VS-SUFFIX | 4 | blocked_split_owner_proof_required |

## Stop Findings

None.
