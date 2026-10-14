export type CardReturnContext = {
  href: string;
  label: "Results" | "Pulse" | "Vault" | "Dex" | "Sets" | "Search";
};

const CARD_RETURN_DESTINATIONS = [
  { roots: ["/network"], label: "Pulse" },
  { roots: ["/vault"], label: "Vault" },
  { roots: ["/dex"], label: "Dex" },
  { roots: ["/sets", "/set"], label: "Sets" },
  { roots: ["/explore", "/search", "/compare"], label: "Results" },
] as const;

function matchesRoot(pathname: string, root: string) {
  return pathname === root || pathname.startsWith(`${root}/`);
}

export function getCardReturnContext(value?: string | null): CardReturnContext {
  const href = value?.trim();
  if (!href || !href.startsWith("/") || href.startsWith("//")) {
    return { href: "/explore", label: "Search" };
  }

  const pathname = href.split(/[?#]/, 1)[0] || "/";
  const destination = CARD_RETURN_DESTINATIONS.find(({ roots }) =>
    roots.some((root) => matchesRoot(pathname, root)),
  );

  return destination
    ? { href, label: destination.label }
    : { href: "/explore", label: "Search" };
}

export function addCardReturnPath(cardHref: string, returnPath: string) {
  if (!cardHref.startsWith("/") || cardHref.startsWith("//")) {
    return cardHref;
  }

  const [hrefWithoutHash] = cardHref.split("#", 1);
  const url = new URL(hrefWithoutHash, "https://grookai.invalid");
  if (!matchesRoot(url.pathname, "/card")) {
    return cardHref;
  }

  return addCollectionReturnPath(cardHref, returnPath);
}

const COLLECTION_DETAIL_ROOTS = ["/card", "/vault/card", "/vault/gvvi"] as const;

export function addCollectionReturnPath(targetHref: string, returnPath: string) {
  if (!targetHref.startsWith("/") || targetHref.startsWith("//")) {
    return targetHref;
  }

  const returnContext = getCardReturnContext(returnPath);
  if (returnContext.href === "/explore" && returnPath !== "/explore") {
    return targetHref;
  }

  const [hrefWithoutHash, hash] = targetHref.split("#", 2);
  const url = new URL(hrefWithoutHash, "https://grookai.invalid");
  if (!COLLECTION_DETAIL_ROOTS.some((root) => matchesRoot(url.pathname, root))) {
    return targetHref;
  }

  url.searchParams.set("from", returnContext.href);
  const query = url.searchParams.toString();
  return `${url.pathname}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}
