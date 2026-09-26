// A decoder worker can fail without rejecting its library promise. Stop waiting
// so originals can still be retained/exported and JPEG scans can keep working.
export async function imageDecodeDeadline<T>(work: Promise<T>, expired: () => void, milliseconds = 30_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        expired();
        reject(new Error("HEIC conversion timed out. Your original is retained. Use a JPEG copy, or reload before retrying HEIC."));
      }, milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}
