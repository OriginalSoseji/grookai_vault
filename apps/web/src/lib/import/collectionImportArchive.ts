// Draft for R4. Historical source reconciliation is not current inventory.
export type ArchiveRow = Readonly<Record<string, string>>;
export type ArchiveGroup = {
  groupKey: string; sourceIndices: number[]; instanceIds: string[];
  kind: "card" | "sealed"; addedCopies: number; target: Record<string, unknown>;
};
export type CollectionImportArchive = {
  sourceSha256: string; createdAt: string; rows: ArchiveRow[];
  groups: ArchiveGroup[]; reviewIndices: number[];
  counts: { sourceRows: number; reconciledRows: number; reviewRows: number;
    cardCopies: number; sealedCopies: number; addedCopies: number; reusedCopies: number };
};
const invalid = (): never => { throw new Error("Saved import details could not be confirmed. Retry loading this import."); };
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
};
const digest = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const uuid = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
const natural = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

/** Call only after the owner-scoped cursor reader reaches an empty group page. */
export function collectionImportArchive(ownerId: string, sourceSha256: string, document: unknown, mappings: unknown[]): CollectionImportArchive {
  if (!uuid(ownerId) || !digest(sourceSha256)) return invalid();
  const doc = record(document);
  if (doc.user_id !== ownerId || doc.source_sha256 !== sourceSha256 ||
      typeof doc.created_at !== "string" || !Number.isFinite(Date.parse(doc.created_at)) ||
      !Array.isArray(doc.source_rows) || doc.source_rows.length < 1 || doc.source_rows.length > 5000 ||
      !Array.isArray(mappings) || mappings.length > doc.source_rows.length) return invalid();
  let columns: string[] | null = null;
  const rows = doc.source_rows.map(value => {
    const row = record(value), keys = Object.keys(row).sort();
    if (!keys.length || keys.some(key => !key.trim() || typeof row[key] !== "string")) return invalid();
    if (columns && (columns.length !== keys.length || columns.some((key, i) => key !== keys[i]))) return invalid();
    columns = keys;
    // Preserve every stored field value, including unknown columns and whitespace.
    return Object.fromEntries(keys.map(key => [key, row[key] as string]));
  });
  const indices = new Set<number>(), copies = new Set<string>(), keys = new Set<string>();
  let cardCopies = 0, sealedCopies = 0, addedCopies = 0;
  const groups = mappings.map(value => {
    const group = record(value), target = record(group.target);
    if (group.user_id !== ownerId || group.source_sha256 !== sourceSha256 || !digest(group.group_key) || keys.has(group.group_key) ||
        !Array.isArray(group.source_indices) || !group.source_indices.length || !Array.isArray(group.instance_ids) ||
        !group.instance_ids.length || !natural(group.added_count) || group.added_count > group.instance_ids.length ||
        !Array.isArray(target.sourceIndices) || JSON.stringify(target.sourceIndices) !== JSON.stringify(group.source_indices) ||
        target.desiredQuantity !== group.instance_ids.length) return invalid();
    keys.add(group.group_key);
    for (const index of group.source_indices) {
      if (!natural(index) || index >= rows.length || indices.has(index)) return invalid();
      indices.add(index);
    }
    for (const id of group.instance_ids) {
      if (!uuid(id) || copies.has(id)) return invalid();
      copies.add(id);
    }
    const kind = target.objectKind === "sealed" ? "sealed" : "card";
    if (kind === "sealed") {
      if (!uuid(target.sealedVariantId)) return invalid();
      sealedCopies += group.instance_ids.length;
    } else {
      if ((target.objectKind !== undefined && target.objectKind !== "card") || !uuid(target.cardId) ||
          (target.cardPrintingId !== null && !uuid(target.cardPrintingId))) return invalid();
      cardCopies += group.instance_ids.length;
    }
    addedCopies += group.added_count;
    return { groupKey: group.group_key, sourceIndices: [...group.source_indices] as number[],
      instanceIds: [...group.instance_ids] as string[], kind, addedCopies: group.added_count,
      target: structuredClone(target) } satisfies ArchiveGroup;
  });
  const reviewIndices = rows.flatMap((_, index) => indices.has(index) ? [] : [index]);
  return {sourceSha256, createdAt: doc.created_at, rows, groups, reviewIndices,
    counts: {sourceRows: rows.length, reconciledRows: indices.size, reviewRows: reviewIndices.length,
      cardCopies, sealedCopies, addedCopies, reusedCopies: copies.size - addedCopies}};
}

/** Lossless stored fields; deliberately not a recreated original CSV or inventory export. */
export function collectionImportArchiveJson(archive: CollectionImportArchive): string {
  return JSON.stringify({format: "grookai-saved-import-v1", sourceSha256: archive.sourceSha256,
    createdAt: archive.createdAt,
    description: "Stored source fields and historical reconciliation. Mapped copies may since have been sold, archived or edited. This is not a current inventory export or the original CSV file.",
    sourceRows: archive.rows, mappings: archive.groups, reviewIndices: archive.reviewIndices,
    counts: archive.counts}, null, 2) + "\n";
}

export type CollectionArchiveReader = {
  isCurrentOwner: () => boolean;
  readDocument: () => Promise<unknown>;
  readGroupPage: (after: string | null) => Promise<unknown>;
};

/** A short page is not completion: PostgREST can cap a requested page size. */
export async function readCollectionImportArchive(ownerId: string, sourceSha256: string, reader: CollectionArchiveReader): Promise<CollectionImportArchive> {
  const checkOwner = () => { if (!reader.isCurrentOwner()) throw new Error("Your account changed. Reopen saved imports."); };
  checkOwner();
  const document = await reader.readDocument();
  checkOwner();
  // Validate the document before any page requests. No synthetic empty fallback.
  const source = collectionImportArchive(ownerId, sourceSha256, document, []);
  const groups: unknown[] = [];
  let after: string | null = null;
  while (true) {
    checkOwner();
    const page = await reader.readGroupPage(after);
    checkOwner();
    if (!Array.isArray(page)) return invalid();
    if (!page.length) break;
    if (groups.length + page.length > source.rows.length) return invalid();
    for (const value of page) {
      const group = record(value);
      if (!digest(group.group_key) || (after !== null && group.group_key <= after)) return invalid();
      after = group.group_key;
      groups.push(group);
    }
  }
  checkOwner();
  return collectionImportArchive(ownerId, sourceSha256, document, groups);
}
