import type { IntakeBatch, BatchSettings } from "./batchIntake";

const database = "grookai-vendor-intake-v1";
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(database, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("batches", { keyPath: "storeId" });
      request.result.createObjectStore("presets", { keyPath: "storeId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Browser draft storage is unavailable. Allow site storage before adding scans."));
  });
}
export async function loadIntakeBatch(storeId: string): Promise<IntakeBatch | null> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("batches", "readonly").objectStore("batches").get(storeId);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
// Compare-and-swap inside one IndexedDB transaction prevents two tabs overwriting a draft.
export async function saveIntakeBatch(batch: IntakeBatch): Promise<IntakeBatch> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("batches", "readwrite"), store = tx.objectStore("batches");
      let failure = "Draft could not be saved. Your browser may be out of space.";
      const next = { ...batch, revision: batch.revision + 1, updatedAt: new Date().toISOString() };
      const read = store.get(batch.storeId);
      read.onsuccess = () => {
        const previous = read.result as IntakeBatch | undefined;
        if ((!previous && batch.revision !== 0) || (previous && (previous.id !== batch.id || previous.revision !== batch.revision || previous.storageEpoch !== batch.storageEpoch))) {
          failure = "This batch changed in another tab. Close the other editor and reopen Upload scans."; tx.abort(); return;
        }
        store.put(next);
      };
      tx.oncomplete = () => resolve(next);
      tx.onabort = tx.onerror = () => reject(new Error(failure));
    });
  } finally { db.close(); }
}
export async function clearIntakeBatch(storeId: string, id: string, revision: number, storageEpoch?: string): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("batches", "readwrite"), store = tx.objectStore("batches"), read = store.get(storeId);
      read.onsuccess = () => {
        if (read.result && (read.result.id !== id || read.result.revision !== revision || read.result.storageEpoch !== storageEpoch)) { tx.abort(); return; }
        if ((read.result as IntakeBatch | undefined)?.items.some(i => i.submission && !i.receipt && !i.cancelled)) { tx.abort(); return; }
        store.delete(storeId);
      };
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(new Error("The batch changed in another tab. Reopen before clearing it."));
    });
  } finally { db.close(); }
}
// Import is an atomic insert/replacement of an empty draft only. A stale tab or
// restored old backup can never overwrite pending work in another tab.
export async function restoreIntakeBatch(batch: IntakeBatch, expected: IntakeBatch): Promise<IntakeBatch> {
  if (batch.storeId !== expected.storeId) throw new Error("Restore this backup in its original store.");
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("batches", "readwrite"), store = tx.objectStore("batches"), read = store.get(batch.storeId);
      // A new epoch prevents an old tab with the same batch ID/revision from
      // overwriting a later restore. Server submission identities stay unchanged.
      const next = { ...batch, revision: 1, storageEpoch: crypto.randomUUID(), updatedAt: new Date().toISOString() };
      read.onsuccess = () => {
        const previous = read.result as IntakeBatch | undefined;
        if (previous ? previous.id !== expected.id || previous.revision !== expected.revision || previous.storageEpoch !== expected.storageEpoch || previous.assets.length > 0 || previous.items.length > 0 : expected.revision !== 0) { tx.abort(); return; }
        store.put(next);
      };
      tx.oncomplete = () => resolve(next);
      tx.onabort = tx.onerror = () => reject(new Error("An existing batch or another tab prevented restore. Keep that batch, or restore in a different browser signed in to this store."));
    });
  } finally { db.close(); }
}
export async function intakePreset(storeId: string, settings?: BatchSettings): Promise<BatchSettings | null> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("presets", settings ? "readwrite" : "readonly"), store = tx.objectStore("presets");
      const request = settings ? store.put({ storeId, settings }) : store.get(storeId);
      let result: BatchSettings | null = null;
      request.onsuccess = () => { result = settings ?? request.result?.settings ?? null; };
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () => reject(new Error("Listing defaults could not be saved."));
    });
  } finally { db.close(); }
}
