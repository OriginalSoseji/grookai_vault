# POST-REC-VAR-01-XYP-HOLO-PROMO-OVERFINISH-CLEANUP Guarded Dry Run V1

Generated: 2026-06-17T02:35:06.784Z

## Safety

- db_writes_committed: false
- migrations_created: false
- dry_run_rolled_back: true

## Scope

| metric |value |
| --- |--- |
| child_delete_targets |118 |
| parent_rows_affected_by_child_delete |59 |
| set_code |xyp |
| target_finishes |{"normal":59,"reverse":59} |
| supported_finish_required |holo |

## Dry-Run Proof

- before: `1f0688e6186042a06d54eaef52e362d828469cfe1bd38e2acefc4a2f85b5cea8`
- after rollback: `1f0688e6186042a06d54eaef52e362d828469cfe1bd38e2acefc4a2f85b5cea8`
- proof matches: true
- rows deleted inside rollback transaction: 118

## Target Sample

| set |number |name |finish |supported |child_id |
| --- |--- |--- |--- |--- |--- |
| xyp |XY07 |Xerneas-EX |normal |holo |d6651340-e31c-4433-937e-df6095189e03 |
| xyp |XY07 |Xerneas-EX |reverse |holo |0e38daa0-dde2-4db8-87fd-de1aa61a87a6 |
| xyp |XY08 |Yveltal-EX |normal |holo |591a6bb7-7367-4130-85db-48c9a38c84b1 |
| xyp |XY08 |Yveltal-EX |reverse |holo |3a858b04-e83d-4af8-b06c-38dd2d750e80 |
| xyp |XY09 |Garchomp-EX |normal |holo |bb4dd854-51e1-4222-bd16-8f0ba0ecc22d |
| xyp |XY09 |Garchomp-EX |reverse |holo |15360b46-820a-4d3c-bf01-c2404ea2bc07 |
| xyp |XY17 |Charizard-EX |normal |holo |733a2950-e179-4669-9d10-b0a2ee103d67 |
| xyp |XY17 |Charizard-EX |reverse |holo |d56a64f3-0394-4c49-87c8-50617dda5151 |
| xyp |XY18 |Chesnaught-EX |normal |holo |bf11d847-d2a7-4da0-b768-0f369252620d |
| xyp |XY18 |Chesnaught-EX |reverse |holo |20302f28-3b02-4917-9e4d-a183156284ee |
| xyp |XY19 |Delphox-EX |normal |holo |b04ce601-565a-48f5-9d2b-6d7bc9add537 |
| xyp |XY19 |Delphox-EX |reverse |holo |87302dc5-a2f1-4b05-bda3-e9ded5ee9c4b |
| xyp |XY20 |Greninja-EX |normal |holo |8175b32d-dfff-4248-b25c-cdaf1b111a8c |
| xyp |XY20 |Greninja-EX |reverse |holo |2a7b5d7f-bfd4-427b-bd3f-7f728bfa5861 |
| xyp |XY25 |Krookodile-EX |normal |holo |6611b0e6-0593-4eaf-92ad-8f40f64610be |
| xyp |XY25 |Krookodile-EX |reverse |holo |bdec45f5-5535-4a12-b4b2-0e9a8ede522d |
| xyp |XY28 |Venusaur-EX |normal |holo |0859aa81-865d-460b-b62f-55225bb6deca |
| xyp |XY28 |Venusaur-EX |reverse |holo |f5834356-c287-493b-aee1-1430efdc438d |
| xyp |XY29 |Charizard-EX |normal |holo |e7fef47e-ea3b-4ec9-b599-d2151b8272fc |
| xyp |XY29 |Charizard-EX |reverse |holo |f3fc4aa3-7929-449e-abb4-de0105886d0a |
| xyp |XY30 |Blastoise-EX |normal |holo |9cb45c01-1bc0-414c-939c-2a625158485b |
| xyp |XY30 |Blastoise-EX |reverse |holo |53bf279c-1a21-4383-a37f-c3236ac48381 |
| xyp |XY34 |Metagross-EX |normal |holo |e7d19a33-8829-43bf-99d6-77032fbbe171 |
| xyp |XY34 |Metagross-EX |reverse |holo |4f892da2-6ecc-4418-937c-048187ba7287 |
| xyp |XY35 |M Metagross-EX |normal |holo |55229f23-bc10-49d6-9472-fab2a54e1d55 |
| xyp |XY35 |M Metagross-EX |reverse |holo |f35a0719-702e-4f5e-91be-8c2a130e650d |
| xyp |XY41 |Kyogre-EX |normal |holo |6ec0232b-fdf4-40c0-a325-fcd115eddd7b |
| xyp |XY41 |Kyogre-EX |reverse |holo |b9cca97d-272e-4493-a70b-8eb1e34ff941 |
| xyp |XY42 |Groudon-EX |normal |holo |ade6656e-0ef8-4538-80dd-3f1cc22a0917 |
| xyp |XY42 |Groudon-EX |reverse |holo |9047d6ab-4684-4797-886e-34ef06579352 |
| xyp |XY43 |Diancie-EX |normal |holo |510e23fe-6b4c-4753-8cd3-2aa0a66c2349 |
| xyp |XY43 |Diancie-EX |reverse |holo |368cdf0f-c89d-49a3-9bd3-cac873464c9c |
| xyp |XY44 |M Diancie-EX |normal |holo |9cf81c89-1de6-4cc2-9fa1-46eae234815e |
| xyp |XY44 |M Diancie-EX |reverse |holo |35c0b223-3354-4afa-afa0-9dbb5d318e79 |
| xyp |XY45 |Gallade-EX |normal |holo |ada927f4-ec5d-478a-b5e2-9861a91a225d |
| xyp |XY45 |Gallade-EX |reverse |holo |a78d3c34-4262-4886-b351-7453c00d7b4c |
| xyp |XY53 |Sceptile-EX |normal |holo |5bd06aae-2008-4455-b378-3076e61bec6d |
| xyp |XY53 |Sceptile-EX |reverse |holo |9a01ab37-b52a-41e2-8aeb-2878b856e08e |
| xyp |XY54 |Blaziken-EX |normal |holo |bb45458c-9423-4808-9060-63ecad81b1f0 |
| xyp |XY54 |Blaziken-EX |reverse |holo |b7b47740-8dec-4aaa-a088-c2299055bfdb |
| xyp |XY55 |Swampert-EX |normal |holo |3eda6fd7-757b-4076-8964-21979172e52e |
| xyp |XY55 |Swampert-EX |reverse |holo |0d6d438f-04fb-418b-9ac7-0315862b6040 |
| xyp |XY61 |Flygon-EX |normal |holo |8cf689f9-f060-4000-94ee-c6ffeb4b3cd3 |
| xyp |XY61 |Flygon-EX |reverse |holo |527815b0-7aee-46aa-9354-604007365d32 |
| xyp |XY62 |Absol-EX |normal |holo |4aa0d8ca-590a-4c5f-89ec-6d9872f2fcd9 |
| xyp |XY62 |Absol-EX |reverse |holo |3559b6a0-bf64-405f-a83d-d6ee3c543cdf |
| xyp |XY63 |M Absol-EX |normal |holo |b083f8ef-ab7a-47d8-a4e3-e9d64cc533d1 |
| xyp |XY63 |M Absol-EX |reverse |holo |1b266b4a-d827-4724-8a68-0a87f1e1c74c |
| xyp |XY66 |Rayquaza-EX |normal |holo |fa3a2728-6283-45db-8873-ad37f25f07e4 |
| xyp |XY66 |Rayquaza-EX |reverse |holo |a92c621c-1ce1-4f94-aded-21e0c0d29f4e |
| xyp |XY69 |Rayquaza-EX |normal |holo |e895f334-762d-46b8-8a57-ab8e06b69b1f |
| xyp |XY69 |Rayquaza-EX |reverse |holo |dbe8e851-775c-4728-8b23-963b96d2b8bb |
| xyp |XY70 |Tyrantrum-EX |normal |holo |e984d990-d533-4595-a172-09643dc5224b |
| xyp |XY70 |Tyrantrum-EX |reverse |holo |fe8995f2-a772-4a25-bd13-f8ba0e850df2 |
| xyp |XY71 |Hoopa-EX |normal |holo |f409c902-0136-4b36-a8d4-63c550e64e05 |
| xyp |XY71 |Hoopa-EX |reverse |holo |c3f07d1d-3a09-417c-9c65-f87231302d8b |
| xyp |XY72 |Latios-EX |normal |holo |50fd9aa5-0dfc-4fcd-9860-cf8866e31689 |
| xyp |XY72 |Latios-EX |reverse |holo |f23ede26-187e-4721-96b5-ab02db0cedde |
| xyp |XY73 |Rayquaza-EX |normal |holo |d6ee477f-cd09-4e6a-a4e8-5332e1281d5c |
| xyp |XY73 |Rayquaza-EX |reverse |holo |445bf084-aede-437c-85da-acc267337915 |

## Approval Text

```text
Approve real POST-REC-VAR-01-XYP-HOLO-PROMO-OVERFINISH-CLEANUP apply only. Fingerprint: add9ab7fc95bc808f0edca0a3d6b2920f3fc68bd93bd756f103f1be2cf0e164e. Scope: 118 unsupported XYP holo-promo overfinish child deletes; finishes normal=59, reverse=59; all targets support only holo in the Master Index and have zero external mapping, vault, or warehouse refs. Dry-run proof: 1f0688e6186042a06d54eaef52e362d828469cfe1bd38e2acefc4a2f85b5cea8 == 1f0688e6186042a06d54eaef52e362d828469cfe1bd38e2acefc4a2f85b5cea8. No parent writes. No migrations. No merges. No quarantine. Holo rows preserved.
```
