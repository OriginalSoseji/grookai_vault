"use client";

import { useEffect, useRef, useState } from "react";
import CollectorCardContext from "@/components/cards/CollectorCardContext";
import { supabase } from "@/lib/supabaseClient";

export type MarketplaceLink = {
  card_print_id: string;
  card_printing_id: string;
  finish: string;
  language: string;
  conditions: { code: string; label: string; url: string }[];
};
type CardContext = {
  identity: string;
  imageUrl?: string | null;
  context?: string;
  condition?: string | null;
};

/** Presentation is shared with the explicitly local, sample-data preview. */
export function MarketplaceConditionChooser(
  { link, identity, imageUrl, context, condition, status, onRetry }:
    & CardContext
    & {
      link: MarketplaceLink | null;
      status?: string;
      onRetry?: () => void;
    },
) {
  const dialog = useRef<HTMLDialogElement>(null);
  const matching = link?.conditions.find((item) =>
    item.code === condition?.toUpperCase()
  );
  return (
    <section className="gv-marketplace-action" aria-label="Marketplaces">
      {matching
        ? (
          <a
            className="gv-exact-condition-link"
            href={matching.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View {matching.code} on TCGplayer <span aria-hidden>↗</span>
          </a>
        )
        : null}
      <button
        type="button"
        className="gv-secondary-button gv-marketplace-trigger"
        disabled={!link}
        aria-label="TCGplayer · choose condition"
        onClick={() => dialog.current?.showModal()}
      >
        <span>TCGplayer</span>
        <span aria-hidden>↗</span>
      </button>
      {status
        ? (
          <p className="gv-marketplace-status" role="status">
            {status} {onRetry
              ? <button type="button" onClick={onRetry}>Retry</button>
              : null}
          </p>
        )
        : null}
      <dialog
        ref={dialog}
        className="gv-collector-sheet"
        aria-label="TCGplayer listings"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="gv-sheet-handle" />
        <div className="gv-sheet-heading">
          <h2>Open TCGplayer</h2>
          <button
            type="button"
            autoFocus
            aria-label="Close marketplace conditions"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        <CollectorCardContext
          name={identity}
          context={[context, link?.finish, link?.language].filter(Boolean).join(
            " · ",
          )}
          imageUrl={imageUrl}
        />
        <div className="gv-condition-rows">
          {link?.conditions.map((item) => (
            <a
              key={item.code}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="gv-condition-row"
              data-selected={item.code === condition?.toUpperCase() ||
                undefined}
            >
              <span className="gv-condition-code">{item.code}</span>
              <span className="gv-condition-name">{item.label}</span>
              <svg
                aria-hidden
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path d="M14 4h6v6M20 4l-9 9M10 5H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-5" />
              </svg>
            </a>
          ))}
        </div>
        <p className="gv-sheet-footnote">
          Opens this printing and condition on TCGplayer.
        </p>
      </dialog>
    </section>
  );
}

export default function CardMarketplaceLinks(
  { cardPrintId, cardPrintingId, ...context }: CardContext & {
    cardPrintId: string;
    cardPrintingId?: string | null;
  },
) {
  const [result, setResult] = useState<
    { key: string; link: MarketplaceLink | null; error?: boolean } | null
  >(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${cardPrintId}:${cardPrintingId ?? ""}:${attempt}`;
  useEffect(() => {
    if (!cardPrintingId) return;
    let active = true;
    void supabase.functions.invoke("card-marketplace-links-v1", {
      body: { card_print_id: cardPrintId, card_printing_id: cardPrintingId },
    }).then(({ data, error }) => {
      if (!active) return;
      const link = data?.link as MarketplaceLink | null;
      setResult({
        key,
        link: link?.card_print_id === cardPrintId &&
            link?.card_printing_id === cardPrintingId
          ? link
          : null,
        error: Boolean(error),
      });
    }).catch(() => {
      if (active) setResult({ key, link: null, error: true });
    });
    return () => {
      active = false;
    };
  }, [cardPrintId, cardPrintingId, key]);
  const current = result?.key === key ? result : null;
  return (
    <MarketplaceConditionChooser
      {...context}
      link={current?.link ?? null}
      status={!cardPrintingId
        ? "Choose a printing to view listings."
        : !current
        ? "Finding matching listings…"
        : current.error
        ? "Listings couldn’t load."
        : !current.link
        ? "No exact listing available."
        : undefined}
      onRetry={current?.error
        ? () => setAttempt((value) => value + 1)
        : undefined}
    />
  );
}
