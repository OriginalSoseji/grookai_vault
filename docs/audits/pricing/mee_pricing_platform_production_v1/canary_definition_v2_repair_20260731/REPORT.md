# TCGPlayer Market Canary Definition V2 Repair

- Status: `passed`
- Source definition: `backend/pricing/canaries/tcgplayer_market_canary_100_v1.json`
- Repaired definition: `backend/pricing/canaries/tcgplayer_market_canary_100_v2.json`
- Expected rows: `100`
- Replaced source identity: `tcgplayer:168245:normal`
- Replacement source identity: `tcgplayer:168245:holofoil`

The removed Normal subtype is not carried forward as current evidence.
The replacement Holofoil printing is the same canonical card and was
already exact-mapped, visually verified, and shadow-verified in the
same frozen source shadow cycle used by the original canary definition.

No database write or publication activation occurred while generating
this replacement definition.
