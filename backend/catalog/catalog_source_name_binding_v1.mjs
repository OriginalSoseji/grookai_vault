import { collectorNumber, digest, normalize } from '../competitive/pokemon_playables/common.mjs';

// Finite reviewed package registry. Registration records provenance/labels only;
// qualification, equivalence and legality remain independent engine decisions.
export const SOURCE_NAME_BINDING_PACKAGES = Object.freeze({
  'f3cbfcddb1348fc1ce3a742615292a3efdb53d0fe92eded687384002175c4586': Object.freeze([
  {
    "source_card_id": "me03-021",
    "card_print_id": "5bd0c6d4-33a0-4cde-9d18-0cb280936dc2",
    "set_code": "me03",
    "number": "021",
    "canonical_label": "Mega Starmie-EX",
    "source_label": "Mega Starmie ex",
    "identity_id": "59322725-5b69-4a31-8f39-a39f8bd4127c",
    "identity_key_hash": "b68c6b11478d452a8273cb835cfa794ba247afc55d19895c956e8256ef87ee78",
    "master_card_digest": "64e7f75f3efb761e3ee5b96609c9533a507c309cd7c5495c3ef6e1d9302ee33c",
    "source_body_sha256": "74b5430086cf067b64b5855fcb9ee8f50060df8af52a1fed0bd7cff9914af684",
    "artwork_sha256": "14a9286f3e7befac3ad149f6e35b421247eb3d4ad0a88e1c018fb9e4f71a9c2c"
  },
  {
    "source_card_id": "me03-055",
    "card_print_id": "40730352-12bf-4016-9f6c-7863e499f237",
    "set_code": "me03",
    "number": "055",
    "canonical_label": "Mega Skarmory-EX",
    "source_label": "Mega Skarmory ex",
    "identity_id": "58667d28-fd43-43b1-8ff6-5b2d4fdbf035",
    "identity_key_hash": "dba1654c4621cc59f43ae09660b7288c9231164baa99aa3655af7666d2a5cef4",
    "master_card_digest": "a059b69e41d81499cb2f97772efdf3ced43b8b6f9e636c79c17ebab5a49522c3",
    "source_body_sha256": "f71388e794056de19fb32cb412e6ccc3d4fabdfc0cec53ed7be5999b8bf4b3e4",
    "artwork_sha256": "488dfc99c662028a583d845e8317fbd0a0a0ff02a63c6e40c3ef87f2c839a7d6"
  },
  {
    "source_card_id": "me03-062",
    "card_print_id": "8d1c1faa-a210-4f45-ae9a-bc9752db0a2f",
    "set_code": "me03",
    "number": "062",
    "canonical_label": "Meowth-EX",
    "source_label": "Meowth ex",
    "identity_id": "f4b31694-74e9-42ae-b7fe-8a8fa87356d3",
    "identity_key_hash": "104eb46b1af6393f8b83fdeca77508dd1a45c97d721c373f705adffac2df022e",
    "master_card_digest": "fb1399d1cf4a7f366fad95a082e1f3ee3d7561b88d8fbed684f3a61e104f38a6",
    "source_body_sha256": "246eba505f3bf2d39f711c2cc01a6cdda1bb374144de9cfce392ca43cad94568",
    "artwork_sha256": "938e942a1b71ac4b3f8795abd6aa75fd059362555d846abd628b9ed78685981d"
  },
  {
    "source_card_id": "me03-081",
    "card_print_id": "377086c4-b968-4335-aa44-54b0b518e913",
    "set_code": "me03",
    "number": "081",
    "canonical_label": "Poke Pad",
    "source_label": "Poké Pad",
    "identity_id": "73f27abe-2207-47a4-b74e-a4211616acd7",
    "identity_key_hash": "b6398b11bc8249013d944466165ad8f5aab256301fa6ab59821ccba122382d8d",
    "master_card_digest": "dd98eb6498cb9400591aaf3346debe039e94f5fef57dc8e80ddf54cf0775c9fd",
    "source_body_sha256": "192fd862bf5fdd8a6002c33611b69a35d8e044433c0ad22529ba229876644029",
    "artwork_sha256": "d83382639a24ad9d3657b3706c761b727bced3e9b31253fd77e77b3212ade8c4"
  },
  {
    "source_card_id": "me03-082",
    "card_print_id": "ae485e17-2157-405b-a304-fc9c1ad377aa",
    "set_code": "me03",
    "number": "082",
    "canonical_label": "Pokemon Catcher",
    "source_label": "Pokémon Catcher",
    "identity_id": "04499351-7323-4482-baa4-9bf72b2957e5",
    "identity_key_hash": "853baf0164b6eab28c1a1f3957b8f42c4d3cbf44ff2783f383faa4dedda4a8aa",
    "master_card_digest": "99e857f6cbff4ecb98c1ac9ed62deb2c5892d89521d072397011173986ad5bc2",
    "source_body_sha256": "6aa7c1c8885a60d74cf11ba3fa1ba1a950c74720151e744078e332216a888026",
    "artwork_sha256": "cd3aa5d46c9afe1a2cf257120687f8b7885172965b1a90aabbc1bbf1ea05c889"
  }
].map(row => Object.freeze(row))),
});

export function sourceNameBindingValue(packageFingerprint, row) {
  return { version: 'catalog_source_name_binding:v1', authority_package: packageFingerprint, ...row };
}

export function catalogSourceNameMatches(parent, sourceName, mapping) {
  if (!parent || typeof sourceName !== 'string' || !sourceName.trim()) return false;
  if (normalize(parent?.name) === normalize(sourceName)) return true;
  const binding = mapping?.meta?.source_name_binding;
  const rows = SOURCE_NAME_BINDING_PACKAGES[binding?.authority_package];
  if (!Array.isArray(rows) || mapping.source !== 'tcgdex' || mapping.active !== true ||
    mapping.card_print_id !== parent?.id || !parent.identity_active || !parent.identity_consistent ||
    parent.identity_domain !== 'pokemon_eng_standard' || !parent.publicly_visible) return false;
  const row = rows.find(row => row.source_card_id === mapping.external_id && row.card_print_id === parent.id);
  return Boolean(row && parent.name === row.canonical_label && normalize(sourceName) === normalize(row.source_label) &&
    parent.set_code === row.set_code && collectorNumber(parent.number) === collectorNumber(row.number) &&
    parent.identity_id === row.identity_id && parent.identity_key_hash === row.identity_key_hash &&
    mapping.meta.promotion_package_fingerprint === binding.authority_package &&
    digest(binding) === digest(sourceNameBindingValue(binding.authority_package, row)));
}
