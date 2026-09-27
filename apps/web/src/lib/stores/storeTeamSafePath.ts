// Invitation tokens must survive sign-in, but must never enter analytics/referrers.
export function isStoreTeamSecretUrl(value: string): boolean {
  try {
    const url = new URL(value, "https://grookaivault.com");
    if (url.pathname.replace(/\/+$/, "") === "/account/store/team/accept") return true;
    if (["/login", "/auth/callback"].includes(url.pathname)) {
      const next = url.searchParams.get("next");
      return !!next && new URL(next, url.origin).pathname.replace(/\/+$/, "") === "/account/store/team/accept";
    }
    return false;
  } catch { return true; }
}
