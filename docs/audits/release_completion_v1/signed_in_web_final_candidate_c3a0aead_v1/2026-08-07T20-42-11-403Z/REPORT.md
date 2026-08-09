# Final-Candidate Signed-In Web Journeys V1

- Status: `passed`
- Production origin: `https://grookaivault.com`
- Deployment SHA: `c3a0aeadf903d4cfc83b004798a397dd718f4f58`
- Verifier SHA: `c3a0aeadf903d4cfc83b004798a397dd718f4f58`
- Deployment ID: `5801417932`
- Journey D web proof: `passed_web_final_candidate`
- Journey C read-only context: `passed_read_only_context_only`
- Journey E web-supported context: `passed_web_supported_surfaces_only`

## Routes

| Viewport | Role | Route | Status | Broken images |
| --- | --- | --- | --- | ---: |
| narrow | subject | `/network/discover?q=release-owner-20260807133819` | passed | 0 |
| narrow | subject | `/following` | passed | 0 |
| narrow | subject | `/network` | passed | 0 |
| narrow | subject | `/network/inbox` | passed | 0 |
| narrow | subject | `/u/release-owner-20260807133819` | passed | 0 |
| narrow | subject | `/card/GV-PK-MEW-025` | passed | 0 |
| narrow | subject | `/gvvi/GVVI-B3591CC8-000001` | passed | 0 |
| narrow | owner | `/vault` | passed | 0 |
| narrow | owner | `/gvvi/GVVI-B3591CC8-000001` | passed | 0 |
| narrow | owner | `/binders` | passed | 0 |
| narrow | owner | `/dex` | passed | 0 |
| narrow | owner | `/sets` | passed | 0 |
| narrow | owner | `/wall` | passed | 0 |
| narrow | owner | `/u/release-owner-20260807133819` | passed | 0 |
| desktop | subject | `/network/discover?q=release-owner-20260807133819` | passed | 0 |
| desktop | subject | `/following` | passed | 0 |
| desktop | subject | `/network` | passed | 0 |
| desktop | subject | `/network/inbox` | passed | 0 |
| desktop | subject | `/u/release-owner-20260807133819` | passed | 0 |
| desktop | subject | `/card/GV-PK-MEW-025` | passed | 0 |
| desktop | subject | `/gvvi/GVVI-B3591CC8-000001` | passed | 0 |
| desktop | owner | `/vault` | passed | 0 |
| desktop | owner | `/gvvi/GVVI-B3591CC8-000001` | passed | 0 |
| desktop | owner | `/binders` | passed | 0 |
| desktop | owner | `/dex` | passed | 0 |
| desktop | owner | `/sets` | passed | 0 |
| desktop | owner | `/wall` | passed | 0 |
| desktop | owner | `/u/release-owner-20260807133819` | passed | 0 |

## Existing Card Message Context

| Viewport | Threads | Reply forms | Reply submitted | Status |
| --- | ---: | ---: | --- | --- |
| narrow | 1 | 1 | false | passed |
| desktop | 1 | 1 | false | passed |

## Database Reconciliation

- Before/after equal: `true`
- Subject follows owner: `true`
- Exact owner copy: `true`
- Existing open card interaction: `true`
- Subject current Want remains false: `true`

## Boundaries

- Credentials came from an external temporary file and are not stored in artifacts.
- Each role and viewport used a new isolated browser context.
- After authentication, every non-read browser request was blocked.
- Follow, Want, message, vault, and database mutations were not performed.
- No browser cookies, local storage, session storage, tokens, emails, or user UUIDs are preserved.
- Screenshots and report artifacts are SHA-256 hashed.

## Scope

Journey D is proven for final-candidate web. Journey C proves the existing exact-card owner/message context but does not create a new Want-to-match transition. Journey E proves the supported web collection surfaces but leaves mobile Journeys and Memories for device evidence.

