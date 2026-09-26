import type { VisualReferenceV24, VisualPacketV24 } from './scanVisualProcessV24.mjs';
export const MAX_REFERENCE_COUNT: number;
export const MAX_REFERENCE_BYTES: number;
export const MAX_REFERENCE_TOTAL_BYTES: number;
export const REFERENCE_CONCURRENCY: number;
export function readBoundedResponse(response: Response, maxBytes: number, signal?: AbortSignal): Promise<Buffer>;
export function eligibleReferenceIds(requested: VisualReferenceV24[], currentRows: unknown[], printings: unknown[]): string[];
export function createReferenceDelivery(options: {
  byId: Map<string, VisualReferenceV24>; origin: string;
  authorize: (rows: VisualReferenceV24[], signal: AbortSignal) => Promise<string[]>;
  sign: (rows: VisualReferenceV24[], signal: AbortSignal) => Promise<string[]>;
  fetchImage?: typeof fetch;
}): (ids: string[], options: { signal: AbortSignal }) => Promise<VisualPacketV24[]>;
