# Vendor pricing rules and reusable labels V1

Status: active implementation contract; candidate controls default off.
Owner approved the plan on November 12, 2026, then requested implementation.
Labels have no price. Existing 14 × 40 mm reusable P21 identity layout is retained.

One GVVI remains one physical copy. Rules compute a seller asking price from
the existing governed, fresh, positive USD exact-printing TCGPlayer reference.
They do not write market evidence or infer printing, grade or condition.
No parent/sibling/finish/condition/slab fallback is permitted.

Precedence is an explicit per-copy manual amount, assigned preset, then vendor
default. Existing asking prices stay manual. A new private unpriced copy may
inherit the owner's opted-in default, without publication. Publishing requires
an explicit For sale action and a positive confirmed price. Applying a rule to
an existing copy is explicit; changing an inherited rule updates its existing
automatic copies, never manual siblings.

Rules are versioned and owner-bound: percentage in basis points, signed fixed
minor-unit adjustment, up/down/nearest/cent rounding and positive increment,
optional floor/cap. Arithmetic is exact PostgreSQL numeric until final cents.
Order: reference, percentage, fixed adjustment, rounding, floor/cap. A rounding
boundary already reached remains unchanged. Limits take precedence over rounding.
The final USD price is positive and bounded; invalid rules fail visibly.

The existing exact-copy asking fields remain the selling-price authority.
Private strategy metadata and append-only evaluations retain rule revision,
reference provenance, source time, result and failure reason. Client code never
calculates authoritative prices. Read previews use the same server calculator.
All legacy price writers convert automatic copies to manual atomically, even
when the entered amount equals the old amount. Private transaction-bound write
markers distinguish the governed repricer; no client-set flag can bypass this.

Automatic work locks settings/rule/copy/strategy consistently, rechecks ownership,
active state and revision, and refuses checkout/eBay holds. New fresh publication
and rule revisions make copies due; a bounded background clock recovers work with
the app closed. Missing initial evidence cannot publish. Missing/stale later
evidence retains the last confirmed ask and records an update warning. No zero,
new inventory, changed quantity, resurrected sale, historical-price rewrite or
automatic private publication is allowed. Existing Square queues, leases, object
versions and readback retain catalog/stock/payment authority. Pending provider
acknowledgement never claims that a new price is already in POS.

Reusable labels include full card name, set, collector number, original emblem
and unchanged `/q/{GVVI}` QR; no price, condition or visible GVVI. The set line
uses only its actual full name, such as Prismatic Evolutions or Cosmic Eclipse.
Never substitute or append a set code. Missing canonical set names block printing.
Use bundled Roboto, integral raster modules, four-module quiet zones and legibility gates.
One label per explicit copy; bounded batch printing reuses exact identities.
Remember layout/printer preferences. No automatic replay of interrupted physical
print jobs. A sent command is not proof of physical output. Android P21 transport
must separately pass real-device/roll/physical-scan acceptance; iOS proof is not
Android proof. Website print/PDF output has exact paper dimensions and no site
navigation. Preserve P21 V1 readiness, pacing, receipts and interruption guards.

Release requires immutable history, fresh/retained replay, normal source and
hosted gates, Auth/tenant tests, exact reference/rounding/race/recovery proof,
manual overrides surviving market/default changes, no stock or sale regression,
same-signer Samsung update, actual label output and phone/Square scan. Production
activation is separate, revision-checked and audited after qualification.
