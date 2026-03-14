export async function shareCard(gvId: string) {
  const url = `${window.location.origin}/card/${gvId}`;

  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
