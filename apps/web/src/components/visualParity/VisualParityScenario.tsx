import { MobileParityDock } from "@/components/mobileParity/MobileParityDock";
import type {
  MobileParityScenario,
  MobilePrimaryDockKey,
} from "@/lib/mobileParity/shellManifest";
import styles from "./VisualParityScenario.module.css";

const utilityActions = [
  { label: "Messages", glyph: "M" },
  { label: "Account", glyph: "A" },
  { label: "Menu", glyph: "⋮" },
] as const;

const fixtureCards = [
  { name: "Pikachu", meta: "Illustration Rare · NM", alt: false },
  { name: "Charizard ex", meta: "Special Art · NM", alt: true },
  { name: "Mewtwo", meta: "Promo · LP", alt: false },
  { name: "Umbreon", meta: "Trainer Gallery · NM", alt: true },
  { name: "Eevee", meta: "Reverse Holo · NM", alt: false },
  { name: "Gengar", meta: "Full Art · MP", alt: true },
] as const;

function Icon({ kind }: { kind: "back" | "search" | "share" | "filter" | "grid" }) {
  const pathByKind = {
    back: "M15 18l-6-6 6-6",
    search: "M20 20l-4.4-4.4M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z",
    share: "M8 12l8-6M8 12l8 6M8 12h9",
    filter: "M4 6h16M7 12h10M10 18h4",
    grid: "M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z",
  } as const;

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={styles.iconGlyph} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={pathByKind[kind]} />
    </svg>
  );
}

function AppBar({ title }: { title: string }) {
  return (
    <header className={styles.appBar} data-parity-app-bar>
      <h1 className={styles.appTitle}>{title}</h1>
      <div className={styles.actions}>
        {utilityActions.map((action) => (
          <button key={action.label} type="button" className={styles.iconButton} aria-label={action.label}>
            <span aria-hidden="true">{action.glyph}</span>
          </button>
        ))}
      </div>
    </header>
  );
}

function CardGrid({ density }: { density: "wall" | "vault" }) {
  return (
    <div className={density === "wall" ? styles.wallGrid : styles.vaultGrid} aria-label="Fixture cards">
      {fixtureCards.slice(0, density === "wall" ? 4 : 6).map((card) => (
        <article key={`${density}-${card.name}`} className={styles.card}>
          <div
            className={`${styles.art} ${card.alt ? styles.artAlt : ""}`}
            aria-hidden="true"
            data-parity-card-art
          />
          <h2 className={styles.cardName}>{card.name}</h2>
          <p className={styles.cardMeta}>{card.meta}</p>
        </article>
      ))}
    </div>
  );
}

function RootFrame({
  title,
  activeKey,
  children,
  pulseUnreadCount = 0,
  fixtureRoot = true,
}: {
  title: string;
  activeKey: Exclude<MobilePrimaryDockKey, "scan">;
  children: React.ReactNode;
  pulseUnreadCount?: number;
  fixtureRoot?: boolean;
}) {
  return (
    <div
      className={styles.root}
      {...(fixtureRoot ? { "data-mobile-parity-root": true } : {})}
    >
      <AppBar title={title} />
      <main className={styles.content}>{children}</main>
      <MobileParityDock activeKey={activeKey} pulseUnreadCount={pulseUnreadCount} />
    </div>
  );
}

function PulseEmpty() {
  return (
    <RootFrame title="Pulse" activeKey="pulse" pulseUnreadCount={3}>
      <div className={styles.segments} aria-label="Pulse sections">
        <button type="button" className={`${styles.segment} ${styles.segmentActive}`}>Pulse</button>
        <button type="button" className={styles.segment}>Discover</button>
        <button type="button" className={styles.segment}>Following</button>
      </div>
      <section className={styles.surface}>
        <h2 className={styles.surfaceTitle}>Caught up</h2>
        <p className={styles.surfaceCopy}>Nothing new around your collection right now.</p>
        <button type="button" className={styles.control}>Show older Pulse</button>
      </section>
    </RootFrame>
  );
}

function WallPopulated() {
  return (
    <RootFrame title="Wall" activeKey="wall">
      <section className={styles.profile} aria-label="Collector profile">
        <div className={styles.avatar} aria-hidden="true">GV</div>
        <div>
          <h2 className={styles.profileName}>Fixture Collector</h2>
          <p className={styles.profileMeta}>/u/fixture · 24 followers · 18 following</p>
        </div>
        <button type="button" className={styles.iconButton} aria-label="Share Wall">
          <Icon kind="share" />
        </button>
      </section>
      <div className={styles.sectionRail} aria-label="Wall sections">
        <button type="button" className={`${styles.chip} ${styles.chipActive}`}>Wall 31</button>
        <button type="button" className={styles.chip}>Pikachu 18</button>
        <button type="button" className={styles.chip}>For Trade 3</button>
        <button type="button" className={styles.chip}>Add Section</button>
      </div>
      <CardGrid density="wall" />
    </RootFrame>
  );
}

function BinderActionCard() {
  return (
    <a
      href="/binders"
      className={styles.binderPanel}
      data-parity-feature-gate="binders"
      data-parity-vault-binders
    >
      <span
        className={styles.binderIcon}
        aria-hidden="true"
        data-parity-vault-binders-icon
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={styles.binderGlyph}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5.25 4.75h10.5A2.25 2.25 0 0 1 18 7v12.25H7.5A2.5 2.5 0 0 1 5 16.75V5a.25.25 0 0 1 .25-.25Z" />
          <path d="M7.5 19.25A2.5 2.5 0 0 1 10 16.75h8" />
          <path d="M9 8.5h5" />
        </svg>
      </span>
      <span className={styles.binderText}>
        <span className={styles.binderTitle}>Binders</span>
        <span className={styles.binderCopy}>What you’re building</span>
      </span>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className={styles.binderArrow}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m9 5 7 7-7 7" />
      </svg>
    </a>
  );
}

function VaultPopulated({ bindersEnabled }: { bindersEnabled: boolean }) {
  return (
    <RootFrame title="Vault" activeKey="vault">
      {bindersEnabled ? <BinderActionCard /> : null}
      <section className={styles.valueHero}>
        <p className={styles.eyebrow}>Grookai Value</p>
        <p className={styles.heroValue}>Value pending</p>
        <p className={styles.muted}>24 cards · 18 unique · 6 sets</p>
      </section>
      <label className={styles.searchField}>
        <Icon kind="search" />
        <input readOnly aria-label="Search Vault" placeholder="Search vault · by card, set, or Pokémon" />
      </label>
      <div className={styles.toolbar}>
        <button type="button" className={styles.chip}><Icon kind="filter" /> Filters</button>
        <button type="button" className={styles.chip}><Icon kind="grid" /> Grid view</button>
      </div>
      <CardGrid density="vault" />
    </RootFrame>
  );
}

function SearchDiscovery({ menuOpen = false }: { menuOpen?: boolean }) {
  const page = (
    <RootFrame title="Search" activeKey="search" fixtureRoot={!menuOpen}>
      <label className={styles.searchField}>
        <Icon kind="search" />
        <input readOnly aria-label="Search cards" placeholder="Search cards like a sentence" />
      </label>
      <div className={styles.toolbar}>
        <button type="button" className={styles.chip}><Icon kind="filter" /> Filters</button>
        <button type="button" className={styles.chip}><Icon kind="grid" /> Grid view</button>
      </div>
      <h2 className={styles.sectionTitle}>Trending now</h2>
      <p className={styles.muted}>Search like a sentence. Grookai will translate it into collector filters.</p>
      <div className={styles.queryList}>
        <button type="button" className={styles.query}>Pikachu cards from the original era</button>
        <button type="button" className={styles.query}>Modern illustration rares under $25</button>
        <button type="button" className={styles.query}>Reverse holo cards missing from my Vault</button>
        <button type="button" className={styles.query}>Mega Evolution cards I can add to a Binder</button>
      </div>
    </RootFrame>
  );

  if (!menuOpen) {
    return page;
  }

  const drawerItems = [
    "Nearby",
    "Nearby Map",
    "Grookai Dex",
    "Sets",
    "Compare",
    "Grookai Objects",
    "Binders",
    "Messages",
    "Account",
    "Getting Started",
  ];

  return (
    <div className={styles.root} data-mobile-parity-root>
      <div className={styles.dimmed} aria-hidden="true">{page}</div>
      <div className={styles.drawerBackdrop}>
        <aside className={styles.drawer} aria-label="Collector tools">
          <h1 className={styles.drawerTitle}>Grookai Vault</h1>
          <p className={styles.drawerCopy}>Collector tools</p>
          <nav className={styles.drawerNav} aria-label="Secondary">
            {drawerItems.map((item) => (
              <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} className={styles.drawerLink}>
                <span aria-hidden="true">◇</span>
                <span>{item}</span>
              </a>
            ))}
          </nav>
          <section className={styles.appearance} aria-label="Appearance">
            <p className={styles.appearanceLabel}>Appearance</p>
            <div className={styles.appearanceControl}>
              <span>Auto</span>
              <span>Light</span>
              <span className={styles.appearanceActive}>Dark</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ScanReady() {
  return (
    <main className={styles.scanRoot} data-mobile-parity-root>
      <header className={styles.scanHeader}>
        <a href="/network" className={styles.backButton} aria-label="Back to previous screen">
          <Icon kind="back" />
        </a>
        <h1 className={styles.scanTitle}>Scan</h1>
        <button type="button" className={styles.iconButton} aria-label="Scanner options">⋮</button>
      </header>
      <section className={styles.scanBody} aria-label="Scanner ready">
        <div className={styles.scanGuide} aria-hidden="true" />
        <p className={styles.scanCopy}>Place one card inside the guide</p>
        <p className={styles.scanHint}>Hold steady. Grookai will identify the printing.</p>
        <button type="button" className={styles.shutter} aria-label="Capture card" />
      </section>
    </main>
  );
}

export function VisualParityScenario({
  scenario,
}: {
  scenario: MobileParityScenario;
}) {
  switch (scenario) {
    case "pulse-empty":
      return <PulseEmpty />;
    case "wall-populated":
      return <WallPopulated />;
    case "scan-ready":
      return <ScanReady />;
    case "vault-populated":
      return <VaultPopulated bindersEnabled />;
    case "search-discovery":
      return <SearchDiscovery />;
    case "menu-open":
      return <SearchDiscovery menuOpen />;
  }
}
