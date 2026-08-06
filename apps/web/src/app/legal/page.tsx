import type { Metadata } from "next";
import InformationPage from "@/components/layout/InformationPage";

export const metadata: Metadata = {
  title: "Terms and Legal | Grookai Vault",
  description:
    "Grookai Vault terms for public collector use, catalog data, Grookai IDs, automated access, and intellectual property notices.",
};

export default function LegalPage() {
  return (
    <InformationPage
      eyebrow="Information"
      title="Terms and Legal"
      description="These terms are provided for immediate public clarity and may be updated after legal counsel review."
    >
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-950">Catalog Data, Grookai IDs, and Automated Access</h2>
          <p>
            Grookai Vault publishes public card pages so collectors can identify, compare, and organize cards for
            personal collector use. Grookai IDs, catalog structure, metadata compilations, card identity organization,
            image associations, and the Grookai identity graph are proprietary Grookai Vault assets.
          </p>
          <p>
            You may view public Grookai Vault pages for personal, non-commercial collector use. Public availability of
            a card page does not grant a license to copy, extract, reproduce, mirror, or compile the underlying
            database, catalog, Grookai IDs, metadata, images, or identity structure.
          </p>
          <p>
            Without prior written permission from Grookai Vault, you may not use automated scraping, crawling,
            harvesting, bulk downloading, dataset creation, mirroring, resale, republication, commercial reuse,
            competitive use, or AI/model training methods to collect or use Grookai Vault catalog data, Grookai IDs,
            metadata, images, card identity organization, or identity graph information.
          </p>
          <p>
            Search engines may crawl public card pages according to Grookai Vault&apos;s robots.txt and sitemap rules.
            This permission is limited to ordinary search indexing and does not authorize bulk extraction, dataset
            creation, commercial data products, AI/model training, or competitor use.
          </p>
          <p>
            Commercial, API, bulk data, research, or data-licensing access requires prior written approval from
            Grookai Vault.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-950">Trademark and Image Notices</h2>
        <p>Pokémon and Pokémon TCG are trademarks of Nintendo, Creatures Inc., and GAME FREAK.</p>
        <p>
          Grookai Vault is an independent collector tool and is not affiliated with, endorsed by, or sponsored by
          The Pokémon Company, Nintendo, Creatures Inc., or GAME FREAK.
        </p>
        <p>
          Card images and artwork are © Pokémon / Nintendo / Creatures / GAME FREAK and are displayed for
          identification and informational purposes only.
        </p>
        <p>
          Card data provided on this site is intended for informational use. While we strive for accuracy, some
          details may occasionally be incomplete or incorrect.
        </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-950">Legal Review</h2>
          <p>
            This page is not legal advice and does not replace attorney review. Grookai Vault may update these terms
            as the product, catalog, and data licensing policies evolve.
          </p>
        </section>
    </InformationPage>
  );
}
