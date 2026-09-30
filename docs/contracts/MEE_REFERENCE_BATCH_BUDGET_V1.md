# MEE reference batch budget V1

The September 30 reference refresh exhausted its three-hour service timeout after
creating a 5,000-target batch. Its sequential provider loop kept results only in
memory and buffered child logs until exit. The exact slow card is not recoverable
from that run. Disk space was available; increasing storage does not fix this.

The Pokemon reference adapter now uses two workers when an API key is configured,
one otherwise. All attempts, including retries, pass through one paced start gate
(250 ms authenticated, 2,100 ms anonymous). Request ceilings are 15,000 and 900;
HTTP 429/auth failures stop immediately. These are local ceilings, not claims about
remaining provider quota. The provider remains the authority for account limits.
Source: https://docs.pokemontcg.io/getting-started/rate-limits .

Mapping reads have a five-minute aggregate deadline and 30-second request limits.
Provider acquisition has a 90-minute budget, reserving 80 seconds before starting
another HTTP attempt. Existing per-attempt limits/retries/HTTPS/identity checks
remain. Five failed card fetches stop more work; in-flight workers are drained.
The unbounded alternative fetch transport is explicitly rejected.

Each exact response or sanitized failure is appended under a unique
`mee_reference_progress_<timestamp>/responses.jsonl`, with its fetch timestamp.
The input batch bytes hash, enriched mapping inputs and atomic progress counts are
retained alongside it. This directory is outside the normalizer acquisition glob.
It is diagnostic evidence, not an automatically reusable approval or resume cache.

An interrupted, rate-limited, budget-limited or failed fetch batch exits nonzero
before creating a final acquisition artifact, so the existing shell chain cannot
normalize or write the warehouse from that partial result. Provider 404/null results
remain explicit missing coverage. Completed acquisitions retain the original
start timestamp; they do not advance timestamps on cached or partial evidence.

No mappings, canonical identities, public prices or schema are changed. Release
from the independently pinned MEE branch; preserve deployed artifact-history and
latest-per-source normalization fixes. Require bounded concurrency, retry pacing,
budget exhaustion, quota, identity, disk-failure and incomplete-publication tests,
then actual immutable runtime and full reference-refresh receipts. A small provider
probe or deployment alone does not prove successful nightly coverage.
