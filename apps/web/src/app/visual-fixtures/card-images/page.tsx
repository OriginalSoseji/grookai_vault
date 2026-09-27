import { notFound } from "next/navigation";
import PublicCardImage from "@/components/PublicCardImage";
import { isLocalVisualParityFixtureMode } from "@/lib/visualParity/fixtureMode";

export const dynamic = "force-dynamic";

export default function CardImagesFixture() {
  if (!isLocalVisualParityFixtureMode()) notFound();
  return (
    <main className="mx-auto max-w-lg p-6">
      <h1>Japanese card image recovery fixture</h1>
      <p>Isolated image delivery checks. No account or catalog records are loaded.</p>
      <section aria-label="Card detail">
        <h2>Budew · SV8a · Japanese</h2>
        <PublicCardImage
          src="/api/canon/cards/GV-PK-JPN-PRODUCT-DDA484E49B308E00-1/image"
          fallbackSrc="https://www.pokemon-card.com/assets/images/card_images/large/SV8a/046662_P_SUBOMI.jpg"
          alt="Budew card artwork"
          imageClassName="h-48 w-36 object-contain"
          fallbackClassName="flex h-48 w-36 items-center border p-4"
          loading="eager"
        />
        <p>Representative image; exact finish not verified.</p>
        <details><summary>Card information</summary><p>Fixture identity remains available when artwork fails.</p></details>
      </section>
      <section aria-label="Related card">
        <h2>Related card fixture</h2>
        <PublicCardImage
          src="/api/canon/cards/GV-PK-JPN-FIXTURE-RELATED/image"
          fallbackSrc="https://www.pokemon-card.com/assets/images/card_images/large/SV8a/fixture-related.jpg"
          alt="Related card artwork"
          imageClassName="h-48 w-36 object-contain"
          fallbackClassName="flex h-48 w-36 items-center border p-4"
          loading="eager"
        />
      </section>
    </main>
  );
}
