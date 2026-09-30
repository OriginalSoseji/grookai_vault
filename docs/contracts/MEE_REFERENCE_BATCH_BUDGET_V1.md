# MEE reference batch budget V1

The September 30 reference refresh exhausted its three-hour service timeout after
creating a 5,000-target batch. Its sequential provider loop kept results only in
memory and buffered child logs until exit. The exact slow card is not recoverable
from that run. Disk space was available; increasing storage does not fix this.

Direct readback found no provider key. The prior batch needed 1,877 individual
lookups, exceeding the documented 1,000-request anonymous daily quota before
retries. Filtered search probes returned HTTP500, while an unfiltered page worked.

The live adapter now reads the catalog in 250-card pages ordered by ID, with a
single worker and 2,100ms minimum between all request starts, including retries.
The 20,670-card observed catalog needs83 pages rather than1,877 card requests.
Every page must report the expected page/size/count and the same total; IDs must
be valid and unique across all pages. At most200 pages/50,000 cards are admitted.
Only exact previously mapped external IDs are selected for reference evidence.
The scan may stop early if every requested exact ID is found. Such a result marks
`all_requested_ids_found`, not `catalog_scan_complete`; it establishes no negative
claims about unvisited pages. Any missing requested ID requires the full scan.
No names, set labels, prices or newly discovered IDs create mappings.
All adapter layers share exact identifier validation. The provider's published
Unseen Forces identifiers `ex10-?` and `ex10-!` are admitted explicitly alongside
the existing alphanumeric/underscore/hyphen grammar. Their punctuation is retained;
single-card requests encode the path component and still require exact response
identity. Arbitrary punctuation, query strings and path syntax remain rejected.
Source: https://github.com/PokemonTCG/pokemon-tcg-data/blob/master/cards/en/ex10.json .
HTTP429/auth failures stop immediately. The local900-request ceiling is not a
claim about remaining daily quota. The provider remains authoritative.
Source: https://docs.pokemontcg.io/getting-started/rate-limits .
Pagination: https://docs.pokemontcg.io/api-reference/cards/search-cards/ .

Mapping reads have a five-minute aggregate deadline and 30-second request limits.
Provider acquisition has a 90-minute budget, reserving 80 seconds before starting
another HTTP attempt. Single-card requests retain their three-attempt policy.
Catalog pages allow three windows of nine transient attempts, separated by a
60-second cooldown. Each window uses exponential delays capped at30 seconds.
The full refresh twice exhausted nine attempts on HTTP500 (pages23 and43); a
subsequent direct read of page23 recovered. The cooldown permits a short upstream
outage to clear without discarding all completed pages. These windows all spend
the SAME 900-request and90-minute batch budgets; the larger per-page allowance
does not reserve27 requests for every page or reset any budget. A deadline or
request-limit failure immediately stops further requests, including after cooldown.
Every retry delay is checked against the shared deadline before sleeping, including
the60-second cooldown; it must leave room for a bounded80-second HTTP attempt.
An exhausted budget stops before the sleep instead of overrunning during cooldown.
Exhaustion still fails closed; auth/quota/certificate/identity errors never gain
retries. Per-attempt transfer/process limits and HTTPS remain unchanged.
Any failed/truncated/changed/duplicate page stops the catalog scan.
The unbounded alternative fetch transport is explicitly rejected.

Each exact page response or sanitized failure is appended under a unique
`mee_reference_progress_<timestamp>/responses.jsonl`, with its fetch timestamp.
The input batch bytes hash, enriched mapping inputs and atomic progress counts are
retained alongside it. This directory is outside the normalizer acquisition glob.
It is diagnostic evidence, not an automatically reusable approval or resume cache.

An interrupted, rate-limited, budget-limited or failed fetch batch exits nonzero
before creating a final acquisition artifact, so the existing shell chain cannot
normalize or write the warehouse from that partial result. A page404 is a failed
acquisition, not evidence that individual cards are missing. Only a complete
catalog can establish absent exact IDs. Completed acquisitions retain the original
start timestamp; they do not advance timestamps on cached or partial evidence.

No mappings, canonical identities, public prices or schema are changed. Release
from the independently pinned MEE branch; preserve deployed artifact-history and
latest-per-source normalization fixes. Require bounded concurrency, retry pacing,
budget exhaustion, quota, identity, disk-failure and incomplete-publication tests,
then actual immutable runtime and full reference-refresh receipts. A small provider
probe or deployment alone does not prove successful nightly coverage.
