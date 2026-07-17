# Next Calibration Batch Plan

## Recommendation

Run a `125` card offline calibration dry run: `25` cards per branch.

At the measured bounded-apply cost of `$0.00433214` per validated card, the projected model cost is approximately `$0.5415`.

## Branch Targets

- Pokemon: `25`
- Trainer: `25`
- Stadium: `25`
- Energy: `25`
- Item / Tool / Supporter: `25`

## Required Risk Strata

Include, across the sample:

- old yellow-border cards;
- modern silver-border cards;
- dark-border or unusual-border cards;
- glare-heavy scans;
- cropped scans;
- Trainers with ambiguous expressions;
- Pokemon with complex anatomy;
- abstract Energy cards;
- Stadium environments;
- objects with reflective illustrated surfaces;
- multi-subject artwork;
- full-art layouts;
- standard layouts.

## Human Review Scope

Review only the calibration sample and any rows routed to `human_review_required` by deterministic blockers. Do not manually review the full eligible catalog.

## Stop Rules

- No database status changes.
- No approvals.
- No embeddings.
- Stop and repair if any auto-approval-eligible candidate has a material subject, anatomy, subject-count, physical surface, or border-color error.
- Do not patch policy midway through the run; complete the sample first, then review the full batch.
