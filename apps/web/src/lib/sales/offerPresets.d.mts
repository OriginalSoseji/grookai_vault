export type OfferPreset = Readonly<{id: string; name: string; rateBps: number}>;
export type OfferPresetBook = Readonly<{version: 1; revision: number; presets: readonly OfferPreset[]}>;
export function validateOfferPresets(value: unknown): OfferPresetBook;
export function readOfferPresets(raw: string | null): OfferPresetBook;
export function offerPresetStore(storage: Pick<Storage, 'getItem' | 'setItem'>, owner: string,
    lock: <T>(key: string, run: () => Promise<T>) => Promise<T>, currentOwner: () => string | null): {
    key: string; read: () => OfferPresetBook; save: (expected: number, presets: readonly OfferPreset[]) => Promise<OfferPresetBook>;
};
