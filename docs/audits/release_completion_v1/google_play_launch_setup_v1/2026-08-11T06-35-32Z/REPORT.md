# Google Play Launch Setup V1

## Decision

Status: `INITIAL SETUP 9/11 / OWNER ACTIONS OPEN`

The authenticated Grookai Play Console setup advanced from `5/11` to `9/11`
without submitting or rolling out a release. Sign-in access, target audience,
Data Safety, and category/contact information are saved. Store copy is drafted
and six store visual assets are prepared and visually verified.

The distribution gate remains `partial`. Content rating requires the account
owner to accept the IARC Terms of Use before its questionnaire can be completed.
The store listing remains incomplete because the browser automation bridge is
not permitted to attach local files.

## Saved Play Information

- Restricted access: yes.
- Dedicated reviewer account: `play-review@grookaivault.com`.
- Reviewer account sign-in: independently verified.
- Two-step verification or purchase: not required.
- Target audience: `13-15`, `16-17`, and `18 and over`.
- App category: `Lifestyle`.
- Public support email: `support@grookaivault.com`.
- Public website: `https://grookaivault.com`.
- Account deletion URL: `https://grookaivault.com/account/delete`.
- Data encrypted in transit: yes.
- Data shared with third parties: no.

## Data Safety Declaration

The saved collected-data set is:

- Name: optional; app functionality and account management.
- Email address: required; app functionality and account management.
- User IDs: required; app functionality and account management.
- Other in-app messages: optional; app functionality.
- Photos: optional; app functionality.
- Crash logs: required; analytics.
- Diagnostics: required; analytics.
- App interactions: required; app functionality.
- Other user-generated content: optional; app functionality.
- Device or other IDs: optional; app functionality.

Approximate location and SMS/MMS were removed because they are not supported by
the frozen product behavior.

## Store Listing

The saved draft uses:

- App name: `Grookai Vault`.
- Short description: `Organize, discover, and showcase your Pokemon card collection.`
- Full description: collector-focused copy covering Search, Scan, exact printing
  and finish selection, Vault, Binders, Wall, Dex, Sets, discovery, following,
  and card-centered messaging.

Prepared assets are documented in
`docs/release/google_play_store_assets_v1/README.md`.

## Open Boundaries

1. IARC Terms of Use are not accepted. The content-rating questionnaire is not
   complete.
2. Six prepared PNG assets are not attached to the Play listing because local
   file upload is blocked by the active browser bridge.
3. The open-testing release has not been previewed, submitted for review, or
   rolled out.
4. Production remains inactive.

## Security And Privacy

- Reviewer credentials are stored only in ignored local environment state.
- No password appears in this audit package.
- No release or production-track mutation occurred.
- No application, database, pricing, or collector data was changed.

## Release Effect

`store_and_distribution_readiness` remains `partial`. Four of the six previously
open initial-setup tasks are complete, leaving two. The release may not be called
Play-ready until content rating and visual assets are complete and the resulting
open-testing release is previewed and read back.

## Exact Next Gate

The account owner accepts the IARC Terms of Use. Complete and save the factual
content-rating questionnaire, attach the six prepared visual assets, and verify
initial setup reads `11/11`. Then preview the existing open-testing release and
request explicit confirmation before sending it to Google review.

