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
PASS_WITH_OPERATOR_BROWSER_EVIDENCE
```

The preview deployment exists and GitHub reports a successful Vercel deployment. Direct unauthenticated requests to the preview URL return:

```text
401
```

This response occurs at the deployment access layer before the app route can be exercised. It is not evidence of a Local Community Feed app failure.

Authenticated operator smoke was completed in a browser session with preview access.

Operator evidence:

- `/network/nearby` loaded successfully.
- Page header rendered:
  - `Nearby Collectors`
  - `Fresh cards from your local collector area`
- Network section nav rendered:
  - `Cards`
  - `Nearby`
  - `Collectors`
- Nearby activity rendered public local collector cards.
- Visible feed examples included cards from `Poke Javi`.
- Visible source badges included:
  - `Showcase`
  - `Wall`
  - `Following`
- Visible locality label rendered as `Founder Test Area`.
- Visible card actions rendered:
  - `View card`
  - `View wall`
- Visible route targets remained parent-card and public-wall oriented.
- No raw user UUID, exact location, postal code, local grid identifier, raw vault instance ID, or public child-printing route was visible in the screenshot evidence.

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

## Authenticated Checks

The following checks are satisfied by operator browser evidence:

- signed-in `/network/nearby` loads
- nearby cards render
- owner links are presented as public wall actions
- card links are presented as parent card actions
- no raw UUIDs appear in rendered UI
- no exact location appears in rendered UI
- preview/staging flag behavior is visible in navigation

Remaining check that requires a targeted negative fixture:

- block/mute exclusion should be proven with an explicit blocked or muted local collector fixture before broader rollout.

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

Phase 5 authenticated preview smoke passes.

Do not broaden enablement yet. The next gate should prove block/mute exclusion with an explicit negative fixture, then move to a small internal UI refinement pass if the exclusion proof holds.

## No-Change Confirmations

- No DB writes.
- No migrations.
- No scanner changes.
- No pricing changes.
- No Species Dex denominator changes.
- No public child route enablement.
- No production enablement.
