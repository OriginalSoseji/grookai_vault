# Japanese Master Index V4 Image Acquisition Readiness V1

Generated: 2026-08-05T17:22:49.348Z

## Status

- Status: `manifest_and_local_download_canary_complete`
- Exact manifest rows: 5336
- Canary rows: 70
- Storage writes: 0
- Database writes: 0

## Manifest

- Unique parent IDs: 5336
- Unique parent GV-IDs: 5336
- Unique primary URLs: 5336
- Rows with fallback sources: 50
- Primary hosts: {"assets.tcgdex.net":18,"limitlesstcg.nyc3.cdn.digitaloceanspaces.com":35,"www.pokemon-card.com":5283}
- Fallback hosts: {"limitlesstcg.nyc3.cdn.digitaloceanspaces.com":18,"www.serebii.net":32}

## Download Canary

- Ready for a future Storage canary: 17
- Low-resolution review: 53
- Duplicate-content review: 0
- Quarantined with no valid source: 0
- Primary source selected: 52
- Fallback source selected: 18
- Local cache bytes: 7255413
- Source hosts selected: {"limitlesstcg.nyc3.cdn.digitaloceanspaces.com":53,"www.pokemon-card.com":17}
- Formats: {"jpg":17,"png":53}
- Quality bands: {"high":17,"low":53}

The canary downloaded source bytes only to the repository's ignored `.tmp`
directory. It did not access or write Supabase Storage and did not connect to
the database.

## Decision

Use the canary failures and fallback behavior to repair the acquisition plan
before any Storage upload. A successful download proves byte availability,
format, dimensions, and hash; it does not by itself constitute a human visual
identity confirmation or authorize a database image-pointer update.
