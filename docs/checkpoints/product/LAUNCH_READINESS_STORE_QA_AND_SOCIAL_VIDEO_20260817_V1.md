# Launch Readiness, Store QA, and Social Video - 2026-08-17 V1

## Context

The release needed objective evidence for four launch tracks: store readiness,
production app QA, collector onboarding, and pricing trust. Parallel work also
needed a safe way to produce social-media drafts from a real emulator without
giving automation any publishing authority.

Work was isolated in `agent/launch-readiness-store-qa-v1` from base commit
`f326d5735e80d7843f56c013e7a1c7dbedd9fed0`.

## Decisions

- Store metadata and privacy answers are repository contracts and are checked
  independently from external console state.
- Production crawling uses a disposable account, performs no app-data writes,
  and verifies account deletion.
- Native onboarding evidence uses a temporary account and proves cleanup.
- Pricing trust is verified from current publication through immutable trace
  and source warehouse evidence without requiring a customer-owned card.
- Signed-out Pokemon browse uses public canonical rows directly. Exact-name
  search uses an indexed equality path first; complex input retains the web
  resolver as a second path.
- Social automation can direct and record the emulator, but cannot authenticate
  to or publish on a social platform.

## Current Truths

### Store readiness

- Repository metadata contract: valid.
- Current build contract: `1.0.0+297`.
- Privacy, support, and deletion URLs: valid Grookai HTTPS URLs.
- App Store privacy and Google Play Data Safety answer packs: present.
- Submission readiness: blocked by external state and missing media assets.
- Missing media: Apple iPhone/iPad screenshots, Google 512px icon, Google
  feature graphic, and four Google phone screenshots.
- App Store Connect could not be verified from an authenticated session.
- The available Google account does not have a Play developer account.

### Production application QA

- Production web crawl: `20/20` route cases passed across phone and desktop.
- Covered Pokemon and One Piece search, sets, and card detail plus Vault,
  Binders, Wall, and Pulse.
- Temporary production crawl account: deleted and verified absent.
- Production crawl app-data writes: `0`.
- Android signed-out blank browse: `32` cards with rendered images.
- Android exact `Charizard` browse: `31` cards with rendered images.
- The signed-out search repair prevents the degraded web resolver from making
  simple exact-name searches wait before trying canonical public data.

### Collector onboarding

- Android first-run onboarding reached `Claim your collector link`.
- Required first-step copy was verified from the real accessibility tree.
- Temporary account was deleted and verified absent.
- Customer records touched: `0`; persistent app-data writes: `0`.

### Pricing trust

- Read-only live sample: `20/20` passed.
- Current exact prices present in the sampled read: `98`.
- Every sampled value reconciled publication, read model, immutable trace, and
  warehouse evidence with exact English printing/finish constraints.
- Findings: `0`; database writes: `0`.

### Social-media emulator agents

- Governing blueprint:
  `docs/projects/social_media_emulator_agents/SOCIAL_MEDIA_EMULATOR_AGENTS_V1.md`.
- The scenario validator rejects publishing modes and posting actions.
- Canary: signed-out Explore -> exact Charizard search -> rendered cards ->
  scroll.
- Canary completed `15/15` actions.
- Raw MP4: `3,504,826` bytes.
- MP4 SHA-256:
  `d6783a9e95a2847a2ad0756c9e6dd1ce1cd88a76536d6cbd33ff89ea9e71149e`.
- Final-frame SHA-256:
  `253d5227350e1a1e43a689010eca733eedcfac6c6d3c5eb4d522ac862777720d`.
- Publishing attempts: `0`; database writes: `0`.

## Evidence

- `docs/audits/launch_readiness_closure_v1/summary.json`
- `docs/audits/store_release_readiness_v1/external_console_status.json`
- `artifacts/release/production_catalog_crawl_v1/2026-08-17T15-25-11-819Z/`
- `artifacts/release/native_android_onboarding_qa_v1/2026-08-17T15-59-25-378Z/`
- `artifacts/release/pricing_trust_spot_check_v1/2026-08-17T15-47-45-086Z/`
- `artifacts/release/signed_out_catalog_native_v1/`
- `artifacts/social_media/emulator_video_agent_v1/2026-08-17T16-24-48-779Z_signed_out_charizard_search_v1/`

## Verification

- Node focused contracts: `11/11` passed.
- Flutter focused onboarding/catalog tests: `16/16` passed.
- Flutter analysis of modified catalog code: passed.
- Web TypeScript: passed.
- Web lint: passed with zero warnings.
- Strict Next.js production build: passed.
- Android debug build and emulator installation: passed.

## Invariants

1. Store repository readiness must never be reported as store submission.
2. Disposable QA users must be deleted and verified absent.
3. QA must not mutate customer collections, social data, or prices.
4. Displayed pricing remains TCGPlayer Market evidence, never an inferred value.
5. Social agents cannot post, upload, share, or receive social credentials.
6. Raw video and hashes remain immutable evidence for any edited derivative.
7. A video scenario cannot pass merely by reaching a screen; it must find the
   expected rendered product object.

## Remaining Gates

1. Produce the missing Apple and Google store media in the exact required
   dimensions.
2. Authenticate App Store Connect and verify listing, review account, build,
   privacy answers, and screenshot sets.
3. Create or attach a Google Play developer account, then verify listing,
   review access, Data Safety, and uploaded assets.
4. Run the store readiness audit with `--require-ready` only after those
   external gates are complete.
5. Add an approved editor such as FFmpeg or Remotion before automated captions,
   overlays, crops, music, or end cards. Human review and manual publication
   remain mandatory.

## Exact Next Gate

Complete store media assets and authenticated console verification. The code,
metadata, production QA, onboarding proof, pricing provenance, and raw social
video capture pipeline are ready; store submission itself is not yet ready.

