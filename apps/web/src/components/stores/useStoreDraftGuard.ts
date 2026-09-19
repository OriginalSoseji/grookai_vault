"use client";

import { useEffect } from "react";

/** Protect an unsaved store form from document exits and shared navigation links. */
export function useStoreDraftGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;

    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const followLink = (event: MouseEvent) => {
      if (
        event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
      ) return;

      const anchor = event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("a[href]")
        : null;
      if (!anchor || anchor.hasAttribute("download") ||
          (anchor.target && anchor.target !== "_self")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (!["http:", "https:"].includes(destination.protocol)) return;
      if (destination.origin === window.location.origin &&
          destination.pathname === window.location.pathname &&
          destination.search === window.location.search) return;

      // Capture before Next's shared-header Link handler changes the route.
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!window.confirm("Discard your unsaved changes and leave the store editor?")) return;

      // A confirmed document navigation avoids both a second unload prompt and
      // a client transition unmounting the editor before the choice is made.
      window.removeEventListener("beforeunload", beforeUnload);
      window.location.assign(destination.href);
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", followLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", followLink, true);
    };
  }, [dirty]);
}
