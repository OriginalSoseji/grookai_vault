'use client';
import Link from 'next/link';
import {useCallback, useEffect, useState} from 'react';
import s from './SquareManager.module.css';

type Target = {id: string; instanceId: string; selected: boolean; mapped: boolean; errorCode: string | null};
type Connection = {id: string; environment: string; status: string; locationId: string | null; autoSync: boolean; targets: Target[]};
type CommerceConnection = {id:string;autoEnroll:boolean;sellOnSquare:boolean;allocated:number;pending:number;reviews:number;sales:number;refunds:number;
  allocations:Array<{targetId:string;gvvi:string;name:string|null;state:string;quantity:number|null;checkedAt:string}>;
  recentSales:Array<{id:string;saleCents:number;recordedAt:string;returned:boolean;refundReported:boolean}>};
type Workspace = {linkingEnabled: boolean; catalogEnabled: boolean; connections: Connection[];commerce?:{enabled:boolean;connections:CommerceConnection[]}};
type Candidate = {id: string; gv_vi_id: string; name: string | null; condition_label: string | null; asking_price_amount: number;
  card: {name: string; number: string} | {name: string; number: string}[] | null};
type Adoption = {targetId: string; itemId: string; variationId: string; reviewHash: string;
  observed: {name: string; variationName: string; price?: {amount: number; currency: string}}};
async function read<T>(url: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {cache: 'no-store', ...(body ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {})});
  const value = await response.json();
  if (!response.ok) throw new Error(typeof value.error === 'string' ? value.error : 'Square could not be loaded. Try again.');
  return value as T;
}
const money = (amount: number, currency = 'USD') => new Intl.NumberFormat('en-US', {style: 'currency', currency}).format(amount);
export default function SquareManager({initialStatus}: {initialStatus?: 'connected' | 'reconnect_required'}) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [rows, setRows] = useState<Candidate[]>([]), [nextOffset, setNextOffset] = useState<number | null>(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [connectionId, setConnectionId] = useState(''), [locations, setLocations] = useState<Array<{id: string; name: string}>>([]);
  const [locationId, setLocationId] = useState(''), [autoSync, setAutoSync] = useState(false);
  const [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(''), [error, setError] = useState('');
  const [adoptions, setAdoptions] = useState<Adoption[]>([]);
  const [autoEnroll,setAutoEnroll]=useState(false),[sellOnSquare,setSellOnSquare]=useState(false);
  const [releaseConfirmed,setReleaseConfirmed]=useState<Set<string>>(new Set());
  const reload = useCallback(async () => {const value = await read<Workspace>('/api/square'); setWorkspace(value); return value;}, []);
  useEffect(() => {void reload().then(value => {
    const current=value.connections.find(row=>row.status==='connected')??value.connections[0];
    const prefs=value.commerce?.connections.find(row=>row.id===current?.id);
    setAutoEnroll(prefs?.autoEnroll??false);setSellOnSquare(prefs?.sellOnSquare??false);
    if (initialStatus === 'connected' && value.connections.some(row => row.status === 'connected')) setMessage('Square connected. Choose a location and the cards to sync.');
    else if (initialStatus) setError('The Square connection was not completed. You can connect again.');
  }).catch(err => setError(err.message));}, [reload, initialStatus]);
  const connection = workspace?.connections.find(row => row.id === connectionId) ?? workspace?.connections.find(row => row.status === 'connected') ?? workspace?.connections[0];
  const commerce=workspace?.commerce?.connections.find(row=>row.id===connection?.id);
  const run = async (task: () => Promise<void>) => {
    setBusy(true); setError(''); setMessage('');
    try {await task();} catch (err) {setError(err instanceof Error ? err.message : 'Square could not be updated.');}
    finally {setBusy(false);}
  };
  const loadCards = async () => {
    if (nextOffset === null) return;
    const data = await read<{rows: Candidate[]; nextOffset: number | null}>(`/api/square/candidates?offset=${nextOffset}`);
    setRows(current => [...current, ...data.rows]); setNextOffset(data.nextOffset);
  };
  const batchSync = async () => {
    if (!connection || !confirmed || !selected.size) throw new Error('Select cards and confirm the catalog sync first.');
    await read('/api/square', {action: 'select', connectionId: connection.id, instanceIds: [...selected], confirmed: true});
    const state = await reload(), current = state.connections.find(row => row.id === connection.id);
    const targets = current?.targets.filter(target => selected.has(target.instanceId)) ?? [];
    let complete = 0; const reviews: Adoption[] = []; const failures: string[] = [];
    for (const target of targets) {
      setMessage(`Syncing ${complete + 1} of ${targets.length} cards…`);
      try {
        const result = await read<{status: string} & Omit<Adoption, 'targetId'>>('/api/square', {
          action: 'sync', connectionId: connection.id, targetId: target.id, requestId: crypto.randomUUID()});
        if (result.status === 'adoption_required') reviews.push({...result, targetId: target.id});
      } catch (err) {failures.push(err instanceof Error ? err.message : 'A card could not sync.');}
      complete++;
    }
    setAdoptions(reviews); await reload();
    setMessage(`${complete - failures.length - reviews.length} cards synced or already current. ${reviews.length} existing items need confirmation.`);
    if (failures.length) setError(`${failures.length} cards need attention. ${failures[0]}`);
  };
  const processConnection=async()=>{
    if(!connection)return;
    const result=await read<{succeeded:number;failed:number;reviews:number;adoptions:Adoption[]}>('/api/square',{action:'process',connectionId:connection.id});
    setAdoptions(current=>[...current.filter(row=>!result.adoptions.some(value=>value.targetId===row.targetId)),...result.adoptions]);
    await reload();setMessage(`${result.succeeded} cards checked. ${result.reviews} need confirmation. More saved cards continue in the background.`);
    if(result.failed)setError('Some cards need attention. Check their saved Square status before selling.');
  };
  return <div className={s.page} aria-busy={busy}>
    <Link href="/account" className={s.muted}>Back to account</Link>
    <h1>Connect Square</h1>
    <p className={s.muted}>Create your Square items from selected grookai cards. Your existing grookai QR opens the card page on a phone and finds the item in Square.</p>
    {error && <p className={`${s.status} ${s.error}`} role="alert">{error}</p>}
    <p className={s.status} role="status" aria-live="polite">{message || (workspace ? 'Choose your Square account and cards to begin.' : 'Loading Square connection…')}</p>
    {workspace && <section className={s.section} aria-label="Square connection">
      {!workspace.linkingEnabled && <p className={s.muted}>Square connection is not available for this account yet.</p>}
      {workspace.connections.length > 1 && <label className={s.field}>Connection<select value={connection?.id ?? ''} disabled={busy} onChange={event => {setConnectionId(event.target.value); setLocations([]); setLocationId('');}}>
        {workspace.connections.map(row => <option key={row.id} value={row.id}>{row.environment} · {row.status}</option>)}
      </select></label>}
      <div className={s.actions}>
        <button className={`${s.button} ${s.primary}`} disabled={busy || !workspace.linkingEnabled} onClick={() => void run(async () => {
          const value = await read<{launchUrl: string}>('/api/square', {action: 'link'}); window.location.assign(value.launchUrl);
        })}>{connection?.status === 'connected' ? 'Reconnect Square' : 'Connect Square account'}</button>
        {connection && <button className={s.button} disabled={busy} onClick={() => void run(async () => {await read('/api/square', {action: 'pause', connectionId: connection.id}); await reload(); setMessage('Automatic catalog sync paused.');})}>Pause automatic sync</button>}
        {connection && <button className={s.button} disabled={busy} onClick={() => void run(async () => {await read('/api/square', {action: 'disconnect', connectionId: connection.id}); await reload(); setMessage('Square disconnected. Existing items remain in Square.');})}>Disconnect</button>}
      </div>
      {connection?.status === 'connected' && <>
        <h2>Location and updates</h2>
        <p className={s.muted}>Automatic catalog updates: {connection.autoSync ? 'on for selected cards' : 'off'}.</p>
        <p className={s.muted}>{connection.locationId ? 'A Square location is saved for these cards.' : 'Choose the active Square location for these cards.'}</p>
        <button className={s.button} disabled={busy || !workspace.catalogEnabled} onClick={() => void run(async () => {
          const result = await read<{locations: Array<{id: string; name: string}>}>('/api/square', {action: 'locations', connectionId: connection.id});
          setLocations(result.locations); setLocationId(connection.locationId ?? result.locations[0]?.id ?? ''); setAutoSync(connection.autoSync);
        })}>Load Square locations</button>
        {locations.length > 0 && <>
          <label className={s.field}>Square location<select value={locationId} disabled={busy} onChange={event => setLocationId(event.target.value)}>
            {locations.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select></label>
          <label className={s.check}><input type="checkbox" checked={autoSync} disabled={busy} onChange={event => setAutoSync(event.target.checked)} />Keep the selected cards’ names, conditions and asking prices updated automatically.</label>
          <button className={s.button} disabled={busy || !locationId} onClick={() => void run(async () => {
            await read('/api/square', {action: 'configure', connectionId: connection.id, locationId, autoSync}); await reload(); setMessage('Square location and update preference saved.');
          })}>Save location and updates</button>
        </>}
      </>}
    </section>}
    {connection?.status==='connected'&&connection.locationId&&workspace?.commerce?.enabled&&<section className={s.section} aria-label="Automatic Square stock and sales">
      <h2>Automatic stock and sales</h2>
      <label className={s.check}><input type="checkbox" checked={autoEnroll} disabled={busy} onChange={event=>setAutoEnroll(event.target.checked)}/>
        Include current and future public For sale cards automatically. Private collection cards stay private.</label>
      <label className={s.check}><input type="checkbox" checked={sellOnSquare} disabled={busy} onChange={event=>setSellOnSquare(event.target.checked)}/>
        Assign these physical cards to Square so they can be sold there. Other grookai sales channels cannot claim the same cards.</label>
      <button className={`${s.button} ${s.primary}`} disabled={busy} onClick={()=>void run(async()=>{
        await read('/api/square',{action:'preferences',connectionId:connection.id,autoEnroll,sellOnSquare,confirmed:true});await processConnection();
      })}>Save automatic sync settings</button>
      <p className={s.muted}>{commerce?.allocated??0} ready in Square · {commerce?.pending??0} pending · {commerce?.reviews??0} need review</p>
      <p className={s.muted}>{commerce?.sales??0} recorded Square sales · {commerce?.refunds??0} refunds reported</p>
      <div className={s.actions}><button className={s.button} disabled={busy} onClick={()=>void run(processConnection)}>Sync pending cards</button>
        <button className={s.button} disabled={busy} onClick={()=>void run(async()=>{await read('/api/square',{action:'reconcile',connectionId:connection.id});await reload();setMessage('Square sales checked.');})}>Check Square sales</button></div>
      <p className={s.muted}>Your grookai QR stays the same. Ready means the item and its allocated unit were confirmed in Square. Square processes payments; completed sales update your Vault history. Refunds require confirmation that the physical card is back before restocking.</p>
      {commerce?.allocations.map(row=><div className={s.review} key={row.targetId}>
        <strong>{row.name??row.gvvi}</strong><p className={s.muted}>{row.gvvi} · {row.state==='active'?'Ready in Square':row.state==='review'?'Needs review':'Stock update pending'}</p>
        <button className={s.button} disabled={busy} onClick={()=>void run(async()=>{
          await read('/api/square',{action:'withdraw',connectionId:connection.id,targetId:row.targetId});await reload();setMessage('Square stock checked and withdrawn. Confirm the physical card before releasing its claim.');
        })}>Remove from Square stock</button>
        {row.state==='review'&&row.quantity===0&&<>
          <label className={s.check}><input type="checkbox" checked={releaseConfirmed.has(row.targetId)} disabled={busy} onChange={event=>setReleaseConfirmed(current=>{
            const value=new Set(current);if(event.target.checked)value.add(row.targetId);else value.delete(row.targetId);return value;
          })}/>The Square register is online, and I still have this physical card.</label>
          <button className={s.button} disabled={busy||!releaseConfirmed.has(row.targetId)} onClick={()=>void run(async()=>{
            await read('/api/square',{action:'releaseStock',connectionId:connection.id,targetId:row.targetId,confirmed:true,physicalCopyPresent:true,registerOnline:true});await reload();setMessage('The card is available outside Square again.');
          })}>Confirm stock release</button>
        </>}
      </div>)}
      {commerce?.recentSales.map(sale=><div className={s.row} key={sale.id}><div><strong>Square sale · {money(sale.saleCents/100)}</strong>
        <p className={s.muted}>{sale.returned?'Returned to Vault with a new QR':sale.refundReported?'Refund reported. Confirm physical return before restocking.':'Recorded in Vault history'}</p></div>
        {sale.refundReported&&!sale.returned&&<button className={s.button} disabled={busy} onClick={()=>void run(async()=>{
          if(!window.confirm('Confirm you have the physical card back. Its original sale stays in history. The returned card gets a new grookai QR and starts private in your Vault.'))return;
          await read('/api/square',{action:'return',connectionId:connection.id,saleId:sale.id,confirmed:true});await reload();setMessage('Returned card received privately in your Vault.');
        })}>Receive returned card</button>}
      </div>)}
    </section>}
    {connection?.status === 'connected' && workspace?.catalogEnabled && connection.locationId && <section className={s.section} aria-label="Choose cards">
      <h2>Choose cards</h2><p className={s.muted}>Only active public vendor offers with verified printings can sync. This selection updates catalog details. Enable Square stock above to allocate sellable units and reconcile sales. Review your Square tax settings before selling.</p>
      {rows.length === 0 && <button className={s.button} disabled={busy} onClick={() => void run(loadCards)}>Load priced cards</button>}
      {rows.length > 0 && <div className={s.actions}>
        <button className={s.button} disabled={busy || rows.length > 1000} onClick={() => setSelected(new Set(rows.map(row => row.id)))}>Select all loaded cards</button>
        <button className={s.button} disabled={busy || !selected.size} onClick={() => setSelected(new Set())}>Clear selection</button>
      </div>}
      <div className={s.rows}>{rows.map(row => {
        const card = Array.isArray(row.card) ? row.card[0] : row.card;
        return <div className={s.row} key={row.id}><label className={s.check}><input type="checkbox" checked={selected.has(row.id)} disabled={busy}
          onChange={event => setSelected(current => {const next = new Set(current); if (event.target.checked) next.add(row.id); else next.delete(row.id); return next;})} />
          <span><strong>{card?.name ?? row.name ?? row.gv_vi_id}{card?.number ? ` #${card.number}` : ''}</strong><small>{row.condition_label ?? 'Condition unspecified'} · {row.gv_vi_id}</small></span></label>
          <span className={s.price}>{money(Number(row.asking_price_amount))}</span></div>;
      })}</div>
      {rows.length > 0 && nextOffset !== null && <button className={s.button} disabled={busy} onClick={() => void run(loadCards)}>Load more cards</button>}
      <label className={s.check}><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />Create or update these selected items in my Square catalog using their grookai QR links.</label>
      <div className={s.actions}><button className={`${s.button} ${s.primary}`} disabled={busy || !selected.size || !confirmed} onClick={() => void run(batchSync)}>Sync {selected.size || ''} selected {selected.size === 1 ? 'card' : 'cards'}</button>
        <button className={s.button} disabled={busy || !selected.size} onClick={() => void run(async () => {await read('/api/square', {action: 'deselect', connectionId: connection.id, instanceIds: [...selected]}); await reload(); setMessage('Selected cards removed from ongoing sync.');})}>Remove selection from sync</button></div>
      {adoptions.map(review => <div className={s.review} key={review.targetId}><h2>Link existing Square item</h2>
        <p>{review.observed.name} · {review.observed.variationName}</p><p className={s.price}>{review.observed.price && /^[A-Z]{3}$/.test(review.observed.price.currency)
          ? money(review.observed.price.amount / 100, review.observed.price.currency) : 'Variable or unspecified price'}</p>
        <p className={s.muted}>This existing item uses the same grookai QR. Link it to keep one Square item for this copy.</p>
        <button className={s.button} disabled={busy} onClick={() => void run(async () => {await read('/api/square', {action: 'adopt', connectionId: connection.id,
          targetId: review.targetId, itemId: review.itemId, variationId: review.variationId, expectedReviewHash: review.reviewHash, requestId: crypto.randomUUID(), confirmed: true});
          setAdoptions(current => current.filter(row => row.targetId !== review.targetId)); await reload(); setMessage('Existing item linked. Sync selected cards to apply current grookai details.');})}>Confirm and link existing item</button>
      </div>)}
      {connection.targets.some(target => target.errorCode) && <p className={s.muted}>Some saved cards need attention. Sync the affected cards again to review their current status.</p>}
    </section>}
  </div>;
}
