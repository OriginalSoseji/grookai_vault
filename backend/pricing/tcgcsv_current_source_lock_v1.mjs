export const TCGCSV_CURRENT_SOURCE_LOCK_NAME_V1 =
  "grookai:tcgcsv:current:v1";

export const TCGCSV_CURRENT_SOURCE_LOCKED_CODE_V1 =
  "TCGCSV_CURRENT_SOURCE_LOCKED";

export async function acquireTcgcsvCurrentSourceLockV1(client) {
  const result = await client.query(
    "select pg_try_advisory_lock(hashtext($1)) as acquired",
    [TCGCSV_CURRENT_SOURCE_LOCK_NAME_V1],
  );
  if (result.rows[0]?.acquired !== true) {
    const error = new Error(
      `[${TCGCSV_CURRENT_SOURCE_LOCKED_CODE_V1}] current TCGCSV source generation is changing`,
    );
    error.code = TCGCSV_CURRENT_SOURCE_LOCKED_CODE_V1;
    throw error;
  }
}

export async function releaseTcgcsvCurrentSourceLockV1(client) {
  await client.query(
    "select pg_advisory_unlock(hashtext($1))",
    [TCGCSV_CURRENT_SOURCE_LOCK_NAME_V1],
  );
}
