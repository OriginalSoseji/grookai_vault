# Chat Safety And Play Content Rating Checkpoint

Date: 2026-08-17

Status: PRODUCT ENFORCEMENT IMPLEMENTED / DATABASE FOLLOW-UP GATED

## Context

Google Play Content ratings was submitted and directly read back under
`App content > Actioned`. Grookai also needed a clear safety boundary for its
signed-in, card-centered collector messages before release.

## Completed

- Added deterministic `CHAT_SAFETY_POLICY_V1` implementations for web and
  Flutter.
- Screened new-message and reply paths before database work.
- Added a second web-server check in the central interaction insert helper.
- Preserved ordinary collector language rather than using a broad profanity
  or sentiment ban.
- Added explicit report reasons and optional details on web.
- Added explicit conversation report reasons on Flutter.
- Added founder-only `/founder/trust-safety` review using existing
  `trust_reports` rows.
- Preserved all existing messages, reports, blocks, and Vault data.
- Recorded the actioned Google Play content-rating state.

## Verification

- Chat Safety and existing trust/store targeted Node checks: `12/12` passed.
- Targeted Flutter policy, composer, and printing-identity checks: `8/8`
  passed.
- Full repository contract suite: `2,214/2,214` passed.
- Web TypeScript check: passed.
- Web lint with zero warnings: passed.
- Strict production Next build: passed; `/founder/trust-safety` compiled as a
  dynamic founder route.
- Targeted Flutter analysis: no issues.
- `git diff --check`: passed.

## Current Truth

- Supported Grookai clients prevent the defined safety risks from being sent.
- Existing two-way blocks still prevent new contact.
- Reports remain staged until a founder marks them reviewing, actioned, or
  dismissed.
- No database migration was created or applied in this gate.
- No existing user content was modified or deleted.
- Play Console still requires Advertising ID and photo/video permission
  declarations, plus the remaining store-listing media work.

## Database Limitation

Strict linked-schema preflight identified the unrelated local-only migration
`20260816160000_mtg_tcgplayer_market_publication_v1.sql`. Under the migration
maintenance contract, Chat Safety V1 cannot safely stack a new trigger behind
that unresolved ledger state.

Therefore, a deliberately crafted direct Supabase insert remains outside the
current screening boundary. This limitation prevents a claim of bypass-proof
moderation and must remain visible in release evidence.

## Invariants

- Never rewrite or delete existing messages to enforce a new policy.
- Never let a report automatically alter active content or account state.
- Never use service-role review access without founder entitlement first.
- Never mark Play declarations complete without direct console readback.
- Never apply a chat migration until strict migration history is clean and the
  exact production boundary is approved.

## Exact Next Gates

1. Deploy the verified product changes through the normal release lane.
2. Recheck the submitted IARC `chat moderation` response after deployment; the
   active client/server screening and founder review queue may require changing
   that answer from the pre-implementation response.
3. Resolve the pending MTG migration ledger state in its own governed task.
4. Add and approve bypass-proof database moderation/rate-limit enforcement.
5. Complete the Advertising ID and photo/video permission declarations in Play.
6. Verify store listing media and submission readiness before release.
