# Full Rollout Gate Inputs V1

These immutable, read-only evidence inputs support the seven-cycle TCGPlayer
Market Production V1 observer. They are copied from the governed local audit
packages that passed before signed-in full rollout.

## Coverage

- Policy: `TCGPLAYER_MARKET_COVERAGE_POLICY_V1_2`
- Producing commit: `0adeba22428e798496ce3141b34f32cabd6d8ccd`
- Source run: `TCGPLAYER-MARKET-FULL-SHADOW-33267538361-publication`
- Status: `passed`
- Coverage: `95.293%`
- Unclassified gaps: `0`
- `coverage/summary.json` SHA-256: `9de5a4793dd205b4c275810b8f983acbf106c82840ebef5a5723fc2b75c8b3f3`
- `coverage/run_plan.json` SHA-256: `2c9830a051f5eddea4466b0175e936accd183f16e22691fc53a3fe254f389f82`

## Performance

- Policy: `TCGPLAYER_MARKET_PERFORMANCE_POLICY_V1`
- Producing commit: `00e03d05fc8f6f80ecf5523140611991e617f581`
- Status: `passed`
- Cases: `6`
- Request errors: `0`
- Row-count mismatches: `0`
- `performance/summary.json` SHA-256: `75774460cced0c301ebde72e12206ecae8906fcdfc1fa641ec6ae57d6be89375`
- `performance/run_plan.json` SHA-256: `574a193b7117216587e223971e69a13400544d648e58ca7e251660e0b6b34bb1`

## Boundaries

- These files contain no credentials.
- They authorize no database, publication, grant, mapping, pricing, or customer-state writes.
- The scheduled observer may only read production state and copy these inputs
  into a new hashed observation artifact.
- Replacing either evidence lane requires a new governed audit and new hashes.
