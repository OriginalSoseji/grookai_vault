# Prismatic alias discovery read repair V4

V4 is the active release package. It includes the immutable V3 migration and
`20261117200000_prismatic_identity_free_set_code_v4.sql`. The forward repair
resolves whole legacy set-code tokens once before identity matching and ranking,
including mixed card-name queries, token positions and repeated tokens.
The regression fixture uses ordinary card names to exercise set-code matching
independently of name matching. All earlier identity and visibility rules apply.

The release uses revision 3 of the unshipped V4 candidate. The earlier local V4
drafts and its executed sources remain in the earlier labs and a lossless source
archive. The linked migration list confirms that production ends at
`20261114080000`; both release candidates are above that boundary.

Qualification binds a new genuine fresh 498 reset/replay and a separately
populated 496-to-498 upgrade through the official CLI. The complete chain
preserves every historical source byte and protected table fingerprint.
Both final labs must match in schema/security and pass both reader
roles, free-text and explicit set routing, rollback, idempotence and HTTP checks.
Existing populated labs and their earlier source/receipt records are retained.

`-PrismaticAliasDiscoveryReleaseV4` accepts a fresh canonical 496 baseline audit
and exact-pair PrePush. PrePush binds clean committed source, successful normal
checks, the complete source and receipt hashes, both final local ledgers and
protected states. The production package contains exactly the two pending
migrations. Apply through the official CLI and verify the final 498 ledger,
qualified schema/security, canonical 194 discovery and protected production data.

The first migration installs the discovery projection atomically. The second
replaces one read function. An interrupted package is resumed through the
official migration ledger after independent state inspection. Earlier failed
free-text and managed-check receipts remain historical evidence.
