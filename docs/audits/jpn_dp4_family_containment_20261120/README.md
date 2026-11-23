# DP4 incorrect family approval containment

Six corrected DP4 parents still had active family-review rows approved for unrelated prior subjects: Jolteon/Zapdos, Weezing/Unown F, Unown P/Arbok, Unown Q/Espeon, Seviper/Unown Q, and Mankey/Makuhita. Each row had `family_link_promotion_allowed=true`. This scoped repair changes only those exact rows to `review_status=superseded` and disables promotion; it retains the original candidates and historical evidence.

The six-record plan freezes official Japanese pages and image bytes, corrected current identities, species links, all queue rows and evidence. The same-writer rollback rehearsal passed in run `57dfdc21-635e-4b1a-bfc2-912ebe76a33d`; production apply `7a6b8a34-9d71-498e-bd32-3fa9e35f036b` produced receipt `177111`. A separate read-only audit verified all six exact postimages and preserved parent, identity, species, link, and evidence state. Runtime preflight passed with documented deferred debt.

The initial two-record inspection stopped on a lock held by a separate pricing operation before any write. After the lock cleared, the scope was expanded to six, fresh preimages and source checks passed, and a new same-writer rollback rehearsal was completed. The initial two-record plan and failed inspection are retained only as history; they are not executable authority.

This containment does not correct the older active source-evidence rows whose English candidates disagree with the corrected identities. Those require separate source-specific adjudication and a governed repair. It also does not prove that an incorrect family link had actually been promoted or that no other incorrect approvals exist.
