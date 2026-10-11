export type OfferIntent = 'cash' | 'trade';
export type OfferSource = 'manual' | 'tcgplayer_market';
export type OfferCondition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG';
export type OfferPolicy = Readonly<{
    id: string; name: string; intent: OfferIntent; rateBps: number; source: OfferSource;
    conditionBasis: 'selected' | 'unspecified' | OfferCondition;
    rounding: Readonly<{incrementMinor: 1 | 5 | 10 | 25 | 50 | 100; mode: 'nearest' | 'down'}>;
    lowValueTier: Readonly<{ceilingMinor: number; rateBps: number}> | null;
}>;
export type OfferPolicyBook = Readonly<{version: 2; revision: number; presets: readonly OfferPolicy[]; defaults: Readonly<Record<OfferIntent, string | null>>}>;
export type OfferContext = {intent: OfferIntent; quantity: number; cardId: string | null; printingId: string | null; condition: OfferCondition | null};
export type OfferReference = {source: OfferSource; amountMinor: number; currency: string; cardId: string | null; printingId: string | null;
    condition: OfferCondition | null; observedAt: string | null; publishedAt: string | null; provenanceId: string | null};
export type OfferProposal = Readonly<{status: 'unavailable'; reason: string}> | Readonly<{
    status: 'available'; policyId: string; intent: OfferIntent; source: OfferSource; referenceMinor: number;
    basisCondition: OfferCondition | null; requiresConditionReview: boolean; rateBps: number; tierApplied: boolean;
    scope: 'unit' | 'line'; quantity: number; calculatedMinor: number; suggestedMinor: number; lineMinor: number; rounding: OfferPolicy['rounding'];
}>;
export function validateOfferPolicy(value: unknown): OfferPolicy;
export function validateOfferPolicies(value: unknown): OfferPolicyBook;
export function readOfferPolicies(raw: string | null): OfferPolicyBook;
export function removeOfferPolicy(book: OfferPolicyBook, id: string): OfferPolicyBook;
export function quoteOfferPolicy(policy: OfferPolicy, context: OfferContext, reference: OfferReference | null, now: number): OfferProposal;
export type OfferMarketResult = Readonly<{status: 'unavailable'; reason: string}> | Readonly<{status: 'available'; reference: Readonly<OfferReference>}>;
export function projectOfferMarketReference(rows: unknown, cardId: string, printingId: string, now: number): OfferMarketResult;
export function offerPolicyStore(storage: Pick<Storage, 'getItem' | 'setItem'>, owner: string,
    lock: <T>(key: string, run: () => Promise<T>) => Promise<T>, currentOwner: () => string | null): {
    key: string; read: () => OfferPolicyBook;
    save: (expected: number, presets: readonly OfferPolicy[], defaults: OfferPolicyBook['defaults']) => Promise<OfferPolicyBook>;
};
