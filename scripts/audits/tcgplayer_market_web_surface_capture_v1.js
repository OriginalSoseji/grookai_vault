(() => {
  const surfaces = {
    web_card_detail: "price_record",
    web_search: "price_record",
    web_explore: "price_record",
    web_set_grid: "price_record",
    web_compare: "price_record",
    web_private_vault: "vault_total",
    web_public_vault: "price_record",
    web_vault_item: "price_record",
    web_market_history: "price_record",
  };
  const surfaceId = window.prompt(
    `Surface ID:\n${Object.keys(surfaces).join("\n")}`,
  );
  const proofKind = surfaces[surfaceId ?? ""];
  if (!proofKind) {
    throw new Error("A supported web surface ID is required.");
  }

  const selector =
    proofKind === "vault_total"
      ? '[data-pricing-proof="vault-exact-total"][data-vault-market-value-usd]'
      : '[data-pricing-proof="tcgplayer-market"][data-pricing-status="available"]';
  const candidates = [...document.querySelectorAll(selector)].filter(
    (element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    },
  );
  if (!candidates.length) {
    throw new Error(`No visible pricing evidence matched ${selector}.`);
  }

  const element = candidates[0];
  const data = element.dataset;
  const capturedAt = new Date().toISOString();
  const captureId = `${surfaceId}_${capturedAt.replace(/[:.]/g, "-")}`;
  const rendered =
    proofKind === "vault_total"
      ? {
          status: "available",
          vault_market_value_usd: Number(data.vaultMarketValueUsd),
          priced_copy_count: Number(data.pricedCopyCount),
          unpriced_copy_count: Number(data.unpricedCopyCount),
          currency: "USD",
          source_label: data.sourceLabel,
          published_at: data.publishedAt || null,
        }
      : {
          status: data.pricingStatus,
          pricing_scope: data.pricingScope,
          market_close_usd: Number(data.marketCloseUsd),
          currency: data.currency,
          source_label: data.sourceLabel,
          observed_at: data.observedAt,
          published_at: data.publishedAt,
          provenance_id: data.provenanceId,
          is_from_price: data.isFromPrice === "true",
        };
  const evidence = {
    schema_version: "TCGPLAYER_MARKET_PRODUCT_SURFACE_RENDER_EVIDENCE_V1",
    capture_id: captureId,
    surface_id: surfaceId,
    client: "web",
    proof_kind: proofKind,
    authenticated: true,
    route: `${window.location.pathname}${window.location.search}`,
    captured_at: capturedAt,
    card_print_id: data.cardPrintId || null,
    card_printing_id: data.cardPrintingId || null,
    rendered,
    visible_text: element.textContent?.trim() || "",
  };

  const blob = new Blob([`${JSON.stringify(evidence, null, 2)}\n`], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${captureId}.render.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  window.console.info("Grookai pricing evidence captured", evidence);
})();
