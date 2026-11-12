# Square canonical artwork verification and operation

Authority: [SQUARE_CANONICAL_ARTWORK_V1](../contracts/SQUARE_CANONICAL_ARTWORK_V1.md).

New work requires GROOKAI_SQUARE_ARTWORK_ENABLED=true in the website runtime and
the same GitHub repository variable for the scheduled worker. All existing
owner/catalog/commerce controls still apply. Pause only the artwork flag to stop
new uploads; pending artwork requests continue to reconcile under the ordinary
catalog lease. Do not delete requests, image history or physical stock claims.
New scheduled image work also respects the seller's automatic-sync setting;
manual sync can request artwork. Recovery of retained image requests continues
when new artwork is disabled. Verify requested image ordering for an attach or
primary-image change, rather than treating image presence alone as completion.

Qualification commands:

```powershell
node --test backend/square/tests/*.test.mjs apps/web/src/lib/square/artworkRoute.test.mjs
node backend/square/qualify_sandbox_artwork_v1.mjs <private-sandbox-env> <new-private-output-directory>
npm --prefix apps/web run typecheck
npm --prefix apps/web run lint
npm run web:build:strict
```

The web commands require the explicitly isolated test environment. Never inherit
an operator's canonical production environment in a local build/server. The
Sandbox qualifier writes no production request, stock count or payment. Its
versioned intents, receipts and proof stay outside the checkout.

Before activation, verify the unchanged production project/schema and current
source, hosted checks and original Samsung531 installation. Read a public artwork
descriptor for an eligible copy. Verify that a private/ineligible copy is 404 and
that an unavailable/blocked image cannot be uploaded. Upload one live canary
through SquareCatalogService.syncArtwork, then independently retrieve its item
and IMAGE object. Verify its SKU, name, price, tax settings and quantity against
the prior snapshot. Inspect the actual image in Square POS. Backfill active mapped
copies under the same leases and bounded worker operations; never recreate a
missing mapping or unarchive a disposed card to add an image.

Read-only operational queries (through the official linked SQL CLI):

```sql
begin isolation level repeatable read read only;
select status, count(*)
from grookai_square.operations
where payload->'artwork'->>'version'='SQUARE_ARTWORK_V1'
group by status;
select id, target_id, status, error_code,
       payload->'artwork'->>'mode' as mode,
       payload->'artwork'->>'sha256' as artwork_sha256,
       created_at, finished_at
from grookai_square.operations
where payload ? 'artwork'
order by created_at desc limit 30;
select status, error_code, started_at, finished_at
from grookai_square.worker_runs
where environment='production' order by started_at desc limit 10;
rollback;
```

Do not print payloads: normalized image bytes are retained in the private durable
request. Application credentials are not part of those requests. A timeout must
retain the same request/key; provider image-list readback precedes every retry.
Changed seller images or mappings require review, not replacement. Confirm at
least one hosted worker run performs work (not just a busy skip), and re-read the
known completed sale after backfill: it must remain one disposition with zero
provider stock. No Samsung update or schema migration is part of this extension.
