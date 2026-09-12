import Link from "next/link";
import { notFound } from "next/navigation";
import { collectorPreview } from "@/lib/collectorPreview";

export default function PreviewAccess() {
  if (!collectorPreview) notFound();
  return <section className="mx-auto max-w-xl py-16">
    <h1 className="text-2xl font-semibold">Account actions are paused in this preview</h1>
    <p className="mt-4">Your collection stays unchanged. Browse the catalog, open cards, and compare the new design here.</p>
    <Link className="mt-6 inline-block underline" href="/explore">Back to cards</Link>
  </section>;
}
