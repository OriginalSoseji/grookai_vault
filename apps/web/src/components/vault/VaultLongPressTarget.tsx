"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function VaultLongPressTarget(
  { cardPrintId, children }: { cardPrintId: string; children: ReactNode },
) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const held = useRef(false);
  function cancel() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return (
    <div
      className="h-full"
      onPointerDown={(event) => {
        if (
          event.button !== 0 ||
          (event.target as HTMLElement).closest("button,input,select,textarea")
        ) return;
        cancel();
        held.current = false;
        origin.current = { x: event.clientX, y: event.clientY };
        timer.current = setTimeout(() => {
          held.current = true;
          router.push(
            `/vault/workspace?card=${encodeURIComponent(cardPrintId)}`,
          );
        }, 550);
      }}
      onPointerMove={(event) => {
        if (
          Math.hypot(
            event.clientX - origin.current.x,
            event.clientY - origin.current.y,
          ) > 10
        ) cancel();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onClickCapture={(event) => {
        if (held.current) {
          event.preventDefault();
          event.stopPropagation();
          held.current = false;
        }
      }}
    >
      {children}
    </div>
  );
}
