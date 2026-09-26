# Order cancellation prerequisite: recovered catalog ledger

Before cancellation schema development, strict preflight found applied migration
20260919193000 absent from current main340d69ed and storefront8680fd643. The applied
ledger contains one complete SQL statement, matching the untracked catalog draft
byte-for-byte. Recovery authority is that remote ledger, not the dirty worktree.
The exact SHA256 is80d659799f06bddd0f86e4339a214d470d378d2c2918da20ca25c0e6d6cf552e.
No source edits or execution of catalog repair packets are authorized by recovery.

The clean recovery worktree is C:/gv_store_cancel_reconcile_20260919 at8680fd643.
The same verified SQL is retained there and in the implementation candidate.
All403 preceding migration files remain byte-exact. The recovered migration was
already applied remotely; it must not be applied again or assigned a new timestamp.
It changes only the governed Japanese unnumbered-event identity predicate,
serializer and printed-number constraint/nullability as recorded in that ledger.
Remote catalog data and schema are never mutated by this task.

The new fixed environment is grookai-order-cancel-20260919, API20821/DB20822,
mail20824/shadow20828, reserved web20840. The internal database network, pinned
PostgreSQL17.6.1.113 image, loopback relay and zero workers follow earlier proof.
The initial204xx attempt failed because its project name exceeded the CLI limit;
its logs/resources remain preserved. All200xx and older proof projects stay intact.

AuditLinkedSchema -VendorOrderCancellationBaselineAudit is read-only development
proof for exactly seven pending IDs: 20260919050000,080000,120000,130000,150000,
170000 and180000. It compares the397-row recovered production baseline using the
unchanged schema/security inspection engine. It cannot authorize PrePush, combined
exceptions or arbitrary migration IDs. The default gate is unchanged.

Full404-file local replay adds those seven pending migrations to the recovered
baseline and compares against the prior403-file local proof. Only two existing
identity objects may change and two related objects may be added; all other
definitions/security must remain exact. This is reconciliation, not cancellation
implementation, a catalog truth audit, or production-apply authorization.
