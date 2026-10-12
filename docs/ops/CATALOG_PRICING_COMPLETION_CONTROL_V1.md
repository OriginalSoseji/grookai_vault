# Catalog and Pricing Completion Control V1

The production control plane currently answers whether each bounded job ran, stayed fresh, and reconciled its own output. It does not answer whether Grookai has every intended card or a current price for every selected product. A healthy job can therefore coexist with a large unresolved backlog.

This control adds six outcome lanes. Each lane has one objective, one explicit backlog, one proposed completion owner, and a zero-backlog completion rule:

| Lane | Purpose | Completion rule |
|---|---|---|
| TCGPlayer pricing | Resolve identity and eligibility, then publish exact prices | selected = mapped = eligible = snapshot |
| Japanese master index | Repair canonical mappings, exact printings, and images | every gap count is zero and completeness is proven |
| One Piece catalog | Repair exact printings and images | every gap count is zero and completeness is proven |
| Cross-TCG sealed | Adjudicate pending candidates and mappings | pending and unmapped are zero and completeness is proven |
| New-set admission | Turn verified discoveries into admitted catalog sets | candidate and review backlogs are zero |
| Funko catalog | Establish a measurable catalog contract and ingestion path | implementation exists with measured source coverage |

Run the read-only audit against a current production control-plane report:

```text
node scripts/audits/catalog_pricing_completion_v1.mjs --control-plane=<path-to-live_control_plane_v1.json> --out-root=<artifact-directory>
```

Use `--require-complete` only as a gate. It exits with status 2 while any lane remains incomplete. The audit performs no database writes and authorizes no catalog or pricing publication.

The lane backlog dimensions can overlap. For example, a Japanese card may be both unmapped and missing an exact printing. Do not add those dimensions together as if they were distinct cards.

The pricing backlog audit partitions every non-published row by its first policy reason so each row has exactly one repair owner:

```text
node scripts/audits/tcgplayer_pricing_backlog_v1.mjs --out-root=<artifact-directory>
```

It also preserves all reason occurrences for diagnosis because a row can fail several checks. The mutually exclusive primary-reason counts must equal the full non-published count or the audit is invalid.
