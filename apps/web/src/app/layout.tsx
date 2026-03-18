import Link from "next/link";
import type { ReactNode } from "react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { createServerComponentClient } from "@/lib/supabase/server";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profileRow = user
    ? await supabase.from("public_profiles").select("slug,public_profile_enabled").eq("user_id", user.id).maybeSingle()
    : null;
  const profileHref = user ? (profileRow?.data?.slug ? `/u/${profileRow.data.slug}` : "/account") : null;
  const wallHref =
    user && profileRow?.data?.slug && profileRow.data.public_profile_enabled
      ? `/u/${profileRow.data.slug}`
      : null;

  return (
    <html lang="en">
      <body>
        <SiteHeader isAuthenticated={!!user} profileHref={profileHref} />
        <main className="w-full py-7 pb-[calc(5.1rem+env(safe-area-inset-bottom))] md:py-12 md:pb-12">
          <PageContainer>{children}</PageContainer>
        </main>
        <footer className="border-t border-slate-200 bg-white pb-[calc(5.1rem+env(safe-area-inset-bottom))] md:pb-0">
          <PageContainer className="py-4 text-center text-sm text-slate-600">
            <Link href="/legal" className="underline-offset-4 hover:text-slate-900 hover:underline">
              Legal
            </Link>
          </PageContainer>
        </footer>
        <MobileBottomNav wallHref={wallHref} />
        <Analytics />
      </body>
    </html>
  );
}
