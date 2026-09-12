# Collector Website Adoption - Local V1

Date: September 10, 2026, America/Denver.
Authority: Founder accepted the full website candidate, including card-focused
set/binder covers; requested Pulse Discover and a real implementation without push.
Base: bcbf8bab754528bd78f65e983bb270c27de48579.
Worktree: C:/grookai_vault_collector_real_local.
Branch: design/collector-real-local (push remote LOCAL_ONLY_DO_NOT_PUSH).

## Preserved Authority

Approved candidate remains at http://127.0.0.1:3163 in the separate
`C:/grookai_vault_collector_polish_preview/apps/collector-site-preview`.
Do not edit this candidate or the earlier reference at port 3162.

Approval snapshot:
`C:/grookai_vault_operator_artifacts/collector_polish/2026-09-10T11-24-48-316Z_full_site_candidate/full-site-candidate.zip`.
Archive SHA-256: 39b575f60109eb2d5b44541cf62d01299c5d5ec58a13b2a8c9c9a8d9ef3bff61.
122 archived files extracted and hash-verified. This is local-disk recovery, not
off-machine disaster recovery.

## Implementation

- Apply the approved typography, neutral surfaces, charcoal navigation, green
  actions, contained artwork and dense readable controls to the real apps/web.
- Keep all original page routes and navigation destinations, including desktop
  secondary tools and the original five-tab mobile dock.
- Keep Pulse Discover as an explicit tab linked to real collector discovery.
- Set/binder covers remain about actual cards. No arbitrary fixture cards or
  inferred ownership, no blur hiding the art, no new database image pointers.
- Reuse actual services, Supabase clients, canonical/printing identity, governed
  prices, ownership actions, moderation, scanner, memories and access gates.
- No sample accounts, prices, messages, decisions or localStorage ownership in
  production source. Existing theme preferences remain unchanged.
- Preserve existing empty/error/unpriced and image-truth states.

## Verification And Boundaries

Build/typecheck, focused existing contracts, presentation regressions,
desktop/phone browser tests, image/overflow checks and route inventory parity.
Read existing local Supabase first; do not reset, migrate, seed or mutate it.
The existing local instance currently has zero card rows and 508 sets, so it
cannot demonstrate full catalog or real collection correctness. Tests against
isolated component fixtures must be identified as such, not live-data proof.

No production data mutation, no production settings, no dependency upgrades,
no pricing or auth policy changes, no migration, no Storage upload/repoint.
No push, deployment, PR, merge or store build. Flutter remains unchanged.

## Completion

A locally built real website with the adopted design, preserved actual business
logic, explicit verification evidence and remaining runtime limitations. The
founder can inspect it before choosing when to connect/release it. No automatic
release follows this work.
