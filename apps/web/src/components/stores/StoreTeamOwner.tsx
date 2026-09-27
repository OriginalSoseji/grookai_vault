"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { TEAM_PERMISSIONS, TEAM_PERMISSION_LABELS, type StoreTeam, type TeamPermission } from "@/lib/stores/storeTeam";
import { storeRequest } from "./storeManagerClient";
import s from "./StoreTeam.module.css";

export function PermissionChoices({ value, onChange, disabled = false }: { value: TeamPermission[]; onChange: (value: TeamPermission[]) => void; disabled?: boolean }) {
  return <fieldset className={s.permissions} disabled={disabled}><legend>Allowed actions</legend>{TEAM_PERMISSIONS.map(permission => <label key={permission}><input type="checkbox" checked={value.includes(permission)} onChange={e => onChange(e.target.checked ? [...value, permission] : value.filter(p => p !== permission))} />{TEAM_PERMISSION_LABELS[permission]}</label>)}</fieldset>;
}
function Member({ member, busy, enabled, change }: { member: StoreTeam["members"][number]; busy: boolean; enabled: boolean; change: (body: Record<string, unknown>) => Promise<void> }) {
  const [permissions, setPermissions] = useState(member.permissions);
  return <section className={s.panel}><h2>{member.email}</h2>{member.revoked_at ? <p>Access removed</p> : <><PermissionChoices value={permissions} onChange={setPermissions} disabled={busy || !enabled} /><div className={s.actions}><button disabled={busy || !enabled || !permissions.length} onClick={() => void change({ action: "permissions", subject: member.user_id, permissions })}>Save permissions</button><button disabled={busy} onClick={() => void change({ action: "revoke", subject: member.user_id })}>Remove access</button></div></>}</section>;
}
export default function StoreTeamOwner() {
  const [team, setTeam] = useState<StoreTeam | null>(null);
  const [email, setEmail] = useState(""); const [permissions, setPermissions] = useState<TeamPermission[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [invite, setInvite] = useState("");
  useEffect(() => { let active = true; storeRequest<StoreTeam>("/api/stores/team").then(data => { if (active) setTeam(data); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, []);
  async function change(body: Record<string, unknown>) {
    setBusy(true); setError(""); setNotice("");
    try { const result = await storeRequest<{ url?: string }>("/api/stores/team", body);
      if (result.url) { setInvite(result.url); setEmail(""); setPermissions([]); }
      setNotice(result.url ? "Invitation created. Copy the link below and send it to this person. It expires in seven days." : "Team access updated.");
      setTeam(await storeRequest<StoreTeam>("/api/stores/team"));
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <div className={s.page}><Link className={s.link} href="/account/store">← Store workspace</Link><h1>Your store team</h1><p>Choose exactly what each manager can do. They use their own account and must verify the email you invite.</p><p className={s.muted}>Access covers existing store cards and the actions selected below. Personal held copies, new card intake, custom products and sections are outside this manager workspace. Billing, payouts, store publication, ownership and team access stay with you.</p>
    {error && <p role="alert" className={s.error}>{error}</p>}{notice && <p role="status" className={s.notice}>{notice}</p>}
    {invite && <section className={s.panel}><label>Invitation link<input readOnly value={invite} onFocus={e => e.target.select()} /></label><button onClick={async () => { try { await navigator.clipboard.writeText(invite); setNotice("Invitation link copied."); } catch { setError("Select and copy the invitation link above."); } }}>Copy invitation link</button></section>}
    {!team && !error && <p role="status">Loading team…</p>}
    {team && <>{!team.enabled && <p className={s.notice}>Manager invitations are not enabled yet. You can still remove existing access.</p>}<form className={s.panel} onSubmit={e => { e.preventDefault(); void change({ action: "invite", email, permissions }); }}><h2>Invite a manager</h2><label>Email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} disabled={busy || !team.enabled} /></label><PermissionChoices value={permissions} onChange={setPermissions} disabled={busy || !team.enabled} /><button disabled={busy || !team.enabled || !permissions.length}>Create invitation link</button></form>
      <h2>Managers</h2>{!team.members.length && <p>No managers yet.</p>}{team.members.map(member => <Member key={`${member.user_id}:${member.revoked_at}:${member.permissions.join()}`} member={member} busy={busy} enabled={team.enabled} change={change} />)}
      <h2>Recent invitations</h2>{!team.invites.length && <p>No invitations yet.</p>}{team.invites.map(item => <section className={s.panel} key={item.id}><strong>{item.email}</strong><p>{item.permissions.map(p => TEAM_PERMISSION_LABELS[p]).join(" · ")}</p><p>{item.accepted_at ? "Accepted" : item.revoked_at ? "Cancelled" : new Date(item.expires_at).getTime() <= Date.now() ? "Expired" : `Expires ${new Date(item.expires_at).toLocaleDateString()}`}</p>{!item.accepted_at && !item.revoked_at && <button disabled={busy} onClick={() => void change({ action: "cancel", subject: item.id })}>Cancel invitation</button>}</section>)}</>}
  </div>;
}
