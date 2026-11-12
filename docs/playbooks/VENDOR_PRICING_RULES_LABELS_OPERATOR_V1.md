# Vendor pricing rules and reusable labels

Implementation contract: [Vendor pricing rules and labels V1](../contracts/VENDOR_PRICING_RULES_AND_LABELS_V1.md).

## Seller workflow

Open Pricing rules from Vendor Mode or the website's account links. Create a
named preset, preview it against an example market amount, then save it. Choose
the default preset and optionally enable it for newly added, unpriced cards.
Existing manual prices are preserved. Adding a card never publishes it.

On the exact physical copy, choose Vendor default, a named preset, or My price.
Automatic previews require a fresh exact-printing USD TCGPlayer reference.
Choose For sale explicitly. Wait for Square's Ready confirmation before checkout.
A background price update uses the existing Square sync and recovery queue.
Pending or review status is not proof of the current price in POS.

My price freezes that copy even when saving the same amount. To resume automatic
pricing, explicitly choose a rule again. Updating a preset affects its automatic
copies; changing the vendor default affects copies using Vendor default.

Print label is available after saving For sale, from the native QR tools, and
from the website's QR and label page. Vendor Mode and the account's Print card
labels link offer a bounded batch picker. Select physical copies explicitly.
Use P21 14 × 40 mm or the existing Munbyn 102 × 152 mm preset, matching actual
loaded stock. The format is remembered locally; system print dialogs retain
their printer selection, and P21 discovery lists the last connected printer first.
Use Actual size / 100%, no margins, and no headers or footers.

Labels contain full card identity, the original emblem, and the permanent QR.
The set line uses only the actual full set name, such as Prismatic Evolutions
or Cosmic Eclipse. No set-code fallback is allowed; missing names block printing.
They contain no price, condition, or visible GVVI. New prices use the same label.
Do not shorten the QR or enter a different SKU in Square. A sent command or
closed print dialog does not establish physical output. Check the label before
retrying an uncertain print. Interrupted jobs never replay automatically.

## Operating boundaries

The private pricing strategy is metadata; existing exact-copy asking fields
remain price authority. No market evidence, inventory, or sales are created by
repricing or printing. A missing first reference cannot publish. Stale later
references keep the last confirmed asking price and show a warning. Active
checkout/eBay holds defer repricing. Conflicting owner edits fail for reload.

The background clock is `/api/vendor-pricing/recovery`, every five minutes,
offset from Square recovery. It requires the existing authenticated cron secret,
the production deployment/project/database, `GROOKAI_VENDOR_PRICING_RECOVERY_ENABLED`,
and the revision-checked database control. Controls start off. No owner session
or Samsung process is needed. Worker runs, rule revisions, copy evaluations and
failed owner requests are retained; follow their identifiers to investigate.

Never repair a price by directly editing private metadata, asking fields, or
Square inventory. Read the exact copy, rule version, governed reference and
existing Square diagnostics. Resolve the seller's intended mode through the
normal owner flow. Do not rewrite historical sale prices or revive a sold copy.

## Qualification and release status

This is the candidate implementation. Publication and activation need separate
recorded evidence. Fresh494 replay, populated493→494 upgrade and no-op replay,
unchanged market-reader Auth tests, and exact PDF/raster/QR checks are retained
in the private `vendor_rules_labels_20261112` artifacts. Normal source/hosting
gates, canonical production readback, a higher-version same-signer Samsung
installation, and actual printer/label/scan acceptance are distinct proofs.
Android P21 compiles; physical readiness, roll and output must still be checked
on Android. Previous iOS acceptance does not qualify the new Android transport.
