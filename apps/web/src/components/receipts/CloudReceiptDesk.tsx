"use client";
import { useEffect, useRef, useState } from "react";
import { openCloudReceiptBook, receiptRpcTransport } from "@/lib/receipts/receiptCloud.mjs";
import { supabase } from "@/lib/supabaseClient";
import { mountReceiptDesk } from "@/lib/receipts/receiptDesk.mjs";
import "@/lib/receipts/receiptDesk.css";

export default function CloudReceiptDesk() {
  const ref = useRef<HTMLDivElement>(null);
  const [error,setError] = useState("");
  const [attempt,setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false; let cleanup: (() => void) | undefined;
    openCloudReceiptBook(receiptRpcTransport(supabase)).then(remote => {
      if (!disposed && ref.current) cleanup = mountReceiptDesk(ref.current, {cloud:remote});
    }).catch(() => { if (!disposed) setError("Your account receipt book could not be loaded. Existing device records are unchanged."); });
    return () => { disposed = true; cleanup?.(); };
  },[attempt]);
  return <>
    {error && <div role="alert" className="mx-auto max-w-6xl p-6"><p>{error}</p><button onClick={() => {setError("");setAttempt(attempt+1);}}>Try again</button></div>}
    <div ref={ref}><p className="p-6">Loading your account receipt book…</p></div>
  </>;
}
