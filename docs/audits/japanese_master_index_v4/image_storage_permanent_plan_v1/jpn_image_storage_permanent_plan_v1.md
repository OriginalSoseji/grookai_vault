# Japanese Master Index V4 Permanent Image Storage Plan V1

Generated: 2026-08-05T18:30:00.499Z

- Assets: 53
- Original canary lane: 17
- Remediated lane: 36
- Supabase project: `ycdxbpibncqcchqiihfz`
- Storage bucket: `user-card-images`
- Approval fingerprint: `23da727efaea32b71e3498f9af7ec12b83bed0e43519c55053d4fe2d27ee3b5e`
- Storage plan hash: `79d7744de1db13db6f58c441663e6d03c33f277e35d5d3c7c1a5a5364e59cd59`
- Code bundle hash: `590542fd2abc8710272a9f83410e75ed917556b09de9e2ce8244cd18abcc51e7`
- Local cache verified: 53/53
- Storage access performed: false
- Database access performed: false
- Ready for separate approval: true

The future apply must stage all 53 exact source images before Storage access,
prove all 53 target paths are absent, upload with `upsert: false`, and verify
each stored image by hash, size, dimensions, and format. A successful run
retains all 53 objects. Any failure removes only objects created by that run
and verifies those paths absent. Database image pointers remain excluded.

Future apply command after explicit approval:

`node scripts/audits/japanese_master_index_v4/image_storage_permanent_apply_v1.mjs --apply --fingerprint=23da727efaea32b71e3498f9af7ec12b83bed0e43519c55053d4fe2d27ee3b5e --plan-hash=79d7744de1db13db6f58c441663e6d03c33f277e35d5d3c7c1a5a5364e59cd59`
