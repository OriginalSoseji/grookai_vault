import type { MtgPrintRelease } from './mtg_print_release_read_v1.mjs';
// Structural read-only SDK surface; web and backend have independent lockfiles.
type ReadResult = PromiseLike<{ data: unknown[] | null; error: unknown }>;
interface ReadQuery extends ReadResult {
  eq(column: string, value: unknown): ReadQuery;
  in(column: string, values: readonly unknown[]): ReadQuery;
  gte(column: string, value: unknown): ReadQuery;
  gt(column: string, value: unknown): ReadQuery;
  lt(column: string, value: unknown): ReadQuery;
  order(column: string): ReadQuery;
  range(from: number, to: number): ReadResult;
}
export type ReleaseReadClient = { from(table: string): { select(columns: string): ReadQuery } };
export function loadMtgPrintReleaseDatesV1(publicClient: ReleaseReadClient, backendClient: ReleaseReadClient, cardPrintIds: string[]): Promise<Map<string, MtgPrintRelease>>;
export function findMtgPrintReleaseCandidateIdsV1(backendClient: ReleaseReadClient, range: { minYear?: number; maxYear?: number; setCodes?: string[] }): Promise<string[]>;
