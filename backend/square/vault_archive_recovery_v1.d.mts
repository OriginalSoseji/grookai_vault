type ArchiveError = {code?: string; message?: string; details?: string | null};
type ArchiveResult<T> = {data: T | null; error: ArchiveError | null};
export function squareArchiveRecoveryTarget(error: unknown): {instanceId: string; gvvi: string} | null;
export function squareAwareVaultArchive<T>(options: {
 archive: () => PromiseLike<ArchiveResult<T>>;
 prepare: (instanceId: string) => Promise<{status: string; instanceId: string; gvvi: string}>;
}): Promise<ArchiveResult<T>>;
