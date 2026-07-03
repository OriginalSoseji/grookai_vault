"use client";

import { useEffect } from "react";

type CardPagePerformanceProbeProps = {
  enabled: boolean;
  gvId: string;
  serverInitialRenderMs: number;
  serverCardLookupMs: number;
  serverAuthMs: number;
  serverSignedInDataMs: number;
  serverPricingMs: number;
  hasAuthCookie: boolean;
  isAuthenticated: boolean;
};

function roundMs(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(value * 10) / 10
    : undefined;
}

function getNavigationTiming() {
  const navigation = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (!navigation) return null;

  return {
    domInteractiveMs: roundMs(navigation.domInteractive),
    domContentLoadedMs: roundMs(navigation.domContentLoadedEventEnd),
    loadEventMs: roundMs(navigation.loadEventEnd),
    responseStartMs: roundMs(navigation.responseStart),
    responseEndMs: roundMs(navigation.responseEnd),
    transferSize: navigation.transferSize,
    encodedBodySize: navigation.encodedBodySize,
    decodedBodySize: navigation.decodedBodySize,
  };
}

function getHeroImageTiming() {
  const image = document.querySelector(".gv-card-hero-image-stage img") as
    | HTMLImageElement
    | null;
  if (!image) {
    return { present: false };
  }

  const matchingResource = performance
    .getEntriesByType("resource")
    .filter((entry): entry is PerformanceResourceTiming => {
      const resource = entry as PerformanceResourceTiming;
      return resource.initiatorType === "img" && resource.name === image.currentSrc;
    })[0];

  return {
    present: true,
    complete: image.complete,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    currentSrc: image.currentSrc,
    resourceStartMs: roundMs(matchingResource?.startTime),
    resourceResponseEndMs: roundMs(matchingResource?.responseEnd),
    resourceDurationMs: roundMs(matchingResource?.duration),
    transferSize: matchingResource?.transferSize,
    encodedBodySize: matchingResource?.encodedBodySize,
    decodedBodySize: matchingResource?.decodedBodySize,
  };
}

export default function CardPagePerformanceProbe({
  enabled,
  gvId,
  serverInitialRenderMs,
  serverCardLookupMs,
  serverAuthMs,
  serverSignedInDataMs,
  serverPricingMs,
  hasAuthCookie,
  isAuthenticated,
}: CardPagePerformanceProbeProps) {
  useEffect(() => {
    if (!enabled) return;

    const log = (stage: string, payload: Record<string, unknown>) => {
      console.info("[card-page:browser-perf]", {
        stage,
        gvId,
        ...payload,
      });
    };

    let latestLcp: Record<string, unknown> | null = null;
    let lcpObserver: PerformanceObserver | null = null;

    if (
      typeof PerformanceObserver !== "undefined" &&
      PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint")
    ) {
      lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lcpEntry = entries[entries.length - 1] as
          | (PerformanceEntry & {
              element?: Element;
              size?: number;
              url?: string;
            })
          | undefined;
        if (!lcpEntry) return;

        latestLcp = {
          startTimeMs: roundMs(lcpEntry.startTime),
          size: lcpEntry.size,
          url: lcpEntry.url,
          element:
            lcpEntry.element instanceof HTMLImageElement
              ? "img"
              : lcpEntry.element?.tagName?.toLowerCase(),
        };
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    }

    log("mounted", {
      server: {
        initialRenderMs: serverInitialRenderMs,
        cardLookupMs: serverCardLookupMs,
        authMs: serverAuthMs,
        signedInDataMs: serverSignedInDataMs,
        pricingMs: serverPricingMs,
        hasAuthCookie,
        isAuthenticated,
      },
      navigation: getNavigationTiming(),
      heroImage: getHeroImageTiming(),
    });

    const image = document.querySelector(".gv-card-hero-image-stage img") as
      | HTMLImageElement
      | null;
    const onHeroLoad = () => {
      log("hero_image_load", {
        heroImage: getHeroImageTiming(),
        navigation: getNavigationTiming(),
      });
    };
    const onHeroError = () => {
      log("hero_image_error", {
        heroImage: getHeroImageTiming(),
      });
    };

    if (image && !image.complete) {
      image.addEventListener("load", onHeroLoad, { once: true });
      image.addEventListener("error", onHeroError, { once: true });
    }

    const settledTimer = window.setTimeout(() => {
      log("settled_3000ms", {
        navigation: getNavigationTiming(),
        heroImage: getHeroImageTiming(),
        lcp: latestLcp,
      });
    }, 3000);

    return () => {
      window.clearTimeout(settledTimer);
      lcpObserver?.disconnect();
      image?.removeEventListener("load", onHeroLoad);
      image?.removeEventListener("error", onHeroError);
    };
  }, [
    enabled,
    gvId,
    hasAuthCookie,
    isAuthenticated,
    serverAuthMs,
    serverCardLookupMs,
    serverInitialRenderMs,
    serverPricingMs,
    serverSignedInDataMs,
  ]);

  return null;
}
