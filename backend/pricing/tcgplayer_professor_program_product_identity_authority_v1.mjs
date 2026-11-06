export const TCGPLAYER_PROFESSOR_PROGRAM_PRODUCT_IDENTITY_AUTHORITY_V1 =
  "TCGPLAYER_PROFESSOR_PROGRAM_PRODUCT_IDENTITY_AUTHORITY_V1";

const SOURCE_GROUP_ID = 2332;
const SOURCE_GROUP_NAME = "Professor Program Promos";

const rows = [
  [176629, "Prof. Oak's Research (2004-2005)", "98/112", "e402c8fc-563b-49e3-a198-6a5fe5f75cda", "GV-PK-RG-98-PROFESSOR-PROGRAM", "e3c0f90a-9b77-488d-8445-64e929a5a4fb", "ex6", "Prof. Oak's Research", "98", "eb9b3f39-760f-4b77-a3b1-c486b4a4e4c3", "normal", "GV-PK-RG-98-PROFESSOR-PROGRAM-STD", "tcgplayer_professor_program_catalog_repair_v1", "tcgplayer:176629:professor_program_stamp:normal"],
  [176630, "Professor Birch (2006)", "82/106", "ed61ea12-90af-4250-b089-e2b31fc2fdce", "GV-PK-EX9-82-PROFESSOR-PROGRAM-STAMP", "07f4df8d-766f-4801-b1f8-7e5a80035274", "ex9", "Professor Birch", "82", "820ba0fb-cc4a-4460-ada6-66fdeb1185b9", "holo", "GV-PK-EX9-82-PROFESSOR-PROGRAM-STAMP-HOLO", "verified_master_index_v1", "ex9:82:professor_program_stamp:holo"],
  [176631, "Professor Oak's Visit (2008-2009)", "122/132", "baa63e55-c8aa-4936-8c9a-63de29e75c16", "GV-PK-SW-122-PROFESSOR-PROGRAM", "d19aaa18-3b30-41a2-919d-2fce1d7bebfe", "dp3", "Professor Oak's Visit", "122", "235db02c-1431-42ba-a973-43cb6d89b38d", "normal", "GV-PK-SW-122-PROFESSOR-PROGRAM-STD", "tcgplayer_professor_program_catalog_repair_v1", "tcgplayer:176631:professor_program_stamp:normal"],
  [176632, "Professor Juniper - 98/108 (2013)", "98/108", "c98e4f39-59fc-4ec1-bfc5-c34f28a25f3c", "GV-PK-BW5-98-PROFESSOR-PROGRAM-STAMP", "56c23b8d-904e-4c3a-b0fd-9562919f5694", "bw5", "Professor Juniper", "98", "04cf4fa5-ea7a-434c-a558-7b53e95a4a93", "reverse", "GV-PK-BW5-98-PROFESSOR-PROGRAM-STAMP-RH", "verified_master_index_v1", "bw5:98:professor_program_stamp:reverse"],
  [176633, "Professor Juniper - 101/114 (2013)", "101/114", "12cad852-d079-44cc-9438-e806aede97ff", "GV-PK-BW1-101-PROFESSOR-PROGRAM-STAMP", "474cefc3-bb4d-47eb-8c02-333953130b4c", "bw1", "Professor Juniper", "101", "8b0cf097-ef28-42aa-a3f2-f8665f863726", "reverse", "GV-PK-BW1-101-PROFESSOR-PROGRAM-STAMP-RH", "verified_master_index_v1", "bw1:101:professor_program_stamp:reverse"],
  [213516, "Judge (2019)", "108/131", "ea08d28d-8267-4db9-859c-64ffd048792f", "GV-PK-FLI-108-PROFESSOR-PROGRAM-STAMP", "2ac96af4-a5e2-479f-916c-7b52e13a8f3a", "sm6", "Judge", "108", "bfe26a71-5c95-4e97-8b12-ef6afa0b2dc6", "reverse", "GV-PK-FLI-108-PROFESSOR-PROGRAM-STAMP-RH", "verified_master_set_index_v1", "sm6:108:stamped_identity:professor_program_stamp:reverse"],
  [499366, "Gym Trainer (2022)", "059/072", "8f22c4ef-320d-45cd-8938-4aa84aca740e", "GV-PK-SHF-59-PROFESSOR-PROGRAM", "6335ab75-4e9d-4e4c-8955-261f5288ca7c", "swsh4.5", "Gym Trainer", "59", "2f02ea00-6f1e-480d-8766-edb2a468d72f", "reverse", "GV-PK-SHF-59-PROFESSOR-PROGRAM-RH", "tcgplayer_professor_program_catalog_repair_v1", "tcgplayer:499366:professor_program_stamp:reverse"],
].map(([sourceProductId, sourceProductName, printedNumber, cardPrintId, gvId,
  setId, setCode, name, number, printingId, finishKey, printingGvId,
  provenanceSource, provenanceRef]) => Object.freeze({
  authority_version: TCGPLAYER_PROFESSOR_PROGRAM_PRODUCT_IDENTITY_AUTHORITY_V1,
  source_product_id: sourceProductId,
  source_product_name: sourceProductName,
  source_group_id: SOURCE_GROUP_ID,
  source_group_name: SOURCE_GROUP_NAME,
  printed_number: printedNumber,
  target: Object.freeze({ card_print_id: cardPrintId, gv_id: gvId, set_id: setId,
    set_code: setCode, name, number, variant_key: "professor_program_stamp" }),
  printing: Object.freeze({ printing_id: printingId, finish_key: finishKey,
    printing_gv_id: printingGvId, provenance_source: provenanceSource,
    provenance_ref: provenanceRef }),
}));

export const TCGPLAYER_PROFESSOR_PROGRAM_PRODUCT_IDENTITIES_V1 = Object.freeze(rows);

const text = (value) => String(value ?? "").trim();

export function reviewedTcgplayerProfessorProgramProductIdentityByIdV1(sourceProductId) {
  return rows.find((candidate) => Number(sourceProductId) === candidate.source_product_id) ?? null;
}

export function reviewedTcgplayerProfessorProgramProductIdentityV1(source) {
  const row = reviewedTcgplayerProfessorProgramProductIdentityByIdV1(source?.source_product_id);
  if (!row) return null;
  return Number(source?.source_group_id) === row.source_group_id &&
    text(source?.source_group_name) === row.source_group_name &&
    text(source?.source_product_name) === row.source_product_name &&
    text(source?.printed_number) === row.printed_number ? row : null;
}

export function matchesReviewedTcgplayerProfessorProgramProductTargetV1(source, target) {
  const authority = reviewedTcgplayerProfessorProgramProductIdentityV1(source);
  if (!authority || !target) return false;
  return target.card_print_id === authority.target.card_print_id &&
    target.gv_id === authority.target.gv_id && target.set_id === authority.target.set_id &&
    target.set_code === authority.target.set_code && target.name === authority.target.name &&
    text(target.number) === authority.target.number &&
    text(target.variant_key) === authority.target.variant_key;
}
