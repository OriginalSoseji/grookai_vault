# Source-Backed Mapping Review Boundary

Date: 2026-09-17
Status: Local repair; not deployed enforcement or historical database correction.

## Evidence And Cause

The old source-backed JustTCG writer checked candidate presence but did not
compare the requested GV-ID with the parent. Null live variants bypassed the
variant comparison. An existing match was classified before another external
owner, and a separate nontransactional upsert could reassign a source ID.

Real CLI tests against synthetic local HTTP fixtures reproduced these gaps.
The initial 13 regressions failed before repair and passed after. The fixtures
made no production/provider calls and allowed database GET requests only.
This is code-path evidence, not adjudication of any production card identity.

## Repair

- Retire direct apply before environment/input/client setup, including all apply
  flag forms and the maintenance write-mode environment; recheck after env load.
- Remove the upsert and presence-only canon-write wrapper from this legacy CLI.
- Preserve raw requested identity, canonical parent, discovery candidate payload
  and raw-import link, and active/inactive mapping history in review-only output.
- Compare supplied identity fields exactly, including a supplied variant against
  a null live variant. Never label an existing mapping as verified identity.
- Check other active/inactive owners before classifying an existing match.
- Default to at most 50 selected rows, explicitly allow up to 500; reject empty,
  duplicate or oversized input without silently truncating the selection.
- Read in 100-ID chunks with stable 100-row pages, maximum 10 pages per chunk.
  Read exhaustion or duplicate returned IDs fails rather than hiding evidence.
- Retire ten historical Prize Pack ready-batch callers at import, before any
  parent promotion, old approval replay, checkpoint write or image mutation.
  Preserve their code and historical receipts unchanged below the entry guard.

## Verification

18 new contracts and 45 combined source-backed/legacy/validation contracts pass.
They include both known gap fixtures, strict identity mismatches, source mismatch,
active/inactive conflicts, a conflict on a later page, bounded selection, retired
apply admission and all ten callers with no args, dry-run and apply flags.
Syntax and diff checks are required again at the frozen full gate.

Preceding PR #485 merged at `43c1ba17b0f4d6d4109f7c1821b90db038bd9ab6`
on 2026-09-17 at 13:35:56 UTC, from `4865d99c2fba97f4bc669df9122bbe44221943c4`.
Its full gate passed 3814 Node tests (3 existing opt-in skips), web checks,
Flutter analysis and 728 Flutter tests. All code CI passed; exact-head Vercel
failure was independently verified as the production activation guard, which
was not bypassed. Branches and historical receipts are preserved.

## Remaining Work

This repair needs full release checks, review and runtime rollout verification.
The inventory did not prove these historical scripts were scheduled: regular
systemd/cron files had no literal caller names, but dynamic/manual invocation
and symlinks were not excluded. Do not claim deployed closure from this patch.

Future stamped JustTCG writes need a fresh reviewed evidence package and bounded
transactional executor. Do not stretch the English base TCGPlayer executor into
another identity policy. Review-only output does not approve a candidate.

PokemonAPI mapping/normalization and the TCGdex normalization entry remain next
writer-admission work. Historical Master Index adjudication, dependency-safe
repairs and client verification remain incomplete. Preserve the separate frozen
McDonald's apply and its exact authority requirement. Do not deploy main over
the divergent preserved MEE runtime or modify ownership/history/Storage here.
