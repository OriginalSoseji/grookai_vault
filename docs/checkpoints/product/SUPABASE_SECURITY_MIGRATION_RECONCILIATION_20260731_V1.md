# Supabase Security Migration Reconciliation 2026-07-31 V1

## Status

Repository reconciliation candidate. The two migrations documented here were
already applied to the linked production project on 2026-07-30. This change
restores their exact SQL and audit contracts to `main`; it does not execute SQL
or mutate production data.

## Context

The 2026-07-31 release audit found migration versions `20260730193000` and
`20260730194000` in linked Supabase history but absent from `main`. Their source
commit, `ec8dfbb59ffbd195798a6a18eb3f1d6e5007f0a0`, also contained an obsolete
web-runtime upgrade and was never merged. The web upgrade was independently
rebuilt, reviewed, and merged through PR #152.

## Decision

Restore only these already-applied database artifacts from the original commit:

- `20260730193000_security_advisor_hardening_v2.sql`
- `20260730194000_vault_post_to_wall_schema_repair_v1.sql`
- the focused contract test
- the original point-in-time audit report

Do not cherry-pick the obsolete web changes. Do not rerun either migration.

## Production Truth

Linked migration history reports both versions as applied. The original audit
records rollback-only rehearsal, atomic apply, row-preservation checks, role
probes, and production readback. This reconciliation preserves that historical
evidence without presenting it as a fresh security-advisor result.

The fresh 2026-07-31 Supabase security-advisor readback reports 134 findings:

| Finding | Level | Count |
| --- | --- | ---: |
| security-definer view | error | 4 |
| anonymous-executable security-definer function | warning | 16 |
| authenticated-executable security-definer function | warning | 112 |
| leaked-password protection disabled | warning | 1 |
| PostgreSQL security upgrade available | warning | 1 |

The function warnings include governed app RPCs and cannot be mass-revoked or
mass-converted without breaking collector workflows. The four filtered public
views were deliberately retained after a prior rollback-only compatibility
probe showed that converting them to invoker context broke required reads.
These findings require an object-by-object authority and compatibility audit;
they are not closed by restoring migration history.

`supabase db lint --linked --level error` could not be refreshed because the
locally configured database password was rejected. This checkpoint does not
convert that transport/authentication failure into a pass.

## Invariants

- Production migration history and repository migration files must reconcile.
- Already-applied migration SQL must remain byte-stable.
- No client privilege may be widened to silence an advisor finding.
- No governed RPC may be revoked or converted without caller, ownership, RLS,
  and product-journey proof.
- Public filtered views must not be changed without an equivalent bounded read
  interface and compatibility smoke.
- No database write is authorized by this repository reconciliation.

## Next Gate

Build a versioned security-definer allowlist that classifies every advisor
object as public read, authenticated owner action, internal helper, trigger, or
service-only entrypoint. Revoke only confirmed accidental direct execution in a
rollback-only transaction, preserve intentional RPCs with explicit contracts,
and design bounded replacements for the four owner-context views before any
production apply.
