import { notFound } from "next/navigation";
import { LogoThemePreview } from "@/components/brand/LogoThemePreview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Logo themes | grookai vault", robots: { index: false, follow: false } };

export default function BrandPreviewPage() {
  if (process.env.NODE_ENV !== "development" || process.env.VERCEL === "1") notFound();
  return <LogoThemePreview />;
}
