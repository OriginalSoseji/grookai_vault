# Fresh-User Ten-Second Comprehension Runbook V1

## Purpose

Collect the one remaining human result for Journey A without coaching the
tester or substituting automated evidence for comprehension.

## Eligible Tester

The tester must:

- have never used Grookai;
- have never seen a Grookai demo, screenshot, pitch, or prior test;
- not have been told what Grookai does before the test;
- not be the founder, PokeJavi, a current beta tester, or a contributor.

Use an anonymous identifier such as `fresh_tester_001`. Do not record a name,
email, phone number, or account identifier.

## Candidate

Preferred surface:

- TestFlight `1.0.0 (289)`, fully signed out, on the first app screen.

Permitted fallback:

- production `https://grookaivault.com` from frozen source `a8ec3d2`, with no
  signed-in cookies.

Record the exact surface in the result. Do not use a local development build or
a different app version.

## Procedure

1. Confirm only: `Have you ever seen or used Grookai, or been told what it
   does?` Stop if the answer is yes.
2. Prepare the signed-out first screen before the tester can see it.
3. Say only: `Look at this for ten seconds.`
4. Expose the screen for exactly ten seconds. Do not point, explain, answer, or
   scroll.
5. Hide the screen.
6. Ask these questions exactly, in order:
   - `What do you think this is?`
   - `Who do you think it is for?`
   - `What would you do next?`
   - `What do you think connect with collectors means here?`
7. Record every answer verbatim. Do not summarize or improve the wording.
8. Classify the answer using the rubric below.
9. Preserve the completed JSON in a timestamped directory under
   `docs/audits/release_completion_v1/fresh_user_comprehension_v1/`.

## Pass Rubric

Pass only when all are true:

- the tester independently identifies cards, card collecting, or a card
  collection;
- the tester identifies collectors or people who collect cards as the intended
  audience;
- the tester identifies a plausible visible next action such as exploring
  cards, showing a collection, signing in, or connecting with collectors;
- the tester does not describe Grookai only as a generic social network or only
  as an online store/marketplace;
- no coaching occurred.

Collection organization/showing and collector connection are recorded
separately. A weak answer is not upgraded because the facilitator understands
what the tester probably meant.

## Fail And Invalid Rules

- `FAIL`: a valid fresh test does not meet every pass condition.
- `INVALID`: prior exposure, briefing, facilitator coaching, wrong candidate,
  missing verbatim answers, or exposure materially longer than ten seconds.
- A failed or invalid result remains preserved. Do not silently rerun the same
  person.

## Release Boundary

One valid pass satisfies the currently frozen manifest requirement. A second
independent tester is recommended but is not required to rewrite the release
contract. Journey A must remain `partial` until a completed artifact exists and
has been reviewed against this rubric.
