# Collector Preview-First Simplicity V1

Date: 2026-09-10. Local-only follow-up to the approved collector website.

## Decision

The founder prefers the preview's simplicity, not the old website decorated with
the preview's colors. Use the preview as the experience reference, connecting
existing services beneath it. Simplify presentation without deleting capability.

Worktree: `C:/grookai_vault_collector_real_local`.
Branch: `design/collector-real-local`.
No push, commit, merge, deployment, backend changes, database writes or app release.
The approved preview in `collector-polish-preview` remains untouched.

## Page Decisions

| Surface | Keep visible | Move behind a control | Remove duplicate presentation |
| --- | --- | --- | --- |
| Home | Existing Search workspace and URL parameters | Original home source remains recoverable from the base commit | Separate marketing landing page; Home redirects to Search |
| Shared navigation | Brand, desktop destinations, mobile primary dock | Mobile secondary tools/account under More | Mobile section label, duplicate shortcuts, global task search on unrelated pages |
| Search | One actual search form, game, query, result count, sort, active filters, cards | Display/language controls, exact filters, interpretation details | Repeated search chrome and diagnostic-first layout |
| Discovery | Approved 151 banner, stable real-card selection, five-column desktop/two-column phone grid, compact toolbar | Rarity filters and existing constrained search | Extra spotlight, subject-link and duplicate discovery sections on the opening screen |
| Pulse | Stream, intent controls, Discover tab/section | Collector-space shortcuts | Repeated promotional subtitle |
| Sets | Title, compact counts, search, game, actual set covers | Language, era/group, type, sorting filters | Letter icon, large statistics dashboard and instructions |
| Vault | Collection, total valuation, coverage warnings, real actions | Existing secondary workflows remain behind their original actions | Oversized Binder promotion, duplicate Pulse shortcut and introductory feature copy |
| Wall | Title, activity count, sections, sealed items, real controls | Existing exact-copy workflows unchanged | Large hero panel and nested statistics card |
| Binders | Title, create/explore actions, actual covers and progress | Existing membership/actions unchanged | Duplicate heading and explanatory tagline |
| Other routes | Existing content, auth, privacy and action boundaries | Shared compact navigation applies | No functional page rewrite |

Unapplied query constraints remain visible by opening Search details automatically.
Missing images, representative images, unpriced states, scope and ownership errors
must not disappear to achieve a cleaner layout. Search meaning and backend filters
are not changed by a disclosure. All original destinations remain available.

## Evidence And Limits

Use actual component tests plus real local route checks. Test mobile navigation,
Escape, filter visibility and query preservation, pricing/image identity contracts,
light/dark accessibility and overflow. Record fixtures separately from live data.

Client-only controls must not accept input before their JavaScript handlers are
ready. Sets uses a disabled fieldset during hydration; the mobile menu is inert
until hydrated. This prevents an early interaction from silently doing nothing.

The local database now has the bounded public catalog snapshot described in
`COLLECTOR_LOCAL_PUBLIC_CATALOG_V1.md`. Full real-account transactions and catalog
coverage still require representative non-production data; no fixture can prove
them. Preserve existing set/binder cover provenance, not arbitrary sample cards.

## Founder Correction: Preview Fidelity

On September 10 the founder rejected the database-connected view because it did
not match the approved preview. The preview is the layout authority, not just a
palette reference. The opening screen must retain its heading, original 151 band,
card order, contained artwork, compact controls and responsive grid geometry.
Do not put the former full discovery dashboard back onto this opening screen.

The local real-card selection preserves the preview's first nine 151 identities
and substitutes a real Mew for its unrelated demo pack. Real reader results alone
provide identity, image and price data. No sample prices, ownership, saves or user
identity may be copied from the preview store. The full search workflow remains
available for actual query constraints and other game scopes; it is not replaced
by filtering only the ten featured records. Other existing routes remain intact.

The preceding implementation can be recovered from:
`C:/grookai_vault_operator_artifacts/collector_polish/2026-09-10T12-18-30-340Z_real_integration.zip`
SHA-256: `4d18bb32d4f645cdca0a37286ece58f32dda029332dfcd7023c4b4190adf4bb1`.

Preserve a new versioned snapshot after verification. Do not overwrite the prior
archive or approved preview. No automatic publication follows this work.
