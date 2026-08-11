# Google Play Store Assets V1

## Purpose

These files are the prepared Google Play visual assets for Grookai Vault. They
were derived from the frozen application candidate and visually inspected
before handoff. They are not evidence that the Play listing has been submitted
or released.

## Upload Mapping

| Play field | File | Dimensions |
| --- | --- | --- |
| App icon | `app_icon_512.png` | `512 x 512` |
| Feature graphic | `feature_graphic_1024x500.png` | `1024 x 500` |
| Phone screenshot 1 | `01_search.png` | `1475 x 2622` |
| Phone screenshot 2 | `02_search_results.png` | `1475 x 2622` |
| Phone screenshot 3 | `03_exact_printing.png` | `1475 x 2622` |
| Phone screenshot 4 | `04_card_detail.png` | `1475 x 2622` |

Google Play requires at least two phone screenshots. All four are prepared so
the listing can show the Search-to-exact-printing journey. The fourth screenshot
accurately shows an unavailable-pricing state and may be omitted if a tighter
marketing set is preferred.

## Source

The phone assets use candidate screenshots preserved under:

`docs/audits/release_completion_v1/device_ios/candidate_289_install_and_launch_v1/2026-08-10T02-27-05Z/screenshots/`

The screenshots were padded to a stable `9:16` canvas without changing the
captured application content. The app icon and feature graphic use the existing
Grookai mark and release palette.

## Verification

- File dimensions and nonzero sizes were read back locally.
- All six PNG files were visually inspected.
- No credentials, authenticated account data, or private collector information
  are present.
- Browser automation could open the Play asset drawer, but the current browser
  bridge rejected local file attachment with `Not allowed`. The assets therefore
  remain prepared but not attached to the Play listing.

