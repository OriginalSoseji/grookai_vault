# Founder Manual Review Packet V1

Use with the [workflow contract](../contracts/FOUNDER_MANUAL_APPROVAL_WORKFLOW_CONTRACT_V1.md)
and [runbook](../ops/FOUNDER_MANUAL_APPROVAL_RUNBOOK_V1.md).
This is a preparation template, not a new RPC schema or an execution manifest.
Replace placeholders and omit inapplicable fields before publication.

## Batch inventory

- Topic / batch ID:
- Owning registered agent / allowed work-item and action types:
- Target environment / source commit / governing contracts:
- Total items / already decided / remaining / blocked:
- Existing confirmations and their exact evidence/decision references:
- Queue route and task-title prefix:
- Publication intent / receipt / independent readback artifact:

## One task per independent decision

- Title: `Review <topic>: <specific item>`
- Question: `<One plain-language decision>`
- Stable target IDs and current state:
- Proposed result or current → proposed comparison:
- Uncertainty, conflicting evidence, or limitations:
- Approval means: `<review confirmation OR exact bounded execution>`
- Expected effects / explicit exclusions:
- Next step after approval:
- Risk / recent-auth requirement and rationale:
- Work-item key / version / fingerprint:
- Source commit / contract version / expiry policy:

For review only:

```json
{
  "command_policy": { "execution_enabled": false },
  "executor_version": null
}
```

For execution, use the existing registered command/outcome schema with every
stage, effect, ceiling, deadline, and stop condition frozen. Do not turn this
review template into an arbitrary command runner.

## Clickable evidence

| Evidence | Phone-accessible link | Retained reference | SHA256 / bytes / media type | What it proves |
| --- | --- | --- | --- | --- |
| Original / source | [Open original](<replace-with-approved-evidence-route>) | `<artifact or object reference>` | `<exact values>` | `<bounded fact>` |
| Proposed comparison / packet | [Open proposal](<replace-with-approved-packet-route>) | `<frozen artifact reference>` | `<exact values>` | `<decision scope>` |

- Source provenance and retention class:
- Link access / hash verification result and time:
- Selected phone surface and evidence-control check:

## Publication and decision reconciliation

- Published task ID / version / fingerprint / evidence IDs:
- Independent readback result:
- Review-only checks: no commands, no publisher-made approvals, domain preserved:
- Actual founder decision ID / actor / timestamp / action / note:
- Decided version and fingerprint match:
- Disposition: pending / approved / rejected / deferred / repair requested /
  expired / superseded:
- Governed next step and its separate execution/publication result, if any:
