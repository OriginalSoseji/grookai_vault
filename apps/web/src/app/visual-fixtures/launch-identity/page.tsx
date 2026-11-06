import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MobileParityDock } from "@/components/mobileParity/MobileParityDock";
import { PageContainer } from "@/components/layout/PageContainer";
import PageIntro from "@/components/layout/PageIntro";
import PokemonCardGridTile from "@/components/cards/PokemonCardGridTile";
import { POKEMON_CARD_BROWSE_GRID_CLASSNAME } from "@/components/cards/pokemonCardGridLayout";
import { BrandText } from "@/components/brand/BrandText";
import { isLocalVisualParityFixtureMode } from "@/lib/visualParity/fixtureMode";

export const dynamic = "force-dynamic";
export const metadata = { title: "Local launch identity fixture", robots: { index: false, follow: false } };

export default function LaunchIdentityFixture() {
  if (!isLocalVisualParityFixtureMode()) notFound();

  return (
    <>
      <Suspense>
        <SiteHeader isAuthenticated={false} profileHref={null} networkUnreadCount={0} wallAvailability="signed_out" dexEnabled bindersEnabled={false} />
      </Suspense>
      <main className="gv-page-shell gv-mobile-safe-content">
        <PageContainer>
          <div className="gv-page-rhythm">
            <PageIntro title="Your collection" description="Every card. Every copy. Yours." actions={<a href="/explore" className="gv-primary-button">Find a card</a>} />
            <section className="gv-premium-surface p-4" aria-label="Collection summary">
              <BrandText includeVault />
              <p className="gv-body-copy mt-2">A local fixture for typography, surfaces, and controls.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="gv-primary-button" type="button">Primary action</button>
                <button className="gv-secondary-button" type="button">Secondary action</button>
              </div>
            </section>
            <section aria-label="Collection cards" className={POKEMON_CARD_BROWSE_GRID_CLASSNAME}>
              {["Pikachu", "Charizard", "Gardevoir", "Dragonite"].map((name) => (
                <PokemonCardGridTile key={name} title={name} subtitle="Local visual fixture" imageAlt={`${name} artwork unavailable`} imageFallbackLabel="Artwork unavailable" meta="Exact printing" />
              ))}
            </section>
          </div>
        </PageContainer>
      </main>
      <MobileParityDock activeKey="vault" wallHref="/wall" />
    </>
  );
}
