# Collector Hosted Staging And Preservation V1

September 11, 2026, America/Denver. Founder authorized the hosted signed-in staging
plan and required preservation of both the current live site and the new design.

## Preserved Versions

Keep live project/domains/deployment and production database unchanged. Record the
fresh live deployment ID/commit, verify a Git bundle, and archive its source. Keep
the original read-only collector preview. Preserve the candidate base bundle plus
all changed/new files with SHA-256 readback. No branch force-push or main merge.
Deployment history alone is not a permanent backup. A website rollback does not
roll back database writes; no production schema change is part of this task.

## Hosted Scope

Create one independently named Micro Supabase project in the existing organization
and one isolated protected Vercel project. No production domains, Git auto-deploy,
production keys, production users, private collections, restore-drill reuse, worker
schedules or public launch. Micro is approximately $10/month, plus usage; no larger
compute, paid addon or full production database copy. Keep signup closed until
bounded synthetic-account verification. Use sample catalog evidence only, preserve
image/source provenance, and never present synthetic prices as market data.

Freeze target IDs and schema/data manifests before applying only to the new empty
staging project. Verify RLS, grants, no job activation, cross-account isolation,
images and representative workflows. Unverified features remain disabled. Platform
schema/auth/storage internals are not replaced with a local dump. All secrets stay
outside Git with restricted ACL; public receipts contain identifiers/hashes only.

## Handoff

Record two independently usable URLs and recovery procedures. Read back live
deployment/domain preservation after hosted work. Do not replace live automatically
after staging passes. Report any remaining evidence gaps precisely.
