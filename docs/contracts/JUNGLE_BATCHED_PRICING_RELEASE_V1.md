# Jungle edition pricing with bounded snapshots

This candidate starts from deployed pricing producer
`43596c1db2d09711945fa32f8c1333ac93375e0c`. V1_12 adds the existing reviewed
Jungle edition assignment lane while retaining V1_11 snapshot batching,
qualification policy V1_3, reconciliation and activation guards.

The older Jungle V1_10 worker must not replace production: it contains the
unbounded snapshot insert that V1_11 repaired. Candidate selection uses the
existing deployed V2 view and records immutable edition assignment IDs through
candidates, decisions and snapshots. Ordinary products retain generic assignment
behavior. An edition source subtype cannot publish through a generic assignment.

The 128 Jungle catalog links already exist in production in staged state. This
worker candidate neither creates those links nor grants authority to bind or
activate them. The old catalog staging intents are consumed and must not replay.
Production bindings and assignments remain absent at the October 11 readback.

The separately versioned binding executor now admits only a sealed 128-row plan,
checks the exact source run, product and observation hashes at execution time,
and holds a transaction advisory lock. Its only allowed writes are 128 binding
inserts, 128 link activations and 128 binding activations. Replay, partial state,
changed source evidence and any additional table write fail closed. An uncertain
commit is resolved through the readback-only mode instead of retrying the write.

V71 local qualification against a disposable clone of production schema 430
passed 16 checks. It proved rollback, every injected failure boundary, source
tamper rejection, unplanned trigger-side-effect rejection, a durable commit,
lost-commit-acknowledgement recovery, replay rejection and preservation of all
372 public/Auth/Storage/ledger scopes other than the two planned tables. Five
saved copies, assignment rows and publication remained unchanged. This proves
the executor locally; it did not connect to production and did not make prices
live.

Release still requires normal release checks and an immutable producer, worker
deployment/readback before binding activation, then refreshed production
source/schema/preservation evidence, governed production rollback and exact
commit, shadow publication and independent exact current-price verification.
Existing 945 repaired MTG prices, saved copies, older labs and failed evidence
remain protected.

No migrations are introduced by this worker-only candidate. Deployment must
verify the already-released Jungle schema and its functions separately. This
checkout's older migration inventory is not a production schema apply package.

The external `jungle_binding_review_20261011` artifacts and shared worker recovery
checkpoint record actual test and release status. Candidate source is not proof
of deployment or live Jungle prices.
