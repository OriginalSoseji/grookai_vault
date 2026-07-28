# MEE Pricing Platform Production V1 Feature Freeze

**Status: ACTIVE**

**Effective date: 2026-07-28**

## Rule

Effective immediately, the Production V1 release branch accepts only:

- bug fixes
- rollout gates
- deployment work
- migration execution already required by the frozen contract
- verification
- security correction
- operational reliability

It does not accept:

- new features
- architectural redesign
- opportunistic refactors
- unrelated UX improvements
- new valuation models
- new card categories, languages, or games
- “while we are here” scope

## Release Objective

The only objective is to satisfy:

```text
docs/contracts/MEE_PRICING_PLATFORM_PRODUCTION_V1_DEFINITION_OF_DONE.md
```

Remaining release sequence:

```text
finish 72-hour canary
-> apply frozen migrations
-> deploy latest web and Flutter clients
-> verify all 17 product surfaces
-> verify at least 95 percent exact coverage
-> activate signed-in full publication
-> observe seven unattended cycles
-> publish final production report
-> keep anonymous rollout closed until licensing passes
```

## Change Classification

Every proposed change must be classified before it enters the release branch:

- `release_required`: directly closes a frozen Definition of Done requirement.
- `release_defect`: corrects behavior that contradicts a frozen requirement.
- `release_reliability`: improves the ability to operate or prove the frozen
  system without changing semantics.
- `v1_1_parking_lot`: useful, but not required for Production V1.
- `rejected_for_v1`: changes scope or weakens release evidence.

Only the first three classifications may proceed on the Production V1 branch.

## Founder Operating Mode

The governing question is no longer:

> How can pricing be made more capable?

It is:

> What evidence proves Production V1 is ready, and what exact release
> requirement remains unproven?

Production completion requires operational duration, not merely working code.
