# EXTERNAL_DISCOVERY_STAGING_BOUNDARY_V1_LOCKED

## Status

`ACTIVE / LOCKED / VERIFIED`

## Date

`2026-03-31`

## Context

Grookai has now locked a canon-bound external ingestion model:

- raw
- normalize
- compare
- canon gate
- staging
- promotion

That decision established staging as a required phase before canon for external discovery candidates.

The next implementation step was a non-canon external discovery staging layer.

At that point, the rulebook's `card_prints >= 40,000` maturity gate correctly continued blocking canon-expanding work, but it also blocked this non-canonical staging layer because the gate wording was too broad.

## Problem

Pokemon external candidates are special-case heavy.

Direct promotion from external raws or even clean canon-gate candidates into `card_prints` would be unsafe.

Examples of the risk already proven in repo work include:

- alpha-suffixed numbering
- upstream-only modifier strings
- printed-identity uncertainty
- special-case rows that require explicit decision before truth acceptance

The system therefore needed a lawful way to preserve and review external discovery candidates before canon, without weakening the existing canon gate.

## Risk

Without this amendment, Grookai would face the wrong binary choice:

- either block all staging work below the 40k gate
- or weaken the gate enough to let unsafe canon-adjacent writes through

Both outcomes were wrong.

The first would prevent building the safety buffer required by the external ingestion model.

The second would risk premature canon mutation in a domain where printed identity complexity is high.

## Decision

Grookai now locks the following governance decision:

- the 40k canonical maturity gate still blocks canon-expanding write systems
- the same gate does not block non-canon external discovery staging systems
- staging is explicitly a review boundary, not a truth boundary
- staging remains lawful only when it preserves provenance and stays outside canonical truth tables

This decision is formalized in:

- [EXTERNAL_DISCOVERY_STAGING_BOUNDARY_V1](./../contracts/EXTERNAL_DISCOVERY_STAGING_BOUNDARY_V1.md)

## Alternatives Rejected

Rejected alternatives:

- letting external discovery bypass staging and write directly into canon
- reusing the current evidence-driven warehouse as if external discovery were equivalent to user-submitted evidence
- keeping the 40k gate broad enough to block non-canon staging
- weakening printed identity authority to make external-source promotion easier

## Current Truths

Current verified truths in repo reality:

- the external-source ingestion model now requires staging before canon
- Pokemon external candidates are special-case heavy
- direct canon promotion from external discovery would be unsafe
- the 40k gate was correctly blocking canon and truth-layer expansion
- the same gate was too broad for non-canon external discovery staging
- staging is now explicitly allowed while canon-expanding writes remain blocked

## Invariants

1. External discovery staging is non-canonical.
2. The 40k gate still blocks canon-expanding writes.
3. Staging below 40k is lawful only when it preserves provenance and stays outside truth tables.
4. Staged rows do not imply validity or canonical existence.
5. Printed identity authority remains intact.
6. Review remains mandatory before canon.

## Why It Matters

This checkpoint matters because it fixes a governance gap without weakening canon safety.

Grookai can now build the missing external discovery staging layer:

- below the 40k gate
- without touching canon
- without pretending external candidates are already true

That is the correct safety architecture for a special-case-heavy domain like Pokemon.

## Next Step

Implement the non-canon external discovery staging layer, with provenance preservation and replay-safe candidate storage, while keeping canon-expanding writes blocked below the 40k gate.
