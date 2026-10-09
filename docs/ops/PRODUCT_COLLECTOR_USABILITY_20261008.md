# Collector usability and private-session isolation

Current root: C:/gv_product_collector_usability_20261008. Qualified parent:
ee9bc75573516c5216a1ba7b7d54764206f56eae. No schema changes or production writes.
External CHECKPOINT.json in product_collector_usability_20261008 owns release status.

## Product changes

Native Binder detail now rejects disposed, old-owner and superseded requests across
detail, filters, pagination, activity, membership, realtime and mutation paths.
Access loss clears every private lane. Anonymous public reads remain independent.
The three original failures were reproduced before correction;23 race cases and
all112 Binder tests pass.

Private web Binder detail, library and Saved pages now verify the browser owner
before revealing server content and unmount it on account replacement. Actual
cross-tab sign-out reproduced retained private Binder/Saved content before the fix.
The corrected browser suite also signs in a replacement account without restoring
old content. Public projections remain independently readable.

Vault shows one recent goal with explicit expansion, preserves exact goal routes,
and removes repeated empty Recently Added sections. Web summary and toolbar use
less space; new phone sessions start with compact rows while saved Grid/Detail
preferences remain intact. Narrow screens retain the Vendor workspace link in the
existing navigation menu. Price coverage and missing-date states stay explicit.

## Runtime evidence

PRODUCT_COLLECTOR_USABILITY_EVIDENCE_V1.json binds16 artifacts. Actual web passes15
checks plus3 public/library checks. All19 browser and7 physical Samsung images have
been inspected. The first Binder-root image captured the account-check placeholder;
the supplementary browser proof waits for all four private goals to load.

At390x900 the first compact card identity is above the dock. At320x820 with the test
banner, controls remain visible and the first card requires a short scroll. This
slice is not a claim of finished visual design, measured superiority over DeckTradr,
camera accuracy or physical iOS qualification. Native/web palettes still differ.

The synthetic collaboration test uses real authenticated RPCs: foreign-copy add is
denied; contribution and withdrawal leave the owned copy unchanged; public progress
requires explicit content consent; public output excludes private copy identity.

Fixture ui-1791507616220 is restored. All360 pre-existing table sets and exact
Binder feature-flag bytes remain. Samsung package com.grookai.vault.collectorusabilityproof
build440 is separate and stopped; the primary, locked acceptance, portfolio and
collector-home apps are preserved. All prior and failed APKs/logs remain archived.

The first build exhausted Windows disk space. Lossless compression recovered space
with all file hashes, paths and write times retained. The first device test missed
a tap behind the app bar; the corrected test centers and hit-tests the target.
No product behavior was weakened to pass either failure.

## Qualification and continuation

Use only the dedicated usability baseline/evidence/parent, checks, gate and CLI
inspection helpers. Read-only exact437 and all older qualified parents remain
authoritative;438 source migration bytes are unchanged. The inspection helper has
prepare/dry-run operations only. Do not apply, deploy or activate this candidate.

Complete ordinary checks, PrePush and linked read-only dry-run, then continue R3
notification preferences and owner-safe contextual push permission, followed by
R4 portability/store/distribution and measured competitor/uncoached tasks. Physical
iOS remains pending the two already-requested Mac-local permissions; do not re-ask,
retry or bypass them. The full overhaul remains open.
