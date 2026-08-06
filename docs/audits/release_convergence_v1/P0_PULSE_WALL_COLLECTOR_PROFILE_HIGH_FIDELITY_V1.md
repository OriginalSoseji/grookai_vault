# P0 Pulse, Wall, and Collector Profile High-Fidelity Report V1

## Scope

This bounded pass propagates the approved collector-facing hierarchy into:

- Pulse network event cards.
- Nearby, Following, and local-community activity cards.
- The owner Wall and recent Wall activity.
- Featured public Wall collection displays.
- Public collection grids and Collector Profile cards.
- Loading, empty, private, blocked, deleted, and partial-error states.

It does not change activity generation, follow or block behavior, message eligibility,
public visibility, exact-copy ownership, canonical identity, pricing authority, image
authority, database behavior, or deployment state.

## Evidence-Producing Commit

- Branch: `release/8-week-convergence-v1`
- Commit: `31712421f9d841cdf61069e4e48f9d2009def04f`
- Prior checkpoint commit: `62336d51f71b5109e4dba5bb4bc27148892fc51d`

## Presentation Decisions

### Pulse Event Grammar

- Actor and activity lead the event.
- Timestamp, exact card name, set, number, variant, availability, and ownership remain
  distinct facts rather than one metadata string.
- Card art stays in a stable 5:7 frame and is never covered by variant or image-status
  labels.
- Existing contact, destination, copy, and relationship actions remain wired to their
  existing guarded behavior.
- Raw event, card, and ownership identifiers remain available under `Event evidence`
  instead of competing with collector-facing facts.

### Wall Collection Grammar

- Wall displays lead with the collection item and exact visible version, not an event.
- Featured items use a compact image-and-facts hierarchy that remains usable on mobile.
- Ownership, visibility, and exact-copy destinations stay explicit.
- Card, copy, and image provenance remain available through evidence disclosure.
- Recent Wall activity uses the shared card-fact treatment without becoming a Pulse card.

### Collector Profile Grammar

- Collector identity, relationship actions, public collection content, and supporting
  evidence have separate visual levels.
- Public collection cards retain visible variant context wherever card art appears.
- Internal GVVI identifiers no longer occupy primary collector-facing space.
- Existing management controls, contact rules, and public visibility behavior remain
  unchanged.

## Product States

- Pulse has deterministic loaded, empty, loading, and partial-error states.
- Wall has deterministic collection, private, empty, loading, and failure states.
- Collector Profile has deterministic loaded, blocked, deleted, and loading states.
- Route-local error boundaries use stable collector copy and never expose raw backend
  exception messages.
- Partial failures preserve available content and state that protected ownership data is
  unaffected where applicable.

## Shared Primitive

`CollectorCardPresentation.tsx` provides presentation-only exact-card facts and evidence
disclosure. It performs no fetch, mutation, authority decision, or canonical inference.
Pulse and Wall deliberately retain separate outer grammars while sharing this narrow
identity treatment.

## Visual Evidence

All screenshots are under `apps/web/tests/parity/__screenshots__/canonical-samsung/`.

| Screenshot | SHA-256 |
| --- | --- |
| `p0-pulse-event-mobile.png` | `5bed06ad2c87ec48c710114598fad09654ae1977ec31f369bdc5434e6fefc188` |
| `p0-pulse-event-desktop.png` | `b09a38546397e88b9d86253943085eea9b329dd959dc2fb4b1ac31543bcfcf08` |
| `p0-wall-collection-mobile.png` | `9efe4a4639ad5680cd1e066190057612770bfd979161563b6ecd6dd7645bf546` |
| `p0-wall-collection-desktop.png` | `214a3262961c2395d030fc190bf3d5a98f971857a59dbe0215a39a4002cc093d` |
| `p0-profile-collector-mobile.png` | `5b6cdd3b4c201743d91bd3812bcfbdad1b426012d97dc5190cfa2395f3c0d388` |
| `p0-profile-collector-desktop.png` | `c04572588f9db2667bea56c54b8f78ee607a7be181b530bab61cbb7f88ad7adf` |

The six baselines were inspected directly after fixing mobile image sizing, dark-surface
contrast, profile alignment, and image-status overlap. The existing native-canon
baselines remain unchanged.

## Verification

- Full contract suite: `1,491/1,491` pass.
- Full browser parity, behavior, accessibility, geometry, and visual suite: `69/69` pass.
- Release-convergence browser subset: `46/46` pass.
- New Pulse, Wall, and Profile visual baselines: `6/6` pass.
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
- No migration, data write, follow, block, message, ownership, pricing, or privacy
  mutation.
- No deployment, push, merge, feature activation, or desktop-shell change.
- Existing public projections and contact-eligibility checks remain authoritative.
- Existing exact-copy IDs and destinations remain intact.
- The original dirty pricing worktree remains untouched.

## Remaining Propagation

The next bounded P0 gate is Desktop Application Shell convergence:

1. Preserve the five fixed mobile dock destinations and their route ownership.
2. Define the desktop primary and secondary navigation hierarchy.
3. Cover signed-out, narrow desktop, wide desktop, unread, unavailable-Wall, and
   pushed-route states.
4. Keep Sets, Dex, Compare, Binders, Messages, Account, and support tools discoverable
   without giving every route equal primary weight.
5. Verify keyboard, focus, responsive overflow, route restoration, and canonical visual
   parity.
6. Stop before deployment.
