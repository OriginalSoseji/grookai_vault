# Smart Search Phase 2 Governed Filter Expansion V1

Date: 2026-06-17

Status: implemented

## Objective

Expand `GROOKAI_SMART_SEARCH_V1` beyond year ranges into additional governed filters.

This phase keeps the core rule:

```text
Natural language may compile into allowed filters, but it must not invent truth or generate arbitrary SQL.
```

## Files Updated

- `apps/web/src/lib/search/smartSearchIntent.ts`
- `apps/web/src/app/api/resolver/search/route.ts`
- `apps/web/src/components/explore/ExplorePageClient.tsx`

## Newly Recognized Natural Language Filters

### Artist

Recognizes phrases such as:

```text
cards illustrated by Ken Sugimori
cards drawn by Komiya
```

The parsed artist is passed into the existing exact illustrator search path.

### Image State

Recognizes:

```text
exact images
representative images
no exact image
missing images
variant image pending
```

Image filters are applied against `display_image_kind`.

### Ownership

Recognizes:

```text
cards I own
in my vault
missing from my vault
not owned
```

Ownership filters are applied only when a signed-in user is available.

If the user is not signed in, the term is shown under:

```text
Not applied
```

### Stamp Labels

Recognizes common stamped/special labels:

- Build-A-Bear Workshop Stamp
- Toys R Us Stamp
- Burger King Stamp
- Pokemon Together Stamp
- League Stamp
- Prize Pack Stamp
- Winner Stamp
- Staff Stamp

The filter is applied against canonical variant/modifier/display text already present on result rows.

## UI Explainability

The Explore page now separates:

- applied interpreted filters
- not-applied terms

Example:

```text
Smart search interpretation:
Reverse Holo / 2014-2026 / Missing from vault

Not applied:
Vault ownership requires sign in
```

## Cache Safety

Ownership-aware searches are user-specific.

When ownership intent is present, the API response uses:

```text
Cache-Control: private, no-store
```

Non-ownership searches preserve public cache behavior.

## Safety

No DB writes.

No migrations.

No arbitrary SQL.

No card truth mutation.

No guessed finish, stamp, image, or ownership facts.

## Verification

Passed:

```text
npm --prefix apps/web run typecheck
npm --prefix apps/web run lint
npm run web:build:strict
git diff --check
```

Known warning:

```text
apps/web/src/components/warehouse/WarehouseSubmissionForm.tsx uses <img>.
```

This warning existed outside this phase.

## Next Recommended Step

Add visible advanced filter chips/controls so users can edit the parsed filters after a sentence query.
