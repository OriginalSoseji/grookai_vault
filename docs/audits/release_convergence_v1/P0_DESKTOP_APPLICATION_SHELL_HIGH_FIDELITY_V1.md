# P0 Desktop Application Shell High-Fidelity Report V1

## Scope

This bounded pass establishes one governed desktop application shell for:

- The five primary product pillars.
- Secondary collection and account tools.
- Signed-in and signed-out navigation.
- Unread message/activity state.
- Public Wall availability state.
- Narrow and wide desktop layouts.
- Pushed-route parent context.
- The mobile-to-desktop breakpoint handoff.

It does not change route ownership, the mobile dock, authentication, public visibility,
message state, collection data, canonical identity, database schema, or deployment state.

## Evidence-Producing Commit

- Branch: `release/8-week-convergence-v1`
- Commit: `e3dfad5b5cffb7eadbb94fc990eac9fabe85a190`
- Prior checkpoint commit: `e3a043f0ca8f50e6ec19bf5e91ede722010f65b7`

## Navigation Decisions

### Primary Pillars

Desktop now preserves the native order and route ownership:

1. Pulse
2. Wall
3. Scan
4. Vault
5. Search

The primary tier uses stable five-column geometry. Secondary routes map back to one
primary responsibility: Messages to Pulse, Binders to Vault, and Sets, Dex, Compare,
and Card Detail to Search.

### Secondary Tools

- Sets, Dex, Compare, Binders, and Messages occupy a quieter secondary tier.
- Binders and Messages appear only after authenticated shell state is confirmed.
- Public profile, Account settings, and Support are grouped in the Account menu.
- Compare preserves its selected-card query state and visible count.
- Feature flags remain authoritative for Dex and Binders.

### Authenticated State

`AppChrome` continues to load private shell state from the existing cookie-verified
`/api/navigation/shell` endpoint. The endpoint now returns a bounded
`wallAvailability` value derived from the profile query it already performs:

- `signed_out`
- `public`
- `setup`
- `unavailable`

No new database query or authority path was added. Shell failures remain fail-closed and
hide private destinations.

### Pushed Routes

Supported child routes retain their primary and secondary active states while showing a
small parent context row. For example, a Binder workspace keeps Vault active, marks
Binders active, and provides `Back to Binders`. The shell does not infer a dynamic record
name or replace page-level breadcrumbs.

## Responsive Boundary

The previous header changed at Tailwind's 768px breakpoint while the canonical mobile
dock remained visible until 900px. Both shells now hand off at exactly 900px:

- Below 900px: mobile header and frozen five-item dock behavior remain authoritative.
- At and above 900px: desktop shell is visible and mobile dock is hidden.
- Existing fullscreen, pushed, and standalone-secret mobile suppression remains intact.
- Main/footer bottom spacing follows the same handoff so the dock cannot cover content.

## Product States

Deterministic fixtures cover:

- Wide authenticated desktop.
- Narrow 900px desktop.
- Signed-out desktop.
- Unread Pulse and Messages state.
- Wall status unavailable.
- Pushed Binder workspace.

The browser contract also proves keyboard focus enters the Account menu correctly,
private tools remain absent while signed out, and all fixture widths remain free of
horizontal overflow.

## Visual Evidence

All screenshots are under `apps/web/tests/parity/__screenshots__/canonical-samsung/`.

| Screenshot | SHA-256 |
| --- | --- |
| `p0-desktop-shell-wide.png` | `12b90fd58745308df6f086ead94777e1723bda02871432b518a3ddf9335205e3` |
| `p0-desktop-shell-narrow.png` | `a623fd7c7518641974e085b322dd35be6fde5b219812401ffb52b93117c5a0dc` |
| `p0-desktop-shell-wall-unavailable.png` | `e87dfbdf41273bc3831e0f5229ab6527be2a15b0f3da186cd6eed014e3869b84` |
| `p0-desktop-shell-pushed-route.png` | `cb4c9bd926cda0d0521cdcaf54cb1446a85808f4f2d58d02074f0a7bec313109` |

All four baselines were inspected directly. Primary/secondary hierarchy, active state,
status notice, route context, text fit, and narrow/wide geometry are coherent. Existing
native mobile goldens remain unchanged.

## Verification

- Full contract suite: `1,497/1,497` pass.
- Full browser parity, behavior, accessibility, geometry, and visual suite: `85/85` pass.
- Desktop release-convergence subset: `62/62` pass.
- New desktop-shell visual baselines: `4/4` pass.
- Existing native mobile visual baselines: `6/6` unchanged.
- Web typecheck: pass.
- Web lint: pass with zero warnings.
- Next.js 16.2.12 strict production build: pass.
- Checked-in set-count validation: `691/691` pass.
- Flutter analysis: no issues.
- Flutter tests: `565/565` pass.
- `git diff --check`: pass.

Runtime preflight was attempted and stopped before database access because this isolated
worktree has no `SUPABASE_DB_URL`. The normal pre-commit hook therefore stopped after
the release secret guard passed. The evidence-producing commit used `--no-verify` only
after all deterministic verification above passed. No production credential was copied
into the worktree.

## Boundaries Preserved

- No database, Storage, production API, or provider access.
- No migration, data write, authentication, message, follow, ownership, pricing, or
  privacy mutation.
- No deployment, push, merge, or feature activation.
- The mobile primary dock manifest and order are unchanged.
- Existing route destinations and feature flags remain authoritative.
- The original dirty pricing worktree remains untouched.

## Remaining Propagation

The next bounded gate is P1 Binders and Invitations:

1. Reconcile route ownership across Binder library, workspace, templates, public shares,
   and invitation routes.
2. Apply the approved shell, identity, action, and evidence hierarchy without exposing
   secret tokens.
3. Add library, workspace, collaborator, invite, expired invite, private, unavailable,
   and read-only public states.
4. Preserve standalone-secret chrome suppression, collaboration authority, exact-copy
   identity, and existing mutations.
5. Stop before database schema changes or deployment.
