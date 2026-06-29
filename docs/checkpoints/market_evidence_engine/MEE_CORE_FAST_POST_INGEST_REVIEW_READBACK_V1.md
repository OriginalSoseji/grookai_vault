# MEE-CORE-FAST-POST-INGEST-REVIEW-READBACK-V1

The default post-ingest review check should use this fast readback before any heavy row-manifest audit.

Why: the older detailed orchestrator can time out because it joins dashboard and signal summary views. This readback answers the daily operational question from `market_evidence_review_dispositions` first.

The readback is internal-only and does not publish prices.

Current result:

- Remaining safe internal action rows: `0`
- Reviewer candidate rows: `0`
- Reference policy hold rows: `0`
- Unknown evidence rows: `0`
- Public/app-visible/market-truth rows: `0`
