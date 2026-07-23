# IMG-HOST-WH-23A-POCKET-NATIVE-UPLOAD-DRY-RUN

- Mode: dry_run_no_write
- Scope: GV-TCGP-P-A-74..GV-TCGP-P-A-100
- Approval fingerprint: `3f97ca99808af6ce8d73325a93546a8489e313157907a0ffc918e00c004f3084`
- Code bundle hash: `3137f9188489065ccacd292b2e4ac7e5d3048a658060ca2b5c8bd1a7c69a47be`
- Asset manifest hash: `af1f82f1ace98ca3c05b3da77fa54421cf365cb89b434d5e1d5187ae5ed644e4`
- Row manifest hash: `697f39cfdb26bee3d6bddf71b73819fa0142a1c3bced857e0294de14223fe273`
- Verified primary assets: 27 / 27
- Verified independent fallbacks: 27 / 27
- Highest verified untransformed full-card source: 367x512 across Pokemon Zone and Serebii for every scoped card at acquisition time
- Exact source bytes preserved without upscale: true
- Existing hosted Pocket convention samples verified: 4 / 4
- New uploads required: 27
- Ready for guarded storage apply: true
- Stop findings: none
- Storage writes performed: false
- Database writes performed: false
- Migrations created: false

The 600x825 convention samples are exact copies of the historical TCGdex Pocket payloads. For P-A 74–100, the highest directly verified, untransformed complete-card sources available at acquisition time are 367x512, so WH23 stores the exact Pokemon Zone WebP bytes instead of manufacturing a larger upscale. The Serebii JPEG remains in `image_url` only as a functioning provider fallback; `image_path` is the Grookai-hosted primary.
