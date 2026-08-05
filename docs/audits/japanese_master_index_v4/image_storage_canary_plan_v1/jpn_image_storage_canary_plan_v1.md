# Japanese Master Index V4 Image Storage Canary Plan V1

Generated: 2026-08-05T17:57:00.588Z

- Assets: 17
- Supabase project: `ycdxbpibncqcchqiihfz`
- Storage bucket: `user-card-images`
- Approval fingerprint: `ef7d4745196a3f670870fa27f7d5b7a4d6609d61beae5889f4d90ea18d8394d7`
- Storage plan hash: `0d387055da45e4e1f38cfb2007eb8cb4e175023eb221c6d55391d46d6d6779ae`
- Code bundle hash: `a83f7296fcee737c2c7ef0d59b870c535e271f071add1c98b61e5c84524d586e`
- Storage access performed: false
- Database access performed: false
- Ready for separate approval: true

The future canary must stage and verify all 17 official source images before
the first Storage call. It then requires each target to be absent, uploads with
`upsert: false`, downloads and verifies exact bytes, removes every object
created by the canary, and verifies all targets are absent again. It cannot
write database image pointers and leaves zero durable Storage objects.

Future apply command after explicit approval:

`node scripts/audits/japanese_master_index_v4/image_storage_canary_apply_v1.mjs --apply --fingerprint=ef7d4745196a3f670870fa27f7d5b7a4d6609d61beae5889f4d90ea18d8394d7 --plan-hash=0d387055da45e4e1f38cfb2007eb8cb4e175023eb221c6d55391d46d6d6779ae`
