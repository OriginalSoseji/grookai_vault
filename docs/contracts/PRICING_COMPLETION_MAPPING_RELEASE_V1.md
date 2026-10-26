# Offline reviewed mapping release V1

`buildPricingCompletionMappingReleaseV1` accepts pinned original candidate,
Master authority, offline plan and receipt bytes plus an externally observed
release checkout commit/branch/status/time. It preserves the reviewed candidate
and authority bytes exactly, verifies original candidate membership and source-run
lineage, and returns adjacent `summary.json`, `run_plan.json`, source evidence and
file hashes. The caller writes these files into new repository-contained batch
directories. Every selected batch remains bounded at 25 candidates.

This source plan uses `mode: offline_reviewed_export`. A passed summary means
offline evidence validation passed. It never means live database preflight passed.
The release checkout observation is distinct from the original planner producer:
`original_planner_commit_sha` is null and `tracked_worktree_clean` is false even
when the release checkout observation itself was clean. Packaging does not issue
source review, founder approval or execution authority.

The existing executor accepts this mode **only for `dry_run`**, rebuilds the
metadata from its pinned preserved inputs, and checks exact canonical metadata
bytes before connecting. `apply` explicitly rejects this mode. Legacy planner
mode retains its original clean source-commit, ancestor, confirmation, Master
authority, maintenance-boundary and live preflight requirements. A separately
qualified source plan is still needed before apply; do not rename this mode or
claim its packaging commit produced the original plan.

The helper is pure and uses only builtins plus existing pure authority validators.
It does not read Git, environment, credentials, database or network state. The
caller is responsible for providing truthful checkout observations and writing
files exclusively. Candidate code runs only in the isolated validation runtime.
