# Grookai Evolve - Index

Ground truth: `main @ 07cd2368` on July 10, 2026.

This is the front door for Product Evolution work. When an epic moves, update this file first so planning docs, mockups, and shipped code do not drift apart.

## Current Epic State

| Epic | Status on main | Plan doc | Key implementation commits | Notes |
| --- | --- | --- | --- | --- |
| E1 - Interest Graph | Implemented and backfilled | [E1_PLAN.md](./E1_PLAN.md) | `d8e56f40`, `6b9e6d89`, `be391766` | `watches`, `card_events`, trigger-first emitters, and backfill are live. |
| E2 - Notifications | Implemented and live-proven | [E2_PLAN.md](./E2_PLAN.md) | see E2 plan | Pushes proven on real iPhones; cold/background tap proof remains a carry-forward. |
| E3 - Want Match | Implemented and live-proven | [E3_PLAN.md](./E3_PLAN.md) | see E3 plan | Instant want-match delivery and minimal digest reschedule path are live. |
| E4 - Pulse | Implemented | [E4_PLAN.md](./E4_PLAN.md) | `823293d4`, `487f7c9d`, `6faf8e06`, `c8503620`, `ace78c7b`, `06a493a7` | Pulse is the leftmost Feed segment; no infinite scroll. |
| E5 - Card Journeys | Implemented | [E5_PLAN.md](./E5_PLAN.md) | `094ab38e`, `67b183d8`, `4e9c105b`, `a1de69b7`, `0319eb06`, `7637b8cf` | Authenticated app-only Journey section. Moments are rolled up, not spammed per duplicate add. |
| E6 - Retention Onboarding | Implemented | [E6_PLAN.md](./E6_PLAN.md) | `92965890`, `6018b3a4` | Skippable bottom-sheet ladder on Feed/Search landing. |
| E7 - Founder Metrics | Implemented, backfilled, scheduled | [E7_PLAN.md](./E7_PLAN.md) | `72000b03`, `bb78c138`, `0a56e928`, `da702761`, `49e15eb6`, `2b0d48f8` | Weekly rollup cron is active; first automatic Monday run remains the next operational check. |
| E8 - Public Pages & Share Loop | Implemented | [E8_PLAN.md](./E8_PLAN.md) | `496b9cbf`, `fa440bc4`, `7d922584` | Card pages are not rebuilt; public Journey context is counts-only. |
| E9 - Collector Memories | Implemented behind feature flag | [E9_PLAN.md](./E9_PLAN.md) | `645412ad`, `ce986fba`, `dbd80eae`, `07cd2368` | Private owner-only exact-copy Memories UI on `VaultGvviScreen`. Requires `COLLECTOR_MEMORIES_ENABLED=true` until intentionally enabled by default. |

## Design And Mockup Governance

- E9 is private by contract. It is not a social surface, feed, public page, SEO surface, Wall surface, Pulse item, Journey item, or share/export feature.
- Any mockup named `Collector Memory Card.dc.html` that includes a shareable certificate, Instagram preview, watermark, year-in-memories export, public card, or share sheet is retired for E9. That concept can be considered later as an E8/share-loop-style feature, but it must not be implemented inside Collector Memories.
- E9 UI source of truth is the shipped private exact-copy flow:
  - Screen: `lib/screens/vault/vault_gvvi_screen.dart`
  - Service: `lib/services/vault/collector_memory_service.dart`
  - Contracts: `supabase/migrations/20260710100000_product_evolution_e9_collector_memories_contracts_v1.sql`
  - Tests: `test/collector_memory_service_test.dart`

## Loose Document Hygiene

The `.dc.html` design and planning artifacts referenced by the July 10 cohesion check are not checked into this repository. They should be archived or renamed in their source folder, not in repo history.

Recommended external archive moves:

- `Grookai Vault UI Audit.dc.html` -> superseded by UX Audit v2.
- `Codex Implementation Plan.dc.html` -> superseded by Codex Implementation Plan v2.
- `Product Evolution Codex Prompts.dc.html` -> superseded by Product Evolution Codex Prompts v2.
- `*-print-*.dc.html` -> print/export byproducts, not source docs.

Do not delete them unless all external citations have been checked.

## Carry-Forwards

- E2/E4 push tap proof: killed-app and background push tap should route correctly on iOS and Android.
- E7 first automatic Monday run after July 10, 2026 should update the latest completed week idempotently.
- E9 visual polish: Memories currently works but is buried below existing exact-copy photo controls. A follow-up should move the section higher in the exact-copy hierarchy.
- Future personalization: [Grookai Signature](./GROOKAI_SIGNATURE_ROADMAP_V1.md) should eventually turn approved visual-description, market, and behavior signals into collector-level taste explanations. It is not part of the current card visual description agent v1.
