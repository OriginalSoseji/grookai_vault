"use client";
import { useState } from "react";
import Link from "next/link";
import { storeRequest } from "./storeManagerClient";
import s from "./StoreTeam.module.css";
export default function StoreTeamAccept({ token }: { token: string }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [store, setStore] = useState("");
  return <div className={s.page}><h1>Store manager invitation</h1><p>Accept using the account with the verified email the store owner invited. The invitation expires after seven days.</p>{error && <p role="alert" className={s.error}>{error}</p>}{store ? <><p role="status">Invitation accepted.</p><Link className={s.link} href={`/account/store/managed/${store}`}>Open store workspace</Link></> : <button disabled={busy || !token} onClick={async () => { setBusy(true); setError(""); try { const result = await storeRequest<{ store_id: string }>("/api/stores/team/accept", { token }); setStore(result.store_id); window.history.replaceState(null, "", "/account/store/team/accept"); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>{busy ? "Accepting…" : "Accept invitation"}</button>}</div>;
}
