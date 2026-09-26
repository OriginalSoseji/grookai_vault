# Vendor store trials V1

Production trials admit invited vendors to store setup, owner previews and desktop
inventory management. They do not charge a subscription, enable checkout/payouts,
grant public-web publication, change collector sharing, select inventory or create
a store automatically. Existing Vendor Mode access is preserved.

Only a verified authenticated session can redeem a 256-bit invitation. Only its
SHA-256 is stored. Private invitation/member tables have no anonymous or ordinary
authenticated access. Redemption locks the invitation and owner, caps membership
at ten, preserves existing managed entitlements, and is idempotent without extending
the original expiration. Each account receives at most one trial, bounded by both
the invitation's expiry and fourteen days from activation.

The authoritative database entitlement reader checks trial expiration and revocation
on every read. Raw trial features remain empty: trial access is not a permanent
manual grant and cannot bypass later billing suspension. Verified paid coverage can
continue independently after a trial. Retained owner data remains readable after
expiration; new edits fail. Trial expiry never deletes inventory or changes ownership.

The website requires the fixed production project, database, origin and explicit
trial flag. Entry removes the token from navigation, stores it in an HttpOnly/Secure
SameSite cookie, and uses a token-free authentication return path. Activation requires
the canonical Origin and private/no-store responses. Invitations are delivered by
the owner; the release process does not send email to vendors.

Migration `20260926200000` changes one entitlement reader and adds 26 invitation
objects. Seven real database role/concurrency/lifecycle checks, HTTP handler checks,
the 402-file replay and normal repository checks govern release. Payment controls
remain disabled. Rollback disables admission/publication controls and retains data.
