"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import styles from "./MobileParityDock.module.css";

// Floating actions share the dock's actual occupied space, including safe areas
// and enlarged text. Hidden/unmounted docks reserve no space on pushed routes.
export function MobileDockFrame({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const root = document.documentElement;
    const updateHeight = () => {
      root.style.setProperty("--gv-bottom-dock-height", `${frame.getBoundingClientRect().height}px`);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(frame);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--gv-bottom-dock-height");
    };
  }, []);

  return <div ref={frameRef} className={styles.frame}>{children}</div>;
}
