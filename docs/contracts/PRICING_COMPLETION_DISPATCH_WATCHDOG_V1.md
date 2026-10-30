# Pricing completion dispatch watchdog V1

## Purpose

The Windows watchdog is a redundant clock for the active
`TCGPLAYER_PRICING_COMPLETION_AGENT_V4` GitHub workflow. GitHub schedule events
remain primary, but observed multi-hour gaps mean schedule configuration alone
is not production freshness proof. The watchdog polls every five minutes and
requests one `workflow_dispatch` only when the latest `main` run is stale or a
failed run has passed its retry delay.

## Required behavior

- The default healthy-success window is 20 minutes.
- A queued or running workflow suppresses dispatch for up to 45 minutes because
  the hosted job has its own 30-minute timeout.
- A failed hosted run receives a five-minute retry delay.
- A successful local dispatch request suppresses another request for 20 minutes,
  even when GitHub has not displayed the new run yet.
- A named mutex makes concurrent watchdog invocations a safe no-op.
- Every decision is retained in `latest.json` and append-only `watchdog.jsonl`.
- Dry-run mode performs the same read and decision logic without dispatching.

The watchdog may call only GitHub's workflow-dispatch surface for the canonical
repository, workflow, and `main` ref. It receives no Supabase credential and has
no database, mapping, price-publication, catalog, or customer-state authority.
The hosted agent's existing concurrency and no-write boundaries remain binding.

## Host boundary

The task is a redundant owner-workstation route, not a cloud availability
guarantee. It runs only while Windows and the authenticated owner session are
available. Loss of the task, GitHub CLI authentication, network access, or the
workstation must surface through its task result and retained receipt; none may
be interpreted as a completed pricing census.

The installed action uses PowerShell 7 (`pwsh.exe`). GitHub timestamps must be
parsed with `ConvertFrom-Json -DateKind String` before explicit UTC conversion;
implicit local `DateTime` conversion is not accepted for freshness decisions.
