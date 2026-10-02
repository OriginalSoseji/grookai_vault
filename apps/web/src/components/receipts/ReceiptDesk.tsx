"use client";
import { useEffect, useRef } from "react";
import { mountReceiptDesk, type ReceiptDeskOptions } from "@/lib/receipts/receiptDesk.mjs";
import "@/lib/receipts/receiptDesk.css";
export default function ReceiptDesk(options: ReceiptDeskOptions) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) return mountReceiptDesk(ref.current, options); }, [options]);
  return <div ref={ref}><p className="p-6">Loading your device’s receipt book…</p></div>;
}
