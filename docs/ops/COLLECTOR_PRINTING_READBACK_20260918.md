# Collector Printing Readback Repair

Date: 2026-09-18 UTC.

## Scope

This narrow web repair follows the verified Master Index / printing repairs.
It changes no database records, identities, finishes, pricing, ownership,
images, release visibility or ingestion configuration.

Live Solgaleo-GX in the 2019 Perfection deck displayed SM104/SM025 despite
the verified database coordinate SM104 with no printed denominator. The
collector resolver now uses the existing set identity model to prevent an
anthology's membership count from becoming a card denominator. Explicit
card-level denominators remain authoritative. Standard-set fallback is intact.

Exact GV-IDs are recognized before free-text interpretation. Replica
underscores, Japanese product IDs, dots and finish suffixes are preserved.
An identifier's finish/set words do not become implicit query filters.
Ordinary collector queries and explicit request filters remain unchanged.

## Preservation And Verification

Isolated branch: `fix/collector-printing-readback-20260918`, based on current
main `a14388f689235d62b3165c1dd88aaa4c562ab186`. Existing dirty Trainer Kit and
Prize Pack work remains untouched in its original worktree.

Passed: 24 presentation/parsing runtime tests; 56 surrounding search,
pricing, ownership and release contracts; TypeScript; focused ESLint.
The isolated fixture build compiled and typechecked, then failed sitemap
generation because no isolated service credential was supplied. This is not
a passing production build. No release or environment guard was weakened.

The managed commit hook stopped before commit because this new checkout lacks
the root backend dependencies. The documented full-hook environment also needs
the local Supabase database; a read-only `docker ps` request did not respond,
and the Docker service is stopped. Only that newly launched status client was
terminated. No daemon, container, existing process or release hook was changed.
The patch is staged, not committed, pushed or deployed. Restore the local test
environment and use the unchanged managed hook before release.

September 18 follow-up: installed the exact root lockfile with
`npm ci --ignore-scripts --no-audit --no-fund` (58 packages). This changes no
lockfile or application source. Docker's service is still stopped; attempting
to start it returned a service-access error. No daemon restart, hook bypass,
new commit or deployment occurred. Full release verification is still pending.

Live production before this repair: `dpl_GarRhResnBeFerzaFtXzyrCf7WZX`, READY,
from main `a14388f689235d62b3165c1dd88aaa4c562ab186`. Preserve this deployment
for website rollback; a website rollback must never reverse data repairs.

## Remaining Release Proof

- Pass normal repository checks and the configured production build.
- Verify the deployed source SHA matches the reviewed patch.
- Read back Solgaleo SM104 without a fabricated denominator, Mewtwo & Mew-GX
  71/236, and separate Poipole 55/131 and 107/214 through live card pages.
- Verify exact historical GV-ID search and ordinary collector search.
- Verify printing selection and ownership without claiming a displayed button
  proves a successful Vault write. Production user collections are preserved.

Latest data queue v58 records 2,466 repaired / 686 unresolved. Separate English
provenance repairs total 5,598 with 1,664 remaining. These web fixes do not
close database findings or certify the full catalog.

Operator receipts are under
`C:/grookai_vault_operator_artifacts/retrospective_printing_audit_20260917`.

## Resumed Release Verification

September 18: Docker Engine now responds and the existing local Supabase project
is healthy on ports 54321/54330. No daemon or database was restarted or reset.
The stopped Windows helper service is not proof that the Linux engine is down.
Remote main has advanced only to `83b2283a09ad1893e10fcd27d5d8ceb6dbaf4d6d`
through the language Master Index refresh; preserve that data commit on merge.
Run the unchanged managed commit hook against explicit local-only credentials.
Release receipts belong in the operator artifact directory above. A local commit
or green test does not establish production deployment or live collector proof.
