# P21 native label printing V1

The iOS vendor-card Print action offers a Nelko P21 label or the existing AirPrint
vendor card. Owner QR-tool eligibility, the exact-copy public URL,
and display identity still come from the existing vendor-card presentation. No
new backend reads, inventory writes, catalog changes, or pricing calculations.

V1 supports one label per tap on a 14 × 40 mm gapped roll. A preview uses the
verified 96 × 284-dot printable area at 203 dpi, with a QR quiet zone of four
modules, a minimum two dots per QR module, text wrapping, and a monochrome raster.
The QR preserves the original `/q/<gvvi>` URL. Longer URLs that cannot fit legibly
fail visibly; they are never shortened into an unverified redirect.

The current layout `p21_14x40_v2` is a reusable identity label. It prints the full
display name, full set name, collector number, existing Grookai emblem and QR.
It omits price, condition and visible GVVI. The QR retains the same exact-copy
link so current details can change without replacing the physical label.
Names use the largest fitting font up to 38 dots; set names up to 16 and numbers
up to 18. Text wraps and reduces only as needed, with no ellipsis. An identity
that cannot fit at the legibility floor fails visibly rather than being clipped.
QR modules remain integral pixels with a four-module quiet zone; fractional
upscaling failed decoder acceptance and was not installed.

The native CoreBluetooth bridge is registered through `grookai/p21`. It discovers
P21 names, requires service FF00, writes FF02 without response, subscribes to FF01,
and verifies a CONFIG response for 203 dpi. Extended status uses a CRC-16-checked
16-byte response, with roll width at byte 13, length at byte 11, paper type at
byte 7, and readiness at byte 0. Verify status again immediately before printing;
reject a changed/unreadable roll, open lid, missing labels, or non-ready printer.
No other characteristics, firmware writes, resets, or device settings are used.

Writes respect CoreBluetooth backpressure and the peripheral's maximum write
length, with bounded 128-byte chunks and pacing. Each operation has a timeout.
Only one operation is accepted at a time. A failed/interrupted print is never
automatically resent. The UI reports “sent” because queued Bluetooth writes do
not establish physical output. Interrupted transfers explicitly require checking
the physical label before retrying. Closing the screen disconnects the printer.

The last print attempt has a local SharedPreferences receipt with operation ID,
start/end UTC timestamps, layout version, sent/failed state, and error code. It
contains no account, card/copy ID, image, URL, or printer identifier. Persist a
started receipt before physical output. An interrupted started receipt is not
permission to replay a print. No server persistence is introduced for this local
device feature.

Tests cover bitmap polarity/orientation, QR density bounds, readiness/roll gates,
failure receipts, and duplicate-tap suppression. Device acceptance must use the
actual Grookai app and its normal vendor-card Print action, as explicitly requested
by the user. Use the normal release configuration and preserve app data during
installation. Confirm physical output and scannability separately from
successful command transmission. TestFlight availability is a separate release
step, never inferred from local builds.

Protocol facts: https://github.com/merlinschumacher/nelko-p21-print and actual
iPhone/P21 device readbacks. The transport and renderer are independently written;
no third-party printer implementation is included.
