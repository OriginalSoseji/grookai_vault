import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getUnreadCardInteractionGroupCount } from "@/lib/network/getUserCardInteractions";
import { createServerComponentClient } from "@/lib/supabase/server";

type ShellAuthState = {
  isAuthenticated: boolean;
  profileHref: string | null;
  wallHref: string | null;
  networkUnreadCount: number;
};

const DEFAULT_SHELL_AUTH_STATE: ShellAuthState = {
  isAuthenticated: false,
  profileHref: null,
  wallHref: null,
  networkUnreadCount: 0,
};

export async function AppChrome() {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return (
      <>
        <SiteHeader
          isAuthenticated={DEFAULT_SHELL_AUTH_STATE.isAuthenticated}
          profileHref={DEFAULT_SHELL_AUTH_STATE.profileHref}
          networkUnreadCount={DEFAULT_SHELL_AUTH_STATE.networkUnreadCount}
        />
        <MobileBottomNav
          wallHref={DEFAULT_SHELL_AUTH_STATE.wallHref}
        />
      </>
    );
  }

  const [profileResponse, networkUnreadCount] = await Promise.all([
    client
      .from("public_profiles")
      .select("slug,public_profile_enabled")
      .eq("user_id", user.id)
      .maybeSingle(),
    getUnreadCardInteractionGroupCount(user.id),
  ]);

  const slug = typeof profileResponse.data?.slug === "string" ? profileResponse.data.slug.trim() : "";
  const profileHref = slug ? `/u/${slug}` : null;
  const wallHref = slug && profileResponse.data?.public_profile_enabled ? `/u/${slug}` : null;

  return (
    <>
      <SiteHeader isAuthenticated={true} profileHref={profileHref} networkUnreadCount={networkUnreadCount} />
      <MobileBottomNav wallHref={wallHref} />
    </>
  );
}

export default AppChrome;
