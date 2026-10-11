"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Finish already-requested local journal writes before a navigation unmounts Desk. */
export function useSalesNavigationGuard(pending: () => boolean, flush: () => Promise<boolean>) {
  const router = useRouter();
  useEffect(() => {
    let leaving = false;
    let mounted = true;
    const unload = (event: BeforeUnloadEvent) => { if (pending()) event.preventDefault(); };
    const follow = (event: MouseEvent) => {
      if (!pending() || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const target = new URL(anchor.href, location.href);
      if (!['http:', 'https:'].includes(target.protocol) || target.href === location.href) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (leaving) return;
      leaving = true;
      void flush().then(saved => {
        if (!mounted || !saved) return;
        if (target.origin === location.origin) router.push(target.pathname + target.search + target.hash);
        else location.assign(target.href);
      }).finally(() => { leaving = false; });
    };
    document.addEventListener("click", follow, true);
    window.addEventListener("beforeunload", unload);
    return () => { mounted = false; document.removeEventListener("click", follow, true); window.removeEventListener("beforeunload", unload); };
  }, [pending, flush, router]);
}
