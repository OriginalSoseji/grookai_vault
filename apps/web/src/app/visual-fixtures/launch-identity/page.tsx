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
import PublicSetsResults from "@/components/sets/PublicSetsResults";

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
            <section aria-label="Set layout preview">
              <Suspense>
                <PublicSetsResults logoEntries={[]} sets={[
                  { code: "sv1", name: "Scarlet & Violet", hero_image_url: "/set-logos/30th.png" },
                  { code: "sv2", name: "A deliberately long set name that wraps onto more than one line", hero_image_url: "/set-logos/me05.png" },
                  { code: "sv3", name: "スターターセット MEGA メガディアンシーex", name_ja: "拡張パック「メガシンフォニア」", hero_image_url: "/set-logos/base1.png" },
                  { code: "sv4", name: "Missing artwork" },
                  { code: "sv5", name: "Broken artwork", hero_image_url: "/set-logos/fixture-unavailable.png" },
                  { code: "sv6", name: "Twilight Masquerade", hero_image_url: "/set-logos/me02.5.png" },
                ].map(set => ({
                  ...set, game_code: "pokemon", card_count: 100, release_year: 2026,
                  normalized_code: set.code, normalized_name: set.name.toLowerCase(), normalized_tokens: [],
                }))} />
              </Suspense>
            </section>
          </div>
        </PageContainer>
      </main>
      <MobileParityDock activeKey="vault" wallHref="/wall" />
    </>
  );
}
