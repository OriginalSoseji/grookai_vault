# Backend Dependency Security 2026-07-31 V1

## Status

Implementation and local verification are complete on
`security/backend-dependencies-v1`. Merge and deployment remain separate gates.

No database migration, production database write, pricing publication change,
approval, embedding, or downstream integration was performed.

## Context

The release-readiness audit and newly enabled Dependabot scanning identified 27
open backend alerts after separating the web-runtime findings. They were
concentrated in the AI border service Python environment and the backend npm
image/ML dependency tree.

## Problem

- Pillow `12.1.0`, Starlette `0.50.0`, and IDNA `3.11` were below current
  patched floors.
- Backend Sharp was pinned to `0.33.2`, while Transformers brought Sharp
  `0.34.5` and ONNX Runtime brought `adm-zip 0.5.17`.
- The AI border service imported `requests` unconditionally without declaring
  it in `requirements.txt`, so a clean environment could not import the app.
- A direct `pip-audit` found additional current Click and Requests advisories
  that were not yet represented in the repository Dependabot alert set.

## Decision

1. Upgrade the AI service to FastAPI `0.141.1` and Starlette `1.3.1`.
2. Upgrade Pillow to `12.3.0`, IDNA to `3.15`, Click to `8.3.3`, and Requests
   to `2.33.0`.
3. Declare FastAPI's `annotated-doc 0.0.5` dependency and the previously missing
   Requests runtime dependency explicitly.
4. Pin backend Sharp to `0.35.3` and override all transitive Sharp copies to the
   same tested version.
5. Override transitive `adm-zip` to patched `0.6.0`.
6. Add source contracts that prevent the dependency floors or missing Requests
   declaration from regressing.

## Alternatives Rejected

- Dismissing Dependabot findings was rejected because patched versions exist.
- Removing Transformers/ONNX was rejected because the scanner dependency path
  remains active and the patched overrides pass import and image tests.
- Adding audit exceptions was rejected because it would hide current release
  risk.
- Updating unrelated AI models or scanner behavior was rejected because this is
  a dependency-security gate only.

## Verification

| Check | Result |
| --- | ---: |
| Backend npm audit | 0 vulnerabilities |
| AI service pip-audit | 0 known vulnerabilities |
| Clean Python dependency install | passed |
| Python dependency consistency (`pip check`) | passed |
| Backend dependency contracts | 3 / 3 passed |
| Full Node contract suite | 1,201 / 1,201 passed |
| Sharp processing smoke | passed on `0.35.3` |
| Transformers and adm-zip import smoke | passed |
| FastAPI service boot | passed |
| Perspective-warp HTTP smoke | 128 x 180 JPEG, 13,577 bytes |

## Current Truths

- The modified backend npm and Python manifests audit clean locally.
- Dependabot alert closure is not proven until GitHub evaluates the merged
  manifests on the default branch.
- This change does not modify scanner inference, OpenAI usage, canonical data,
  or product-visible behavior.
- The AI border service still requires its existing runtime secrets for the
  protected OpenAI identification endpoint.

## Invariants

- Image and ML dependencies must remain compatible with existing scanner and
  condition-worker imports.
- Actual AI endpoint secrets remain external to the repository.
- Dependency audit success must not rely on advisory suppression.
- Dependency upgrades must not trigger OpenAI calls or canonical writes during
  verification.

## What Must Never Be Broken

- A clean deployment must be able to import and boot the AI border service from
  the checked-in requirements alone.
- Untrusted archive or image input must not use known vulnerable dependency
  versions when patched releases are available.
- Scanner and image-processing behavior must be tested after Sharp or Pillow
  upgrades.
- Dependency-only repair must not alter canonical identity or production data.

## Exact Next Gate

1. Rebase onto the final merged Next 16 security commit if needed.
2. Pass the full repository shipcheck from the rebased commit.
3. Open a draft pull request and require CodeQL, runtime protection, drift, and
   Vercel checks to pass.
4. Merge and confirm the backend Dependabot alert count reaches zero after
   GitHub re-evaluates the default branch.
