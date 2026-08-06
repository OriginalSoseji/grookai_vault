# Production Signed-Out Web Smoke - 2026-08-06

## Scope

An isolated, cookie-free Chromium context exercised the current production deployment at mobile (`390 x 844`) and desktop (`1440 x 1000`) viewports. The authenticated Chrome session was not modified.

Production deployment evidence at the time of the smoke:

- Origin: `https://grookaivault.com`
- Deployment commit: `e8fcbdbb47b97a9db215d3874ea9ae83ce075adf`
- Binder health deployment: `dpl_G9Ay9vMgMt9zV7VY8o52MVs2aZ39`
- Authentication state: signed out

## Journey Results

| Route | Result | Visible proof |
| --- | --- | --- |
| `/` | Passed | `Grookai Vault` and the permanent digital card show proposition were visible; Search, Explore cards, and Sign in were explicit. |
| `/card/GV-PK-AR-71` | Passed | Pikachu identity, artwork, set, number, rarity, finish selection, Vault state, pricing sign-in boundary, collector availability, and card actions were visible without authentication. |
| `/network` | Passed | Public collector activity and exact card context were visible; interaction actions were explicitly signed-in. |
| `/scan` | Passed | Redirected to `/login?next=%2Fscan` and rendered `Sign in to Scan` with scanner-specific continuation copy. |
| `/wall` | Passed | Redirected to `/login?next=%2Fwall` and rendered `Sign in to your Wall` with Wall-specific continuation copy. |
| `/vault` | Passed | Redirected to `/login?next=%2Fvault` and rendered `Sign in to your Vault` with collection/exact-copy continuation copy. |
| `/binders` | Passed for signed-out continuity | Redirected to `/login?next=%2Fbinders` and rendered `Sign in to Binders` with collection-goal continuation copy. The signed-in production route remains disabled in the current deployment and is a separate release blocker. |

No route produced an unexplained generic login wall. Every locked route preserved its intended post-login destination.

## Screenshot Hashes

| File | SHA-256 |
| --- | --- |
| `web_signed_out_narrow_home.png` | `120b32aa69aa8a6d0ad6d4c152e3c33171bc638c694787158f9d6b171f3a68da` |
| `web_signed_out_narrow_card.png` | `c4525a305ca127784d74b05545f94be2493e490ebdb5e57a28634cef7b8ba259` |
| `web_signed_out_narrow_scan.png` | `dcdb2cdae0cf3dbfa84f2520bc32fa2322e7b5e8054d288cf63c097bbc674df2` |
| `web_signed_out_narrow_wall.png` | `aa6662341ebd72d2ab75377aa4e750e6f7868f714b8b5e153dc286b631d98062` |
| `web_signed_out_narrow_vault.png` | `0e9d1b87d487e14916a0919f681ffcd70c406090c95f3890d4eea6a432783c89` |
| `web_signed_out_narrow_network.png` | `52e34a34a0fd102169cf5aa97bc7f46f2b279463c12e41c3e0505b51fd9177bc` |
| `web_signed_out_narrow_binders.png` | `c12fc885db0987c2b258889d3676a30b28eedd5252abf5dfd30e53977ddecf38` |
| `web_signed_out_desktop_home.png` | `1f6a27131450299daa7bf4b730fe5221ff905d5f2a610fd83a89721dcb9607ef` |
| `web_signed_out_desktop_card.png` | `84ddf8f42011c8a7730ffae1c0f34e2aed4f089ff91c7bc60466f485f1832357` |
| `web_signed_out_desktop_scan.png` | `0e4a3e755b5206381b2d4e508189188476f6aa17f239b7cba6333f5eed8c5ca1` |
| `web_signed_out_desktop_wall.png` | `d65f8413bdce8766437083932429dd44b0aa2bfaf2f3f73cef2a7630d15bbca2` |
| `web_signed_out_desktop_vault.png` | `8afb8f0f42400a8a7a3eb6bb8a12ac594586604b9d0147017397d2acf1f4ee2d` |
| `web_signed_out_desktop_network.png` | `fa10b7c1b82ba518da2f230184dece05ddefdb5033941bbe2269d02e2632a2ed` |
| `web_signed_out_desktop_binders.png` | `f3bcaea95f9499daf70749c211188d43039e3c1eaf5867b2c90afa4f6d2cf9ca` |

## Completion Boundary

This proves the current production signed-out behavior for Journeys A and F. It must be repeated against the immutable final candidate before the final 72-hour soak can close.
