# GVVI Vendor QR V1 Checkpoint

Date: 2026-08-17

Status: implementation and local verification checkpoint; no production deploy or database apply.

## Context

Vendors physically label individual cards and repeatedly change pricing. Low-dollar and binder inventory is often under-managed because replacing price stickers costs more labor than the margin gained.

## Problem

A physical card needs a persistent path to current vendor-controlled information without creating a second identity or coupling the experience to market-price ingestion.

## Decision

Every eligible public vendor GVVI can produce a persistent QR for `/q/{GVVI}`. The route resolves and attributes the scan, then redirects to the existing `/gvvi/{GVVI}` public exact-copy surface used by the Wall.

## Identity

- GV-ID remains canonical card identity.
- GVVI remains one vendor-owned physical card instance.
- QR introduces no identity and stores no price, condition, logo, or vendor snapshot.

## Invariants

- Mutable vendor properties never change QR identity.
- Vendor price means owner asking price, never market value.
- Public vendor mode requires active database-backed vendor authority.
- Signed-out access is read-only.
- Vendor identity is derived server-side from GVVI ownership.
- Referral context cannot assert vendor identity.
- Private, archived, unpublished, malformed, and non-vendor resources fail closed.
- MEE, canonical identity, Wall ownership, and RLS remain unchanged.

## Convergence

Vendor Wall selection and physical QR both terminate at `/gvvi/{GVVI}` and resolve the same exact-copy resource and presentation contract.

## Referral

The 30-day encrypted cookie carries only GVVI and timestamps. Account creation re-resolves the current vendor, blocks self-referral, deduplicates signup credit by user, and clears the context. Missing configuration degrades attribution only.

## Lifecycle

V1 preserves the current active/public fail-closed lifecycle. The stable QR is compatible with a future sold/unavailable historical state, but V1 does not invent or write that state.

## Future

GVVI may later retain sold state, realized price, cash/trade composition, acquisition cost, margin, days held, and transaction history behind a separate governed ledger contract.

## Non-Goal

V1 does not implement checkout, payments, accounting, POS, sold-state mutation, full labels, trade intake, CRM, or vendor analytics dashboards.

## Concurrency

The audit is preserved at `docs/audits/gvvi_vendor_qr_v1/CONCURRENCY_SAFETY_AUDIT_20260817.md`. Work was isolated from active MTG/category and dirty primary/One Piece worktrees.

## Implementation Truth

- Branch: `feature/gvvi-vendor-qr-v1`
- Worktree: `C:\grookai_vault_gvvi_vendor_qr_v1`
- Base SHA: `f326d5735e80d7843f56c013e7a1c7dbedd9fed0`
- Migration: none
- Production changes: none
- Environment requirement: `GVVI_REFERRAL_COOKIE_SECRET` with at least 32 random characters

## Verification Truth

- Real existing signed-out vendor GVVI: `GVVI-065CAB28-001319`
- Real display readback: Dunsparce, `$5.00`, `NM`, `imnotcesar`
- Physical Samsung native readback: the owner Wall exposes `Price cards`; the workspace shows 32 exact copies with `Market price` and editable `My price`, and Dunsparce reloads its existing `$5.00` asking price
- Native vendor-card readback: `Vendor card`, Dunsparce, `VENDOR PRICE`, `$5.00`, `Available`, `NM`, `imnotcesar`, and an inline owner QR with Copy, Share, and Print
- Native QR/print proof: rendered persistent QR and Android print preview for a 2.5 by 3.5 inch card; production package remained untouched
- Physical QR decode: exact `https://grookaivault.com/q/GVVI-065CAB28-001319`
- Native feature package: `com.grookai.vault.lockedacceptance`, version `1.0.0 (297)`
- Complete contracts: `2,207/2,207`
- Release-convergence browser cases: `76/76`
- GVVI responsive/accessibility cases: `5/5`
- Flutter analysis, targeted native tests, Android debug build, TypeScript, ESLint, web build, and production dependency audit: passed
- Test telemetry: exact eight-row cleanup completed; final feature-event readback `0`; canonical/Vault rows touched `0`
- Product proof: `docs/audits/gvvi_vendor_qr_v1/PRODUCT_PROOF_20260817.md`

## Next Gate

Review the isolated diff and merge through normal governance. Configure the dedicated secret in a preview, verify one real existing vendor GVVI signed out and on a phone, then run a bounded production canary. Do not create fake production inventory.
