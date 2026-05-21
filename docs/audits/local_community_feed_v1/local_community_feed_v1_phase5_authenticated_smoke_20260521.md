# Local Community Feed V1 - Phase 5 Authenticated Smoke

Date: 2026-05-21

## Target

Commit:

```text
24af6611 local-community: add internal nearby feed UI
```

Preview deployment:

```text
https://grookai-vault-4hdju69a2-sosejis-projects.vercel.app
```

GitHub deployment status:

```text
success
```

## Smoke Status

Classification:

```text
BLOCKED_BY_ENVIRONMENT_ACCESS
```

The preview deployment exists and GitHub reports a successful Vercel deployment. Direct unauthenticated requests to the preview URL return:

```text
401
```

This response occurs at the deployment access layer before the app route can be exercised. It is not evidence of a Local Community Feed app failure.

## Completed Checks

- Branch `scanner-v4-card-present-gate` pushed at `24af6611`.
- GitHub deployment for `24af6611` exists.
- Deployment status is `success`.
- `/network/nearby` is present in the Next.js build output.
- Local production route smoke passed before push:
  - with `LOCAL_COMMUNITY_FEED_V1_ENABLED=true`
  - unauthenticated `/network/nearby` redirects to `/login?next=%2Fnetwork%2Fnearby`
- Pre-push shipcheck passed:
  - release secret guard
  - preflight
  - contracts test
  - runtime health
  - quarantine/deferred reports
  - web typecheck
  - web lint
  - strict web build
  - Flutter analyze
  - Flutter tests

## Blocked Authenticated Checks

The following checks still require a browser session that can access the Vercel preview and authenticate as an opted-in collector:

- signed-in `/network/nearby` loads
- nearby cards render
- only opted-in local collectors appear
- block/mute exclusions remain effective in UI
- owner links route to public walls
- card links route to parent `/card/<gv_id>` routes
- no raw UUIDs appear in rendered UI
- no exact location appears in rendered UI
- preview/staging flag behavior is visible in navigation

## Manual Smoke Checklist

Use a browser session that can access the preview deployment.

1. Open:

   ```text
   https://grookai-vault-4hdju69a2-sosejis-projects.vercel.app/network/nearby
   ```

2. Sign in as an opted-in local collector.
3. Confirm the page title/copy is:

   ```text
   Nearby Collectors
   Fresh cards from your local collector area
   ```

4. Confirm the Network section nav includes:

   ```text
   Cards
   Nearby
   Collectors
   ```

5. Confirm feed cards render with:

   - card image or safe fallback
   - card name
   - set name/code and card number
   - source badge: Wall, Trade, Sell, Showcase, or Network
   - locality label
   - owner display name
   - View card
   - View wall

6. Click a card.
7. Confirm it opens the parent card route:

   ```text
   /card/<parent_gv_id>
   ```

8. Click `View wall`.
9. Confirm it opens:

   ```text
   /u/<owner_slug>
   ```

10. Inspect visible text and links for private leakage.

Pass criteria:

- no raw user UUIDs
- no exact latitude/longitude
- no postal code
- no local grid identifier
- no raw vault item instance ID
- no public child printing route

## Decision

Do not broaden enablement yet.

Phase 5 remains blocked until the authenticated preview browser smoke is completed through a session that can pass Vercel preview access and app auth.

## No-Change Confirmations

- No DB writes.
- No migrations.
- No scanner changes.
- No pricing changes.
- No Species Dex denominator changes.
- No public child route enablement.
- No production enablement.
