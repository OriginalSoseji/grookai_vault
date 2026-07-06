# Japanese Pikachu Promo First Batch Dry Run v1

Generated: 2026-07-03T21:55:46.211Z

## Scope

- Read-only dry run. No DB writes, no image writes, no public visibility writes.
- Includes only modern numbered promo suffix lanes with existing set containers: `SV-P`, `S-P`, `SM-P`, `XY-P`, `BW-P`, `DP-P`, `DPt-P`.
- Excludes `ADV-P`, `PCG-P`, `MP No.`, `No.`, `/P`, and other legacy lanes until their set/identity containers are modeled separately.
- Existing non-Pikachu rows with reused promo numbers are preserved; proposed Pikachu rows receive explicit `printed_identity_modifier` values.

## Counts

- Proposed parent card_print rows: 134
- Proposed card_print_identity rows: 134
- Proposed source evidence rows: 268
- Proposed family review rows: 134
- Reused-number inserts: 103
- Missing-number inserts: 31
- Payload fingerprint: `b2e7b43973ef1f868aff84fc12b6eb49449dfafef2f8359ec348bf93be5b8c0e`
- Preflight status: `pass`
- GV ID collisions: 0
- Identity hash collisions: 0
- Missing set containers: 0

## By Set

| Set | Total | Reused-number | Missing-number |
|---|---:|---:|---:|
| jpn-bwp | 4 | 4 | 0 |
| jpn-dpp | 10 | 10 | 0 |
| jpn-dptp | 1 | 1 | 0 |
| jpn-smp | 58 | 32 | 26 |
| jpn-sp | 18 | 17 | 1 |
| jpn-svp | 11 | 8 | 3 |
| jpn-xyp | 32 | 31 | 1 |

## Targets

| GV ID | Name | Number | Set | Action |
|---|---|---|---|---|
| GV-PK-JPN-BWP-108-PIKACHU | Pikachu | 108/BW-P | jpn-bwp | insert_reused_promo_number_parent |
| GV-PK-JPN-BWP-120-PIKACHU | Pikachu | 120/BW-P | jpn-bwp | insert_reused_promo_number_parent |
| GV-PK-JPN-BWP-151-PIKACHU | Pikachu | 151/BW-P | jpn-bwp | insert_reused_promo_number_parent |
| GV-PK-JPN-BWP-163-PIKACHU | Pikachu | 163/BW-P | jpn-bwp | insert_reused_promo_number_parent |
| GV-PK-JPN-DPP-025-PIKACHU | Pikachu | 025/DP-P | jpn-dpp | insert_reused_promo_number_parent |
| GV-PK-JPN-DPP-048-PIKACHU | Pikachu | 048/DP-P | jpn-dpp | insert_reused_promo_number_parent |
| GV-PK-JPN-DPP-057-PIKACHU | Pikachu | 057/DP-P | jpn-dpp | insert_reused_promo_number_parent |
| GV-PK-JPN-DPP-095-PIKACHU | Pikachu | 095/DP-P | jpn-dpp | insert_reused_promo_number_parent |
| GV-PK-JPN-DPP-098-PIKACHU | Pikachu | 098/DP-P | jpn-dpp | insert_reused_promo_number_parent |
| GV-PK-JPN-DPP-099-PIKACHU | Pikachu | 099/DP-P | jpn-dpp | insert_reused_promo_number_parent |
| GV-PK-JPN-DPP-100-PIKACHU | Pikachu | 100/DP-P | jpn-dpp | insert_reused_promo_number_parent |
| GV-PK-JPN-DPP-101-PIKACHU | Pikachu | 101/DP-P | jpn-dpp | insert_reused_promo_number_parent |
| GV-PK-JPN-DPP-102-PIKACHU | Pikachu | 102/DP-P | jpn-dpp | insert_reused_promo_number_parent |
| GV-PK-JPN-DPP-113-PIKACHU | Pikachu | 113/DP-P | jpn-dpp | insert_reused_promo_number_parent |
| GV-PK-JPN-DPTP-043-PIKACHU-LV-X | Pikachu LV.X | 043/DPT-P | jpn-dptp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-005-SAPPOROS-PIKACHU | Sapporo's Pikachu | 005/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-013-PRETEND-TEAM-SKULL-PIKACHU | Pretend Team Skull Pikachu | 013/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-014-PRETEND-GRUNT-PIKACHU | Pretend Grunt Pikachu | 014/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-037-PONCHO-WEARING-PIKACHU | Poncho Wearing Pikachu | 037/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-038-PONCHO-WEARING-PIKACHU | Poncho Wearing Pikachu | 038/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-044-PIKACHU | Pikachu | 044/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-055-EASTERS-PIKACHU | Easters Pikachu | 055/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-061-PIKACHU | Pikachu | 061/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-068-PIKACHU | Pikachu | 068/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-071-ASHS-PIKACHU | Ash's Pikachu | 071/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-072-ASHS-PIKACHU | Ash's Pikachu | 072/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-073-ASHS-PIKACHU | Ash's Pikachu | 073/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-074-ASHS-PIKACHU | Ash's Pikachu | 074/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-075-ASHS-PIKACHU | Ash's Pikachu | 075/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-076-ASHS-PIKACHU | Ash's Pikachu | 076/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-086-ASHS-PIKACHU | Ash's Pikachu | 086/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-088-TOHOKUS-PIKACHU | Tohokus Pikachu | 088/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-114-PIKACHU | Pikachu | 114/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-168-PIKACHU | Pikachu | 168/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-179-PIKACHU | Pikachu | 179/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-191-PRETEND-BOSS-PIKACHU-TEAM-ROCKET | Pretend Boss Pikachu Team Rocket | 191/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-192-PRETEND-BOSS-PIKACHU-TEAM-AQUA | Pretend Boss Pikachu Team Aqua | 192/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-193-PRETEND-BOSS-PIKACHU-TEAM-MAGMA | Pretend Boss Pikachu Team Magma | 193/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-194-PRETEND-BOSS-PIKACHU-TEAM-GALACTIC | Pretend Boss Pikachu Team Galactic | 194/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-195-PRETEND-BOSS-PIKACHU-TEAM-PLASMA | Pretend Boss Pikachu Team Plasma | 195/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-196-PRETEND-BOSS-PIKACHU-TEAM-FLARE | Pretend Boss Pikachu Team Flare | 196/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-197-PRETEND-BOSS-PIKACHU-TEAM-SKULL | Pretend Boss Pikachu Team Skull | 197/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-199-PIKACHU | Pikachu | 199/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-200-PIKACHU | Pikachu | 200/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-207-PIKACHU | Pikachu | 207/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-208-HAKAMA-PIKACHU | Hakama Pikachu | 208/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-209-FIREFIGHTER-PIKACHU | Firefighter Pikachu | 209/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-210-GENTLEMANLY-PIKACHU | Gentlemanly Pikachu | 210/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-211-CHERRY-BLOSSOM-AFRO-PIKACHU | Cherry Blossom Afro Pikachu | 211/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-214-PIKACHU | Pikachu | 214/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-242-PIKACHU | Pikachu | 242/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-249-PIKACHU | Pikachu | 249/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-262-PIKACHU | Pikachu | 262/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-270-REDS-PIKACHU | Reds Pikachu | 270/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-276-PIKACHU | Pikachu | 276/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-280-YOKOHAMAS-PIKACHU | Yokohamas Pikachu | 280/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-281-YOKOHAMAS-PIKACHU | Yokohamas Pikachu | 281/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-282-YOKOHAMAS-PIKACHU | Yokohamas Pikachu | 282/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-283-YOKOHAMAS-PIKACHU | Yokohamas Pikachu | 283/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-288-PIKACHU | Pikachu | 288/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-291-PIKACHU | Pikachu | 291/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-307-PIKACHU | Pikachu | 307/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-325-PRETEND-TEA-CEREMONY-PIKACHU | Pretend Tea Ceremony Pikachu | 325/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-337-DETECTIVE-PIKACHU | Detective Pikachu | 337/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-338-DETECTIVE-PIKACHU | Detective Pikachu | 338/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-339-DETECTIVE-PIKACHU | Detective Pikachu | 339/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-367-PIKACHU | Pikachu | 367/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-369-PIKACHU | Pikachu | 369/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-376-PIKACHU | Pikachu | 376/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-377-PIKACHU | Pikachu | 377/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-392-PLAYING-IN-THE-SEA-PIKACHU | Playing In The Sea Pikachu | 392/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SMP-393-PIKACHU-GX | Pikachu GX | 393/SM-P | jpn-smp | insert_reused_promo_number_parent |
| GV-PK-JPN-SMP-407-PRETEND-COMEDIAN-PIKACHU | Pretend Comedian Pikachu | 407/SM-P | jpn-smp | insert_missing_promo_parent |
| GV-PK-JPN-SP-002-SHIBUYAS-PIKACHU | Shibuyas Pikachu | 002/S-P | jpn-sp | insert_missing_promo_parent |
| GV-PK-JPN-SP-024-PIKACHU | Pikachu | 024/S-P | jpn-sp | insert_reused_promo_number_parent |
| GV-PK-JPN-SP-036-RESCUE-TEAM-DXS-PIKACHU | Rescue Team DX Pikachu | 036/S-P | jpn-sp | insert_reused_promo_number_parent |
| GV-PK-JPN-SP-099-DETECTIVE-PIKACHU | Detective Pikachu | 099/S-P | jpn-sp | insert_reused_promo_number_parent |
| GV-PK-JPN-SP-105-SWALLOWED-UP-PIKACHU | Swallowed Up Pikachu | 105/S-P | jpn-sp | insert_reused_promo_number_parent |
| GV-PK-JPN-SP-121-PIKACHU-V | Pikachu V | 121/S-P | jpn-sp | insert_reused_promo_number_parent |
| GV-PK-JPN-SP-122-PIKACHU-V | Pikachu V | 122/S-P | jpn-sp | insert_reused_promo_number_parent |
| GV-PK-JPN-SP-123-PIKACHU-VMAX | Pikachu VMAX | 123/S-P | jpn-sp | insert_reused_promo_number_parent |
| GV-PK-JPN-SP-124-PIKACHU | Pikachu | 124/S-P | jpn-sp | insert_reused_promo_number_parent |
| GV-PK-JPN-SP-125-PIKACHU | Pikachu | 125/S-P | jpn-sp | insert_reused_promo_number_parent |
| GV-PK-JPN-SP-126-PIKACHU | Pikachu | 126/S-P | jpn-sp | insert_reused_promo_number_parent |
| GV-PK-JPN-SP-132-PIKACHU | Pikachu | 132/S-P | jpn-sp | insert_reused_promo_number_parent |
| GV-PK-JPN-SP-147-KANAZAWAS-PIKACHU | Kanazawas Pikachu | 147/S-P | jpn-sp | insert_reused_promo_number_parent |
| GV-PK-JPN-SP-208-PIKACHU | Pikachu | 208/S-P | jpn-sp | insert_reused_promo_number_parent |
| GV-PK-JPN-SP-227-PIKACHU | Pikachu | 227/S-P | jpn-sp | insert_reused_promo_number_parent |
| GV-PK-JPN-SP-265-PIKACHU-VMAX | Pikachu VMAX | 265/S-P | jpn-sp | insert_reused_promo_number_parent |
| GV-PK-JPN-SP-272-PIKACHU | Pikachu | 272/S-P | jpn-sp | insert_reused_promo_number_parent |
| GV-PK-JPN-SP-323-PIKACHU | Pikachu | 323/S-P | jpn-sp | insert_reused_promo_number_parent |
| GV-PK-JPN-SVP-074-PIKACHU | Pikachu | 074/SV-P | jpn-svp | insert_reused_promo_number_parent |
| GV-PK-JPN-SVP-098-DETECTIVE-PIKACHU | Detective Pikachu | 098/SV-P | jpn-svp | insert_reused_promo_number_parent |
| GV-PK-JPN-SVP-120-PIKACHU | Pikachu | 120/SV-P | jpn-svp | insert_reused_promo_number_parent |
| GV-PK-JPN-SVP-197-PIKACHU | Pikachu | 197/SV-P | jpn-svp | insert_reused_promo_number_parent |
| GV-PK-JPN-SVP-216-PIKACHU | Pikachu | 216/SV-P | jpn-svp | insert_reused_promo_number_parent |
| GV-PK-JPN-SVP-218-PIKACHU | Pikachu | 218/SV-P | jpn-svp | insert_reused_promo_number_parent |
| GV-PK-JPN-SVP-242-PIKACHU | Pikachu | 242/SV-P | jpn-svp | insert_reused_promo_number_parent |
| GV-PK-JPN-SVP-260-TOHOKUS-PIKACHU | Tohokus Pikachu | 260/SV-P | jpn-svp | insert_missing_promo_parent |
| GV-PK-JPN-SVP-261-HIROSHIMAS-PIKACHU | Hiroshimas Pikachu | 261/SV-P | jpn-svp | insert_missing_promo_parent |
| GV-PK-JPN-SVP-289-FUKUOKAS-PIKACHU | Fukuokas Pikachu | 289/SV-P | jpn-svp | insert_missing_promo_parent |
| GV-PK-JPN-SVP-291-PIKACHU | Pikachu | 291/SV-P | jpn-svp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-001-PIKACHU | Pikachu | 001/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-050-TEAM-JAPANS-PIKACHU | Team Japans Pikachu | 050/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-056-POKETVS-AD-PIKACHU | Poketvs Ad Pikachu | 056/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-064-PIKACHU | Pikachu | 064/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-068-PIKACHU | Pikachu | 068/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-069-PIKACHU | Pikachu | 069/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-070-PIKACHU | Pikachu | 070/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-094-WARM-PIKACHU | Warm Pikachu | 094/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-096-WARM-PIKACHU | Warm Pikachu | 096/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-097-WARM-PIKACHU | Warm Pikachu | 097/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-098-MEGA-TOKYOS-PIKACHU | Mega Tokyos Pikachu | 098/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-150-PRETEND-MAGIKARP-PIKACHU | Pretend Magikarp Pikachu | 150/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-151-PRETEND-GYARADOS-PIKACHU | Pretend Gyarados Pikachu | 151/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-154-PIKACHU | Pikachu | 154/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-156-PIKACHU | Pikachu | 156/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-175-PIKACHU | Pikachu | 175/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-203-PONCHO-WEARING-PIKACHU | Poncho Wearing Pikachu | 203/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-204-MEGA-TOKYOS-PIKACHU | Mega Tokyos Pikachu | 204/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-206-PIKACHU | Pikachu | 206/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-207-PONCHO-WEARING-PIKACHU | Poncho Wearing Pikachu | 207/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-208-PONCHO-WEARING-PIKACHU | Poncho Wearing Pikachu | 208/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-221-OKUGE-SAMA-AND-MAIKO-HAN-PIKACHU | Okuge Sama And Maiko Han Pikachu | 221/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-230-PONCHO-WEARING-PIKACHU | Poncho Wearing Pikachu | 230/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-247-PIKACHU-LIBRE | Pikachu Libre | 247/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-259-PIKACHU | Pikachu | 259/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-264-SURFING-PIKACHU | Surfing Pikachu | 264/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-274-PONCHO-WEARING-PIKACHU | Poncho Wearing Pikachu | 274/XY-P | jpn-xyp | insert_missing_promo_parent |
| GV-PK-JPN-XYP-275-PONCHO-WEARING-PIKACHU | Poncho Wearing Pikachu | 275/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-279-PIKACHU | Pikachu | 279/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-281-PIKACHU | Pikachu | 281/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-292-FLYING-PIKACHU | Flying Pikachu | 292/XY-P | jpn-xyp | insert_reused_promo_number_parent |
| GV-PK-JPN-XYP-293-MARIO-PIKACHU | Mario Pikachu | 293/XY-P | jpn-xyp | insert_reused_promo_number_parent |

