# Social Media Emulator Agents V1

## Objective

Produce repeatable vertical product videos from a real Grookai Vault Android
build without granting an agent access to a social account or publishing API.
Every recording is a draft artifact that requires human review.

## Agent Roles

1. Scenario planner
   - Converts one product capability into a short, bounded scenario JSON file.
   - Defines the collector audience, opening state, interactions, and expected UI.
2. Emulator director
   - Resets and launches the approved app package.
   - Finds controls from Android accessibility semantics instead of fixed taps.
3. Capture agent
   - Records the emulator through Android `screenrecord`.
   - Preserves the raw MP4, final frame, UI dumps, device metadata, and hashes.
4. Editorial agent
   - Produces a proposed hook, caption, overlay script, and cut list from the
     approved scenario and recording manifest.
   - V1 records raw video only because no repository-approved transcoder is
     installed. It never modifies the evidence recording.
5. QA and compliance agent
   - Verifies the MP4 header, minimum size, completed steps, app package, and
     no-publish boundary.
   - Rejects scenarios containing post, upload, share, or social-login actions.
6. Human publisher
   - Reviews product accuracy, privacy, crop, pacing, copy, music rights, and
     platform policy before manually publishing an edited derivative.

## Workflow

```text
product scenario
-> validated scenario JSON
-> emulator setup
-> semantic UI direction
-> raw vertical screen recording
-> manifest + hashes + QA report
-> human editorial review
-> optional external edit
-> manual publication
```

## Safety Boundaries

- The agent has no social credentials and no posting capability.
- It records only `com.grookai.vault` on a selected Android device.
- Scenario duration is limited to 90 seconds.
- App state is cleared before the signed-out canary.
- The canary performs no authentication and no app-data writes.
- Customer names, Vault contents, messages, memories, and account data are not
  permitted in reusable scenarios.
- Raw recordings remain evidence. Edited derivatives must reference the source
  manifest and video hash.

## Scenario Contract

Scenarios use `EMULATOR_SOCIAL_VIDEO_SCENARIO_V1`. Only these actions are
allowed: clear app, launch, sleep, wait for a semantic selector, tap a semantic
selector, enter text, send a key event, and swipe. Publishing actions fail
validation before the emulator is touched.

## V1 Canary

The first scenario opens the signed-out catalog, searches for Charizard, waits
for real results, hides the keyboard, and scrolls the rendered card grid. It is
deliberately public-data-only and cannot expose a collector account.

Run it with:

```powershell
npm run social:video:canary
```

Artifacts are written under
`artifacts/social_media/emulator_video_agent_v1/<run>/`.

## Expansion Plan

After the canary is approved, add scenarios for exact-variant search, card
detail, set browsing, pricing provenance, Memories, and visual search. Signed-in
scenarios require dedicated seeded demo accounts and field-level redaction.
Add a repository-approved editor such as FFmpeg or Remotion before automated
cropping, overlays, captions, or branded end cards. Publication remains a
separate human gate.

