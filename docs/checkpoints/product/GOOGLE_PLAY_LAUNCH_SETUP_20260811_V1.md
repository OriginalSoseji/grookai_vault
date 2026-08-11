# Google Play Launch Setup - 2026-08-11 V1

## Status

`INITIAL SETUP 9/11 / OWNER ACTIONS OPEN`

## Context

The authenticated Grookai Play Console previously showed `5/11` setup tasks
complete. The application record, package, and staged open-testing bundle were
real, but six listing and declaration tasks remained.

## Decision

Treat sign-in details, target audience, Data Safety, and category/contact as
completed Play setup. Keep `store_and_distribution_readiness` at `partial`
because content rating and listing visuals remain incomplete and no release has
been submitted.

## Current Truths

- Initial setup is `9/11`.
- Dedicated reviewer credentials exist outside source control and sign-in works.
- Target audience is `13-15`, `16-17`, and `18 and over`.
- Data Safety is saved with ten supported collected-data categories and no data
  sharing declaration.
- Approximate location and SMS/MMS are not declared.
- Category is `Lifestyle`.
- Public support email and website are published.
- Store name and descriptions are saved as draft.
- Six verified store assets are prepared but not attached.
- IARC Terms of Use are not accepted and content rating is incomplete.
- Open testing is not submitted or rolled out; Production is inactive.

## Invariants

- Legal terms require explicit owner acceptance.
- Prepared files are not uploaded listing evidence.
- Saved declarations are not a reviewed or released application.
- Credentials never enter tracked artifacts.
- No Play gate is promoted without readback.
- The open-testing release requires explicit confirmation before submission.

## Evidence

- `docs/audits/release_completion_v1/google_play_launch_setup_v1/2026-08-11T06-35-32Z/REPORT.md`
- `docs/audits/release_completion_v1/google_play_launch_setup_v1/2026-08-11T06-35-32Z/readback.json`
- `docs/release/google_play_store_assets_v1/README.md`

## Exact Next Gate

After the owner accepts the IARC Terms of Use, complete the content-rating
questionnaire. Attach the prepared Play visual assets and verify setup reaches
`11/11`. Preview the existing open-testing release, preserve a fresh readback,
and request explicit confirmation before sending it to Google review.

