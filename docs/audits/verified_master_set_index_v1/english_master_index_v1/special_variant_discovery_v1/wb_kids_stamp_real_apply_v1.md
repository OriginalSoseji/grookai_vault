# WB Kids Promo Stamp Real Apply V1

Real apply for the approved WB Kids promo stamp special-case parent lane package.

## Safety

- package_id: SPECIAL-VAR-02-WB-KIDS-PROMO-STAMP-PARENT-INSERTS
- package_fingerprint_sha256: `d6793a662528ecd9fc7a2bec19244da24da7a06df8a820b4c35c50c1d56102fc`
- sql_hash_sha256: `cf6539d044a889f51db702da396cbdb813a9b7c9251c44a06b378b52b725752c`
- dry_run_proof_sha256: `1ea619a0eed2b267ab92ad780d270cbab5eaf2d6811a99f2cf13a06db7f9f17e`
- migrations_created: false
- global_apply_performed: false
- deletes_performed: 0
- merges_performed: 0
- post_apply_verified: true

## Scope

- parent_inserts: 9
- identity_inserts: 9
- child_inserts: 9

## Targets

| set | number | name | variant | modifier | finish |
| --- | --- | --- | --- | --- | --- |
| basep | 2 | Electabuzz | inverted_wb_kids_stamp | recognized_error:inverted_wb_kids_stamp | normal |
| basep | 2 | Electabuzz | wb_kids_stamp | stamp:wb_kids_first_movie | normal |
| basep | 3 | Mewtwo | inverted_wb_kids_stamp | recognized_error:inverted_wb_kids_stamp | normal |
| basep | 3 | Mewtwo | wb_kids_stamp | stamp:wb_kids_first_movie | normal |
| basep | 4 | Pikachu | inverted_wb_kids_stamp | recognized_error:inverted_wb_kids_stamp | normal |
| basep | 4 | Pikachu | missing_wb_kids_stamp | recognized_error:missing_wb_kids_stamp | normal |
| basep | 4 | Pikachu | wb_kids_stamp | stamp:wb_kids_first_movie | normal |
| basep | 5 | Dragonite | inverted_wb_kids_stamp | recognized_error:inverted_wb_kids_stamp | normal |
| basep | 5 | Dragonite | wb_kids_stamp | stamp:wb_kids_first_movie | normal |

## Rollback Preview

```sql
delete from public.card_printings where id in ('720bbcbe-b834-43dd-ba3d-27941f9b1dd9', 'd466e713-eeea-4805-b225-ecf2b79aaa09', 'c532ffb6-d835-4bde-af54-1f6e13d86a36', '98fed3d6-4741-4997-a908-11e42508c1d4', '084a1bd0-b072-4bf5-b799-bda0d931abe3', '5ee0e449-5842-4d6b-a0da-31bc45b63fa8', '24afd848-6bd5-42fb-8c48-7177a38c0257', '814508cd-8e3b-4d74-84f5-4817d484b439', '3addb622-e46d-4a7d-adbd-d835dc5c9180');
delete from public.card_print_identity where card_print_id in ('0d97110d-e8bd-453a-b721-35091f4f08b8', '71d197da-c12f-4f01-899f-1449b53dcf6c', '3746cabc-29bd-4a1f-a105-eca80800cc2e', '571cb8c6-b7ec-43e8-8a54-fc5b71245690', 'dfa19c6b-5e69-4ba5-a791-60b0f0c9edd1', 'a10b92ea-ea18-4d3c-b046-8908fab97c4a', 'aa1859b6-99a2-4d95-960b-8cedda0ea8c1', '6a505b8b-807f-4b0f-b1ee-73ecf29b3a42', '4c4a8734-fc89-4208-ade7-4ebacc80bdbb');
delete from public.card_prints where id in ('0d97110d-e8bd-453a-b721-35091f4f08b8', '71d197da-c12f-4f01-899f-1449b53dcf6c', '3746cabc-29bd-4a1f-a105-eca80800cc2e', '571cb8c6-b7ec-43e8-8a54-fc5b71245690', 'dfa19c6b-5e69-4ba5-a791-60b0f0c9edd1', 'a10b92ea-ea18-4d3c-b046-8908fab97c4a', 'aa1859b6-99a2-4d95-960b-8cedda0ea8c1', '6a505b8b-807f-4b0f-b1ee-73ecf29b3a42', '4c4a8734-fc89-4208-ade7-4ebacc80bdbb');
```
