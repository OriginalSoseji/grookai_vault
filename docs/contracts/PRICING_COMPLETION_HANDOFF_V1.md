# Pricing completion handoff V1

This is a data-only handoff validator for the existing guarded maintenance path,
not an executor or a new permission grant. It accepts retained artifact bytes,
queue items and context; it reads no files, environment, network or database and
executes no commands. It cannot load a worker-supplied adapter.

`createPricingCompletionHandoffV1({verifyReviewedAuthority,reserveIntent})`
exposes `prepare({items,artifacts,reviewEvidence,context,now})`. Both callbacks
must come from a separately trusted controller. Neither callback is installed
by the preparation worker. The verifier must authenticate actual exact-scope
review and rerun existing selection/master-authority/source gates against the
bound data. Merely echoing worker claims is not authentication. The reservation
capability must atomically persist every requested one-use replay key; an
in-memory set is only a test fixture, never a production ledger.

The initial supported scope is deliberately the existing ordinary mapping-insert
path: 1–25 verified English Pokemon products in category 3, USD TCGPlayer Market,
existing canonical parents, ordinary supported source subtypes, and
`missing_active_source_mapping`. Unknown dimensions, variants, inactive mapping
updates, canonical creation and other games remain with their governed lanes.
The existing reviewed Gym/MEP paths are not replaced or implicitly authorized.

The binding covers exact source observation/subtype sets, source run/sync IDs,
freshness, evidence digests, queue generations, producing/plan commits, target
project, artifact bytes, fingerprints and reviewed parent identities. Source
product and target-parent reservations prevent replay through renamed plans,
new approvals or regenerated queue items. A crash after reservation requires
reconciliation; it is not permission to reserve/apply again.

Output contains fixed adapter references for canonical maintenance, the existing
guarded publication worker and the exact application read model. It is deeply
frozen and reports `executionEnabled:false` and `queueResolutionAllowed:false`.
A future trusted controller must qualify and call the existing adapters; this
module cannot perform that work. Mapping-applied and price-published are
intermediate stages. Uncertain commit acknowledgement forbids automatic replay.
Only independently authenticated exact application pricing can close a queue item.

Tests exercise artifact tampering, unsupported scope, missing/fake authority,
source drift, duplicate identity, replay/reservation failure and intermediate
status handling inside the isolated runner. They do not prove a deployed review
authority, durable reservation service or production execution path exists.
