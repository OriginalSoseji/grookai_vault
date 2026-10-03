# Sales desk workflow and dashboard — October 3, 2026

Current worktree: `C:/gv_sales_desk_pro_20261003`, branch
`feature/sales-desk-pro-20261003`, baseline current main
`fe3e4b23f0bf623522e2d26c1323053eafbd49ab`.
Read [the contract](../contracts/SALES_DESK_PRO_V1.md).

The previous cart release is LIVE: PR586, main1e6a1cf24, production416,
TestFlight1.0.0(341), existing internal audience. Its external release checkpoint
supersedes historical pre-release notes. Never replay its consumed apply/upload
intents. This new candidate adds drag/drop, canonical catalog quick-add and an
in-person receipt dashboard; it is not live until independent release readbacks.

Read-only strict416 baseline passed: 171036 cards,3400 sets,32903 traits;
1125 security objects and normalized schema match the retained416 replay.
No production customer, inventory, entitlement or payment test writes.
Full417 replay/no-op push and retained416-to417 upgrade pass in new dedicated labs:

- `sales-pro-full-417-v1-20261003`:65000 DB/65001 API/65004 inbox,
  internal10.245.130.0/24.
- `sales-pro-upgrade-417-v1-20261003`:65020/65021/65024,
  internal10.245.131.0/24. Two retained copies preserved exactly.

Never reset these populated labs or reuse older648xx/repair services. Both new
labs use PostgreSQL17.6.1.113, workers0, cron0 and loopback-only relays. Runtime
helpers assert fixed local targets and remove only their synthetic fixtures.
The web proof flag `NEXT_PUBLIC_SALES_DESK_PRO_LOCAL_TEST` accepts only65001 and
is forbidden in production or combined staging modes. Production guards remain.

Mac proof checkout: `/Users/cesarcabral/grookai_sales_pro_20261003`, isolated
shared-object clone with sparse native source and a hash-checked source overlay.
The old341 archive/worktree remain unchanged. The new task-created simulator ID,
local-only defines and logs are in `.local/sales-pro`; never package test defines
into a release. Loopback65001/15471 SSH relays exist only during native proof.
The first source archive named a nonexistent assets directory and was rejected;
only native-source-v2 is used. The first simulator type lacked its memory suffix
and was rejected before creating a device. Preserve diagnostics as history.

Actual iPad Auth/runtime proof now passes: thumbnail drag, canonical resolver
search, explicit printing, durable copy creation, mixed three-line/four-unit
$42.34 sale, and account isolation. Independent DB readback confirms two exact
copies archived once. Website proof reopens that receipt and both sources of a
second two-copy receipt without duplicate saves. Native reporting then reads the
two receipts as two transactions/six units/$62.34, filters by item description,
opens receipt details and dismisses them on sign-out. Screenshots were inspected;
the final chart fits all24hours on iPad and metric tiles use balanced columns.

The initial simulator run rejected absent test defines (Xcode's generated Debug
configuration replaced CLI extras). A test-only Debug configuration fixed that;
Release configuration never received synthetic account credentials. A subsequent
test-selector typo expected the old two-line cart after adding a third line;
the actual catalog add succeeded. Those failed synthetic fixtures were captured
and removed explicitly, never reset. Final native and separate dashboard runs
pass with exact source hashes. The task-created simulator was removed and the
loopback SSH relays closed. All original simulators and the341 archive remain.
Both database controls were restored OFF and synthetic Auth/inventory removed.

External authoritative checkpoint and test/release evidence:
`C:/grookai_vault_operator_artifacts/sales_desk_pro_20261003`.
Review it before continuation; local proof does not imply merge, live migration
or TestFlight availability. Preserve active Pokemon relationship repair and the
unmerged checkout/refund worktree. Recheck their schema/dependency fingerprints
before production apply; this migration adds no catalog/inventory foreign keys.
