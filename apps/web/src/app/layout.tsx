import Link from "next/link";
import type { ReactNode } from "react";
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

  return (
    <html lang="en">
      <body>
        <SiteHeader isAuthenticated={!!user} />
        <main className="w-full py-12">
          <PageContainer>{children}</PageContainer>
        </main>
        <footer className="border-t border-slate-200 bg-white">
          <PageContainer className="py-4 text-center text-sm text-slate-600">
            <Link href="/legal" className="underline-offset-4 hover:text-slate-900 hover:underline">
              Legal
            </Link>
          </PageContainer>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
