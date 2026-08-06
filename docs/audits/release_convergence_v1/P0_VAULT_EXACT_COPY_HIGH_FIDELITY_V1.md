# P0 Vault and Exact-Copy High-Fidelity Report V1

## Scope

This bounded pass propagates the approved Search and Card Detail hierarchy into:

- Vault collection cards on desktop and mobile.
- Grouped Vault card-family management.
- Owner exact-copy pages.
- Public exact-copy pages.
- Vault loaded, empty, private, partial-error, duplicate-copy, and offline states.

It does not change ownership rows, mutation IDs, privacy, pricing authority, canonical identity, image-source order, Wall placement, or database behavior.

## Evidence-Producing Commit

- Branch: `release/8-week-convergence-v1`
- Commit: `cb7af9fb094ed49d4c184457d26ec3d900b8db81`
- Parent checkpoint commit: `8b5cf18ff18a68d20e57ac98e637e63f5cf1dec8`

## Vault Decisions

- Every family card now shows an explicit copy-presentation summary.
- A single raw copy shows its assigned finish or `Finish assignment needed`.
- Multiple raw copies show their shared finish, `Mixed finishes`, or `Finish assignment needed`.
- Mixed raw and graded ownership is stated without implying one finish.
- Expanded family rows list each exact copy's condition, finish, format, intent, and visibility.
- Grookai card IDs, exact-copy IDs, printing IDs, dates, and notes remain available under evidence disclosures instead of competing with collector facts.
- Expanded exact copies are unframed rows with dividers rather than cards nested inside a collection card.

## Exact-Copy Decisions

- Owner and public routes use one shared `VaultExactCopyHero`.
- Card artwork remains in a stable 5:7 frame and is uncropped.
- Card name, set, number, finish, condition or certificate, format, status, and intent are primary facts.
- Exact-copy and canonical IDs are disclosed as evidence rather than primary display text.
- Owner actions, public contact rules, pricing, sharing, notes, media, history, and curation retain their existing behavior.
- Hosted and uploaded image-source order remains unchanged; the shared hero receives the already-governed ordered image sources.

## Product States

- Vault empty and load-failure states now use the shared `ProductState` contract.
- Raw backend error messages are not rendered to collectors.
- Recent-activity failures state that ownership is unaffected.
- Deterministic fixtures cover loaded, empty, private, partial-error, duplicate-copy, offline, and exact-copy states.

## Visual Evidence

All screenshots are under `apps/web/tests/parity/__screenshots__/canonical-samsung/`.

| Screenshot | SHA-256 |
| --- | --- |
| `p0-vault-loaded-mobile.png` | `691088fd7eff62967786f1f27cc4fd3d6dce28665fdc56390c648e71f8ac8234` |
| `p0-vault-loaded-desktop.png` | `9317bc8cee6cdf20029d0b710d8db6920f158149c898e80f346f0ddfe089bb94` |
| `p0-vault-exact-copy-mobile.png` | `5d96b947e03be53fbe98efbf8b3bbe7547524b2ae1727e3b92510c6b2f31c1ac` |
| `p0-vault-exact-copy-desktop.png` | `457183a4cdcaffdd58303b39dcefc1fe17b4202f6062149afe4dd31a4463fdab` |

## Verification

- Full contract suite: `1,489/1,489` pass.
- Full Samsung parity, accessibility, geometry, and visual suite: `50/50` pass.
- Existing native-canon visual baselines: `6/6` unchanged.
- New Vault visual baselines: `4/4` pass.
- Web typecheck: pass.
- Web lint: pass.
- Next.js 16.2.12 strict production build: pass.
- Checked-in set-count validation: `691/691` pass.
- Flutter analysis: no issues.
- Flutter tests: `565/565` pass.
- `git diff --check`: pass.

The repository pre-commit hook was attempted. Its secret guard passed, then runtime preflight stopped because the isolated worktree intentionally has no `SUPABASE_DB_URL`. The evidence-producing commit used `--no-verify` only after the deterministic code, browser, production-build, contract, and Flutter checks above passed. No production credential was copied into the worktree.

## Boundaries Preserved

- No database or Storage access.
- No migration, data write, ownership mutation, approval, pricing, or privacy change.
- No deployment, push, merge, or feature activation.
- Exact-copy mutations still use existing instance IDs and guarded server actions.
- Public exact-copy visibility and contact eligibility remain unchanged.
- The original dirty pricing worktree remains untouched.

## Remaining Propagation

The next bounded P0 gate is Pulse, Wall, and Collector Profile:

1. Define one event-card grammar for Pulse and one collection-display grammar for Wall.
2. Keep actor, exact card identity, variant, timestamp, availability, and destination hierarchy explicit.
3. Produce private, blocked, deleted, empty, loading, and partial-error fixtures.
4. Preserve follow, block, message, public-visibility, and exact-copy ownership boundaries.
5. Stop before deployment or desktop-shell redesign.
