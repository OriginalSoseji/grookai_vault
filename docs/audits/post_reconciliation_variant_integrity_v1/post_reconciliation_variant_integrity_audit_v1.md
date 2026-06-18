# Post-Reconciliation Variant Integrity Audit V1

Generated: 2026-06-17T02:37:27.672Z

This is a read-only audit. It compares live English physical child printings against the current master-verified English Master Index printings.

## Safety

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

| metric |value |
| --- |--- |
| live_child_printings_checked |37533 |
| verified_by_master_index |32717 |
| unsupported_total |4816 |
| guarded_delete_candidates_no_dependencies |444 |
| unsupported_with_dependencies |3 |
| unsupported_modifier_parent_finish |61 |
| card_identity_missing_from_master_index |4308 |
| conflicts_detected |0 |
| candidate_unconfirmed_created |0 |

## XY124 Seed Case

| status |set |number |name |finish |printing_gv_id |supported_finishes |action |
| --- |--- |--- |--- |--- |--- |--- |--- |
| verified_by_master_index |xyp |XY124 |Pikachu-EX |holo |GV-PK-PR-XY-XY124-HOLO |holo |no_action |

## Unsupported By Set

| set_code |rows |
| --- |--- |
| me02.5 |620 |
| sv08.5 |333 |
| sv4pt5 |326 |
| svp |253 |
| base6 |223 |
| me01 |201 |
| sv03 |200 |
| sv03.5 |200 |
| sv05 |195 |
| sv01 |191 |
| sv8pt5 |190 |
| swsh11 |190 |
| me02 |185 |
| sv10.5w |181 |
| swsh12.5 |181 |
| sv04.5 |180 |
| sv10.5b |178 |
| sv06.5 |155 |
| swsh10.5 |146 |
| me04 |111 |
| bw11 |40 |
| swsh12 |26 |
| mcd21 |25 |
| xy4 |25 |
| sve |23 |
| swsh9 |19 |
| mcd22 |15 |
| sm3 |13 |
| mcd11 |12 |
| mcd12 |12 |

## Unsupported By Finish

| finish_key |rows |
| --- |--- |
| reverse |1826 |
| normal |1517 |
| holo |1109 |
| pokeball |230 |
| masterball |67 |
| cosmos |56 |
| rocket_reverse |10 |
| cracked_ice |1 |

## Guarded Delete Candidates Without Dependencies

These are not deleted by this audit. They are candidates for a later guarded dry-run package only.

| set |number |name |finish |supported |child_id |
| --- |--- |--- |--- |--- |--- |
| bw9 |40 |Nidoran ♀ |holo |normal, reverse |c8b2f5f1-dc12-4fe1-9d1f-5bfd7e764960 |
| bw9 |43 |Nidoran ♂ |holo |normal, reverse |533e34cf-5ddb-4e49-9118-6bd2c099bc50 |
| col1 |1 |Clefable |normal |holo, reverse |e9a968f8-ca23-4ec5-b20f-843cce666ad8 |
| col1 |10 |Houndoom |normal |holo, reverse |76bdceac-c5a0-448e-8af0-d1098868385c |
| col1 |5 |Forretress |normal |holo, reverse |6522b25f-69fc-4676-a8ae-e8aa407e85d1 |
| me01 |010 |Meganium |holo |normal |22b52695-75e7-45f9-9076-291b9535f737 |
| me01 |010 |Meganium |reverse |normal |67b9ec75-9018-4f1e-be47-9b97aaee7c33 |
| me01 |064 |Xerneas |holo |normal |5e163e0e-7e59-4a91-93e4-878c728425d3 |
| me01 |064 |Xerneas |reverse |normal |786acdb1-56e1-42de-86fd-ac9c7a0bafa1 |
| me01 |073 |Hariyama |holo |normal |33613b0e-9cbd-4101-9675-21404c9fc678 |
| me01 |073 |Hariyama |reverse |normal |b992e6f5-4918-43b7-8da6-2e583de4cbc0 |
| me01 |074 |Lunatone |holo |normal |06029244-f19b-4bdb-aa03-ed999102079b |
| me01 |074 |Lunatone |reverse |normal |249ff449-53b3-4e7a-b98e-b186cff2e4d4 |
| me02 |014 |Moltres |holo |normal |651e7b42-b4ef-4001-9585-b2e6adbc840d |
| me02 |014 |Moltres |reverse |normal |975451f6-616d-4ab7-bbeb-f8e10798e427 |
| me02 |045 |Zacian |holo |normal |3a6c9690-1895-472d-922c-e45974ffb0de |
| me02 |045 |Zacian |reverse |normal |439de080-5657-498a-b2f1-d7e67ac367bd |
| me02 |053 |Flygon |holo |normal |6a5caad3-4ec5-45d8-b47f-37f32e5bbd45 |
| me02 |053 |Flygon |reverse |normal |2f3092aa-6c57-4795-a62d-9e3c7696e0fe |
| me02 |068 |Toxtricity |holo |normal |f14d4de9-6024-4999-a518-41e6bb88873f |
| me02 |068 |Toxtricity |reverse |normal |d84b8b31-c35f-40e0-baf8-68f73830700d |
| me04 |001 |Weedle |reverse |normal |f239d42b-51b1-44eb-863f-565e79024eff |
| me04 |002 |Kakuna |reverse |normal |8a73a6e1-e5bb-4445-9ffa-1d36fa560356 |
| me04 |003 |Beedrill ex |holo |normal |932c0b8a-b84d-4ab1-905b-02170d5fef95 |
| me04 |004 |Carnivine |reverse |normal |f1eda12a-63cc-4959-a2c4-463b4306d9b2 |
| me04 |005 |Chespin |reverse |normal |4c1f4a91-f499-4845-8bd5-223fa9f57d4c |
| me04 |006 |Quilladin |reverse |normal |ea62c12f-8727-4961-84c9-e4aeada300e2 |
| me04 |008 |Vulpix |reverse |normal |36c7fcdb-0dd1-4dbe-8ead-30196354c0c7 |
| me04 |009 |Ninetales |reverse |normal |6ec4a0cf-63d4-4026-ab1e-5dc61cc714f0 |
| me04 |011 |Fennekin |reverse |normal |6caba719-84aa-4210-b388-04f98a1234f1 |
| me04 |012 |Braixen |reverse |normal |3ccca53d-0876-48a4-a77e-344e4a31a522 |
| me04 |013 |Delphox |holo |normal |6646844d-5efd-4ad1-b9a3-ea691bed5b0a |
| me04 |013 |Delphox |reverse |normal |f32de015-1cbd-44de-9613-1bb42be55c4f |
| me04 |014 |Litleo |reverse |normal |ab88083e-0875-46e2-bd4b-3f886d2da78f |
| me04 |015 |Mega Pyroar ex |holo |normal |9b9a747f-16f5-4ce5-a86c-f0985b3d2741 |
| me04 |016 |Remoraid |reverse |normal |e0808b12-6364-4bca-a211-b47623a6ba7a |
| me04 |017 |Octillery |reverse |normal |e79c8d00-831d-4211-8a54-c018ea1c6a32 |
| me04 |018 |Delibird |reverse |normal |db3a26fc-2a83-44b9-b574-169daa91985c |
| me04 |020 |Froakie |reverse |normal |406a1113-fd94-4af6-9d7d-1d9d6ae21977 |
| me04 |021 |Frogadier |reverse |normal |1a0f8607-c796-4342-a57b-f8f497cea881 |

## Unsupported With Dependencies

| set |number |name |finish |external_refs |vault_refs |warehouse_refs |
| --- |--- |--- |--- |--- |--- |--- |
| xy10 |111a |Shauna |reverse |1 |0 |0 |
| xy2 |88a |Blacksmith |reverse |1 |0 |0 |
| xy8 |146a |Professor's Letter |reverse |1 |0 |0 |

## Modifier Parent Manual Review

| set |number |name |finish |variant |modifier |
| --- |--- |--- |--- |--- |--- |
| bw11 |RC1 |Snivy |normal | |number_prefix:RC |
| bw11 |RC1 |Snivy |reverse | |number_prefix:RC |
| bw11 |RC10 |Gardevoir |normal | |number_prefix:RC |
| bw11 |RC10 |Gardevoir |reverse | |number_prefix:RC |
| bw11 |RC12 |Stunfisk |normal | |number_prefix:RC |
| bw11 |RC12 |Stunfisk |reverse | |number_prefix:RC |
| bw11 |RC13 |Purrloin |normal | |number_prefix:RC |
| bw11 |RC13 |Purrloin |reverse | |number_prefix:RC |
| bw11 |RC14 |Eevee |normal | |number_prefix:RC |
| bw11 |RC14 |Eevee |reverse | |number_prefix:RC |
| bw11 |RC15 |Teddiursa |normal | |number_prefix:RC |
| bw11 |RC15 |Teddiursa |reverse | |number_prefix:RC |
| bw11 |RC16 |Ursaring |normal | |number_prefix:RC |
| bw11 |RC16 |Ursaring |reverse | |number_prefix:RC |
| bw11 |RC18 |Minccino |normal | |number_prefix:RC |
| bw11 |RC18 |Minccino |reverse | |number_prefix:RC |
| bw11 |RC19 |Cinccino |normal | |number_prefix:RC |
| bw11 |RC19 |Cinccino |reverse | |number_prefix:RC |
| bw11 |RC20 |Elesa |normal | |number_prefix:RC |
| bw11 |RC20 |Elesa |reverse | |number_prefix:RC |
| bw11 |RC21 |Shaymin-EX |normal | |number_prefix:RC |
| bw11 |RC21 |Shaymin-EX |reverse | |number_prefix:RC |
| bw11 |RC22 |Reshiram |normal | |number_prefix:RC |
| bw11 |RC22 |Reshiram |reverse | |number_prefix:RC |
| bw11 |RC23 |Emolga |normal | |number_prefix:RC |

## Fingerprint

`a17fd179173f1f0ffffbd6c1008c97f9939fac35ffdbfda434baade9cdc3dafc`
