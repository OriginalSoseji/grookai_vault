# ENRICH-32A LV.X / Name-Suffix Duplicate Cleanup Guarded Dry-Run V1

Package: `ENRICH-32A-LVX-NAME-SUFFIX-DUPLICATE-CLEANUP`

## Safety

- Real DB writes performed: false
- Transaction rolled back: true
- Migrations created: false
- Image writes performed: false

## Scope

| set | number | duplicate target | canonical owner | owner gv_id |
| --- | --- | --- | --- | --- |
| dp7 | 100 | Regigigas | Regigigas LV.X | GV-PK-SF-100 |
| dp7 | 96 | Dusknoir | Dusknoir LV.X | GV-PK-SF-96 |
| dp7 | 97 | Heatran | Heatran LV.X | GV-PK-SF-97 |
| dp7 | 98 | Machamp | Machamp LV.X | GV-PK-SF-98 |
| dp7 | 99 | Raichu | Raichu LV.X | GV-PK-SF-99 |
| pl1 | 122 | Dialga G | Dialga G LV.X | GV-PK-PL-122 |
| pl1 | 123 | Drapion | Drapion LV.X | GV-PK-PL-123 |
| pl1 | 124 | Giratina | Giratina LV.X | GV-PK-PL-124 |
| pl1 | 125 | Palkia G | Palkia G LV.X | GV-PK-PL-125 |
| pl1 | 126 | Shaymin | Shaymin LV.X | GV-PK-PL-126 |
| pl1 | 127 | Shaymin | Shaymin LV.X | GV-PK-PL-127 |
| pl2 | 103 | Alakazam 4 | Alakazam E4 LV.X | GV-PK-RR-103 |
| pl2 | 104 | Floatzel GL | Floatzel GL LV.X | GV-PK-RR-104 |
| pl2 | 105 | Flygon | Flygon LV.X | GV-PK-RR-105 |
| pl2 | 106 | Gallade 4 | Gallade E4 LV.X | GV-PK-RR-106 |
| pl2 | 107 | Hippowdon | Hippowdon LV.X | GV-PK-RR-107 |
| pl2 | 108 | Infernape 4 | Infernape E4 LV.X | GV-PK-RR-108 |
| pl2 | 110 | Mismagius GL | Mismagius GL LV.X | GV-PK-RR-110 |
| pl2 | 111 | Snorlax | Snorlax LV.X | GV-PK-RR-111 |
| pl2 | 95 | Team Galactic's Invention G-107 Technical Machine | Team Galactic's Invention G-107 Technical Machine G | GV-PK-RR-95 |
| pl3 | 141 | Absol G | Absol G LV.X | GV-PK-SV-141 |
| pl3 | 142 | Blaziken FB | Blaziken FB LV.X | GV-PK-SV-142 |
| pl3 | 143 | Charizard G | Charizard G LV.X | GV-PK-SV-143 |
| pl3 | 144 | Electivire FB | Electivire FB LV.X | GV-PK-SV-144 |
| pl3 | 145 | Garchomp C | Garchomp C LV.X | GV-PK-SV-145 |
| pl3 | 146 | Rayquaza C | Rayquaza C LV.X | GV-PK-SV-146 |
| pl3 | 147 | Staraptor FB | Staraptor FB LV.X | GV-PK-SV-147 |

## Proof

- Pass: true
- Mapping transfers: 27
- Identity deletes: 27
- Trait deletes: 27
- Species deletes: 26
- Child deletes: 28
- Parent deletes: 27
- Before snapshot hash: `8087409fa5f8ba5839c37619e9f31336a190a09ee35afc50e21a4d4e8fe49c50`
- After rollback snapshot hash: `8087409fa5f8ba5839c37619e9f31336a190a09ee35afc50e21a4d4e8fe49c50`

## Real Apply Approval Text

Approve real ENRICH-32A-LVX-NAME-SUFFIX-DUPLICATE-CLEANUP apply only. Fingerprint: 75c4be3cbc6677f68a71bcd210a5d339b89fec5c0cdf5fefbd6d34c56defd724. Scope: 27 LV.X/name-suffix duplicate parent cleanups, 27 TCGdex mapping transfers, 28 duplicate child deletes, 27 duplicate parent deletes. Dry-run proof: 8087409fa5f8ba5839c37619e9f31336a190a09ee35afc50e21a4d4e8fe49c50 == 8087409fa5f8ba5839c37619e9f31336a190a09ee35afc50e21a4d4e8fe49c50. No global apply. No migrations. No image writes.

Fingerprint: `75c4be3cbc6677f68a71bcd210a5d339b89fec5c0cdf5fefbd6d34c56defd724`
