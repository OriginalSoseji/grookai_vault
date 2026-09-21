# Complete artist search — September 20, 2026

The founder reported missing Yuka Morii cards and requested the fix. Read-only
public-client inspection found 195 matching canonical records (194 English and
one Japanese); deployed search returned at most 64 and mobile requested only 32.
The prior artist release is live at `8f8751d37d69652085716a3d036cd3430a43f76b`,
deployment `dpl_EHQ8ZbC6zxF4Unwkz7Q3iG9WzyAY`. Preserve it for rollback.

The isolated change is in `C:/grookai_vault_artist_release_20260920` on
`fix/artist-search-pagination`, based on current main. Existing root checkout,
background workers, database records/schema and feature flags are preserved.
Canonical sanity: project `ycdxbpibncqcchqiihfz`, 170,658 cards, 3,399 sets,
32,903 traits. All production diagnostics are read-only.

Artist retrieval now reads every catalog page using equality against resolved
artist names and a unique-ID cursor. RLS and language scope remain authoritative.
The artist path bypasses ordinary search's 88-candidate/64-result relevance caps.
Artist, set, year, text, identity, finish, image and ownership filtering and the
requested ordering run before response pagination. Value sorts retain the
existing explicit completeness guard; no incomplete value order is published.
Artist timeouts fail visibly rather than returning an empty successful page.

The web client requests `pagination=1&offset=0&limit=48`. Artist responses include
`pagination: {total_count, offset, next_offset, has_more}`. Show more first reveals
downloaded rows, then fetches the next page. Query changes cancel stale requests;
page failures preserve current cards and allow retry. Pagination totals reflect
server filters; additional local image/identity filters are labeled separately.

Requests without `pagination=1` receive all matching artist rows. This deliberately
overrides their small legacy `limit` only for artist browsing, so the installed
mobile app can reveal the complete result without a binary release. Other search
types retain their existing limits. Pricing stays authenticated and deferred;
provisional and canonical cards remain separate. No provisional artist matches
are invented. Large transition-link lookups are read in bounded ID groups.

Regression coverage includes 1,234 artist records across three database pages,
failure on a later database page, language scope, all 195 results across response
pages without duplicates, and complete responses for legacy 32-result clients.
Full release and hosted verification receipts are recorded outside the repo at
`C:/grookai_vault_operator_artifacts/artist_pagination_20260920`.
