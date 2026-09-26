# Storefront catalog baseline recovery V1

This work recovers three already-applied migrations from the authenticated remote
ledger, preserving their versions and bytes. It does not author new catalog truth
or repeat a production apply. Source hashes and the read-only ledger receipt hash
are in `docs/audits/vendor_store_catalog_recovery_v1/source-recovery.json`.

The source chain contains411 migrations:408 previously proven files unchanged,
plus20260920095000,20260920173000,20260921000500. The remote baseline has400 rows;
the exact eleven existing storefront/billing/commerce migrations remain pending.

Dedicated local project: `grookai-store-catalog-20260921`, under
`.local/integration/vendor-store-catalog-recovery`, using23621 API,23622 database,
23624 mail,23628 shadow,23640 web. Internal Docker network, fixed loopback relay,
pinned PostgreSQL17.6.1.113 image, max_worker_processes=0 before migrations.
No linked-project metadata or production credentials enter the fixture.

`prepare_vendor_store_catalog_recovery_v1.mjs` runs once to create the400-file
baseline. It refuses existing resources, occupied ports, changed source, or less
than2GB free disk. Preserve every earlier project and consumed helper.

`AuditLinkedSchema -VendorStoreCatalogBaselineAudit` permits only the exact eleven
pending IDs and the fixed236xx target. PrePush, arbitrary IDs, combined exceptions,
and alternate inspection/environment targets fail before remote access. The
existing pinned schema/security inspection engine compares both400-row ledgers
and the public schema read-only. No apply authorization is introduced.

After a fresh successful strict audit, one bounded full reset replays411 files in
this new empty project. An intent marker prevents repeating an interrupted reset.
Post-replay guards verify exact hashes, ledger, empty fixtures and disabled flags.
The footprint permits precisely the recovered index and Energy validator/constraint
addition, replacement of the prior Energy/event constraint, and definition changes
to the serializer and public printing RPC; existing permissions remain identical.
All unrelated objects must remain identical to the retained408-file environment.

Only after baseline/replay, integration regressions, and normal commit gates pass
is recovery complete. Notification schema authoring remains paused until then.
Release requires current catalog dependency review and separate authorization.
