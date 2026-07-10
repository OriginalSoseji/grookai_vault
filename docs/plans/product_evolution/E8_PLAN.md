# E8 Plan - Public Pages & Share Loop

Status: draft for approval. No implementation, migrations, or UI changes have started.

Date: 2026-07-09

Branch: `growth/public-pages`

Baseline: `main` includes E1 interest graph, E2 notifications, E3 want-match, E4 Pulse, E5 Card Journeys, E6 onboarding, and the July 9 pricing worker repairs. E7 metrics is not required for E8 and its live PR 5 remains separate.

## Objective

Make public Grookai links feel intentional when shared outside the app without reopening the SEO/card-page work that already works.

E8 adds:

1. Rich `og:image` previews for public collector Walls.
2. Counts-only Journey context on logged-out card pages and card metadata.
3. One conversion door: `Claim your vault`, deep-linked back to the shared card.
4. Verified app share actions for card detail and Wall/profile links.
5. Public privacy hardening so private vaults and Walls are not crawlable surfaces.

## Current Foundation

### Confirmed Existing Surfaces

- `/card/[gv_id]` already has canonical URL, Open Graph/Twitter metadata, card image metadata, JSON-LD with `sku`/`mpn`, and correct missing-card handling.
- `/login?next=<path>` already supports safe post-auth return paths for email/password and OAuth callback.
- The app card detail screen already uses `share_plus` to share `/card/<gv_id>`.
- The app public collector profile already exposes a share/copy affordance for `/u/<slug>`.
- `/u/[slug]/section/[section_id]` already 404s when the profile is not public, vault sharing is disabled, or the section is inactive.
- E5 Journey RPCs exist but are authenticated-only by design. They cannot be granted to anon as-is.

### Gaps E8 Must Close

- `/u/[slug]` metadata has no Wall `og:image`.
- `/u/[slug]` currently renders a public profile shell when `vault_sharing_enabled=false`; E8's spec requires public Wall URLs to 404 when the Wall/vault is private.
- Logged-out card pages do not show Journey counts and do not include Journey counts in `og:description`.
- E5 Journey snapshot is authenticated and returns more than logged-out public pages should see. E8 needs a public-safe counts-only contract.
- App share behavior exists, but E8 should standardize and test it instead of assuming it is complete across card and Wall flows.

## Hard Boundaries

- Do not rebuild card-page metadata. Card pages only get the E8 Journey counts sentence added to the visible page and `og:description`.
- Do not expose E5 collector lists, moments, geography, owner names, locations, or any intent-owner details to logged-out users.
- Private profiles, private vaults, disabled Wall sharing, inactive sections, and private cards must not become public surfaces.
- No pricing writes, pricing worker changes, or price-model changes.
- No identity writes, family promotion, image ingestion, or Storage writes.
- No popups, email gates, or multi-CTA growth overlays. The only conversion door is `Claim your vault`.
- No synthetic activity and no public expansion of private user actions.

## Proposed Backend Contract

### `public.card_journey_public_counts_v1(p_card_print_id uuid)`

New anon-safe counts-only RPC or view-backed security-definer function.

Purpose: return the minimal public aggregate needed by logged-out card pages.

Return shape:

- `card_print_id uuid`
- `public_owner_count integer`
- `public_trade_count integer`
- `public_sale_count integer`
- `public_want_count integer`
- `has_public_activity boolean`

Rules:

- Exact `card_print_id` only; no family-level counts.
- Reuse the E5 shared privacy-gate lineage, especially `card_journey_public_copy_sources_v1` or its internal predicate, rather than implementing another public-copy gate.
- Count distinct public collectors, not raw copies, for owner/trade/sale language.
- `public_want_count` remains aggregate-only and follows the E5 rule: public profile gate only, no public want owner list.
- No collector identifiers, names, slugs, area labels, copy ids, or event payloads in the return shape.
- If the card has zero public activity, return zeros and `has_public_activity=false`; the app/web owns empty-state copy.

Access:

- Grant execute to `anon`, `authenticated`, and `service_role`.
- Keep underlying helper functions and tables ungranted unless already intentionally public.
- Security definer with `set search_path = public`.

Privacy tests:

- Anon can call the counts RPC.
- Private profile/vault copies do not increase any count.
- Trade/sale counts only include public, discoverable intents.
- No row-level owner data is returned.

Rollback:

- Drop the RPC and any indexes added only for E8 counts.
- No data rows are created by PR 1.

## Web Surface Plan

### 1. Card Page Journey Counts

Use the counts contract from `generateMetadata` and the logged-out card render path.

Visible copy:

- If activity exists: `15 collectors · 4 for trade on Grookai`
- Include sale/want segments only when counts are greater than zero.
- Keep the visible block counts-only and anonymous.
- Add `Claim your vault` linking to `/login?next=/card/<gv_id>`.

Metadata:

- Append the same counts sentence to `description` / `og:description`.
- Preserve existing card `og:image`, canonical URL, Twitter image, and JSON-LD.

Rollback:

- Remove the counts helper call and visible conversion row; card metadata returns to current behavior.

### 2. Public Wall `og:image`

Add an image-generation route for public Walls, preferably colocated with the route:

- `apps/web/src/app/u/[slug]/opengraph-image.tsx`

Composition:

- 1200x630 image.
- Dark Grookai surface.
- Collector avatar or initials.
- Collector display name.
- Up to 4 top Wall card images from the default Wall.
- Small `Grookai Vault` brand mark/text.

Data rules:

- Only generate for profiles where `public_profile_enabled=true` and `vault_sharing_enabled=true`.
- Only use cards already returned by the public Wall view.
- If no cards exist, generate a restrained profile-only preview or fall back to a default Grookai Wall preview.
- Private Wall or disabled sharing returns `notFound()` / no public image.

Metadata:

- Update `/u/[slug]` Open Graph/Twitter metadata to point to the generated image.
- Use `summary_large_image` for Twitter when an image is available.
- Do not add Wall `og:image` to section pages in the first pass unless implementation shows the same route can safely support it with no extra data exposure.

Rollback:

- Remove the opengraph image route and metadata image reference. Public Wall page rendering remains intact.

### 3. Private Wall 404

Change `/u/[slug]` public Wall behavior so a profile with `vault_sharing_enabled=false` returns `notFound()` for logged-out public Wall browsing.

Notes:

- `getPublicProfileBySlug` should continue to represent public profile existence; E8 should not break relationship/follower routes unnecessarily.
- The Wall route itself should require both profile public and vault sharing enabled.
- Section routes already enforce this and should remain unchanged except for tests.

Rollback:

- Revert the `/u/[slug]` route guard.

### 4. Conversion Door

Add one card-page conversion action:

- Label: `Claim your vault`
- Destination: `/login?next=/card/<gv_id>`
- Context copy stays card-first and short.

Existing login flow already returns to `nextPath` after signup/sign-in.

Gate:

- Start logged out on a shared card URL.
- Click `Claim your vault`.
- Sign up.
- Land back on the same `/card/<gv_id>`.

Rollback:

- Remove the CTA only.

## App Share Plan

### Card Detail

Current state: `_shareCard()` in `lib/card_detail_screen.dart` uses `SharePlus.instance.share` with `/card/<gv_id>` and records a share event.

E8 action:

- Verify it always uses `GrookaiWebRouteService.buildUri('/card/<gv_id>')`.
- Add/adjust tests where practical for URL construction and missing-`gvId` fallback.
- Keep the native share sheet behavior.

### Wall/Profile

Current state: `lib/screens/public_collector/public_collector_screen.dart` copies `/u/<slug>` to the clipboard from the profile share icon.

E8 action:

- Standardize language and icon treatment with card share.
- Prefer native share via `share_plus` if the existing profile share UX supports it without layout churn; otherwise keep clipboard copy but test the public URL.
- Do not add additional Wall CTAs or popups.

Rollback:

- Revert only app share affordance changes; public web routes remain unaffected.

## PR Breakdown

### PR 1 - Counts Contract + Privacy Tests

Scope:

- Add `card_journey_public_counts_v1`.
- Reuse E5 privacy-gate helper lineage.
- Add SQL contract tests for anon access and private suppression.

Gate:

- Fresh local migration chain applies.
- Anon can call `card_journey_public_counts_v1`.
- Private copies/walls do not affect counts.
- Logged-out output has counts only; no names, slugs, locations, copy ids, or event payloads.
- Existing authenticated E5 Journey RPC tests still pass.
- Zero pricing/identity writes.

Stop for review before PR 2 if the privacy contract requires changing any shared E5 helper.

### PR 2 - Web Public Pages

Scope:

- Add counts sentence and `Claim your vault` to logged-out card pages.
- Append counts to card metadata description.
- Add Wall `og:image` generation for `/u/[slug]`.
- Add `/u/[slug]` private-Wall 404 behavior.

Gate:

- `/card/<gv_id>` keeps canonical, card image OG, Twitter, and JSON-LD behavior.
- Logged-out card page shows counts-only Journey context when counts exist.
- `og:description` includes counts-only context.
- `/u/<public-wall-slug>` metadata includes generated Wall `og:image`.
- `/u/<private-wall-slug>` 404s publicly.
- Link pasted into a chat app shows a rich Wall preview with generated image.
- Lighthouse-reasonable load for card and Wall pages.
- Web lint/type/build checks pass.

### PR 3 - App Share Verification + Polish

Scope:

- Verify card detail native share URL.
- Verify Wall/profile share URL.
- Add small tests around URL construction where code structure supports it.
- Keep visual changes minimal and aligned with current Grookai dark UI.

Gate:

- Card detail share produces `https://grookaivault.com/card/<gv_id>` or configured `GROOKAI_WEB_BASE_URL`.
- Wall share produces `https://grookaivault.com/u/<slug>` or configured base URL.
- Missing card/profile identifiers show honest fallback.
- Flutter analyze and tests pass.

### PR 4 - End-to-End Verification + Closeout

Scope:

- Manual preview testing.
- Documentation update with final verification evidence.
- No feature expansion.

Gate:

- Card shared into Messages/Discord/Slack renders existing card image preview and counts-only description.
- Wall shared into Messages/Discord/Slack renders composed Wall preview image.
- Private Wall URL returns 404 logged out.
- Signup from shared card lands back on the same card.
- No logged-out route exposes collector names, owner lists, or locations from Journey data.
- Shipcheck passes.

## Test Matrix

Public card:

- valid card with public Journey counts
- valid card with zero Journey counts
- invalid card 404
- Japanese card retains English-primary display behavior

Public Wall:

- public profile + vault sharing enabled + cards
- public profile + vault sharing enabled + no cards
- public profile + vault sharing disabled
- public profile disabled
- inactive section route

Auth door:

- email signup with `next=/card/<gv_id>`
- Google signup/sign-in callback with `next=/card/<gv_id>`
- unsafe external next param rejected by existing safe-next behavior

App share:

- card detail with `gvId`
- card detail without `gvId`
- public collector profile with slug
- public collector profile without slug fallback

## Open Questions For Approval

1. Should Wall `og:image` be added only to `/u/[slug]` in E8, or should custom section pages get composed previews too if implementation is straightforward?
2. Should Wall app share remain clipboard-only, or should it be upgraded to the native share sheet for parity with card detail?

Default recommendation: keep E8 narrow. Ship `/u/[slug]` Wall `og:image` first and keep section images/native Wall share as follow-ups unless they are trivial during PR 2/PR 3.
