# Collector Vercel Preview V1

Date: September 10, 2026 (America/Denver).
Authority: founder requested a live Vercel preview without replacing production,
then instructed "Ok build it."

## Scope

- Preserve the approved local worktree and all 97 baseline routes.
- Separate branch `preview/collector-vercel-20260910` and isolated Vercel project.
- Protected Preview deployment only, no production domain, main merge, or mobile release.
- Real anonymous public catalog reads under the existing database RLS boundary.
- Self-hosted images through the existing public Grookai image reader.
- No administrative credentials, authenticated sessions, database/Storage writes,
  approvals, migrations, paid AI calls, or copied private collection data.

## Isolation

`NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY=true` is frozen at build time.
Common database transports force the public key, discard user credentials,
permit only REST reads and named catalog read RPCs, and reject redirects.
Administrative client creation fails. Build rejects a supplied service key.
HTTP proxy blocks server actions and write APIs; account routes show a preview
notice. Public set metadata POST is a read-only exception. Image GETs use the
public production image endpoint with no forwarded session. No shared project
environment settings or production deployment targets are modified.

## Honest Limits

This is a design/catalog preview, not a signed-in staging environment.
Private Vault, Wall, Binders, uploads, and account actions are intentionally
unavailable. Pricing retains the existing authenticated publication boundary.
Save and editable condition/quantity are not simulated. No public production
readiness claim is implied; speed optimization remains a separate follow-up.

## Recovery

Original source and running local site remain in
`C:/grookai_vault_collector_real_local` on `design/collector-real-local`.
Full 82-file preservation, hashes, and patch:
`C:/grookai_vault_operator_artifacts/collector_polish/2026-09-11T02-14-22-994Z_real_integration`.
No production rollback should be necessary because no live target is changed.
