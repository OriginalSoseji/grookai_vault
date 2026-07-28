# TCGPlayer Market Read Performance V1

- Audit version: `TCGPLAYER_MARKET_READ_PERFORMANCE_AUDIT_V1`
- Policy version: `TCGPLAYER_MARKET_PERFORMANCE_POLICY_V1`
- Commit: `fde6f6db675c4ca72d2eac9ac38ed9ad4467e6ec`
- Branch: `pricing/mee-productization-v1`
- Status: `passed`
- Required p95: `<= 500 ms`
- HTTP credential mode: `service_role_transport`
- Direct database role proof: `passed`

The HTTP measurements use the production PostgREST endpoint and the exact
`get_market_pricing_read_model_v1` RPC consumed by web and Flutter. The
stored credential is a service credential, so this is transport/runtime
performance proof rather than an end-user JWT timing claim. The same RPC is
also executed directly under the `authenticated` database role.

| Case | IDs | p50 ms | p95 ms | p99 ms | Errors | Status |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| parent_detail_1 | 1 | 82.1 | 85.968 | 92.916 | 0 | passed |
| parent_grid_25 | 25 | 84.064 | 98.581 | 103.586 | 0 | passed |
| parent_grid_all_current | 99 | 87.524 | 108.263 | 164.119 | 0 | passed |
| printing_detail_1 | 1 | 81.922 | 87.986 | 101.367 | 0 | passed |
| printing_batch_50 | 50 | 85.002 | 90.533 | 101.333 | 0 | passed |
| printing_batch_all_current | 100 | 88.953 | 106.88 | 120.386 | 0 | passed |

## Findings

- none

