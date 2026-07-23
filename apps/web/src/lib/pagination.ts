export function chunkValues<T>(values: T[], size: number) {
  if (!Number.isInteger(size) || size <= 0) {
    throw new RangeError("Chunk size must be a positive integer.");
  }

  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export function getRemainingPageIndexes(totalCount: number, pageSize: number) {
  if (!Number.isFinite(totalCount) || totalCount <= 0) {
    return [];
  }
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new RangeError("Page size must be a positive integer.");
  }

  return Array.from(
    { length: Math.max(0, Math.ceil(totalCount / pageSize) - 1) },
    (_, index) => index + 1,
  );
}

export async function mapWithBoundedConcurrency<T, TResult>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<TResult>,
) {
  if (!Number.isInteger(concurrency) || concurrency <= 0) {
    throw new RangeError("Concurrency must be a positive integer.");
  }

  const results: TResult[] = [];
  for (let index = 0; index < values.length; index += concurrency) {
    results.push(...(await Promise.all(values.slice(index, index + concurrency).map(mapper))));
  }
  return results;
}
