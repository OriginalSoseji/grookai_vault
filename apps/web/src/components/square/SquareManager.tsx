'use client';
import Link from 'next/link';
import {useCallback, useEffect, useRef, useState} from 'react';
import s from './SquareManager.module.css';

type Target = {id: string; instanceId: string; selected: boolean; mapped: boolean; errorCode: string | null};
type Connection = {id: string; environment: string; status: string; locationId: string | null; autoSync: boolean; targets: Target[]};
type CommerceConnection = {id:string;autoEnroll:boolean;sellOnSquare:boolean;allocated:number;pending:number;reviews:number;sales:number;refunds:number;
  allocations:Array<{targetId:string;gvvi:string;name:string|null;state:string;quantity:number|null;checkedAt:string}>;
  recentSales:Array<{id:string;saleCents:number;recordedAt:string;returned:boolean;refundReported:boolean}>};
type Workspace = {linkingEnabled: boolean; catalogEnabled: boolean; connections: Connection[];onboarding?:{eligible:boolean;available:boolean};commerce?:{enabled:boolean;connections:CommerceConnection[]}};
type Candidate = {id: string; gv_vi_id: string; name: string | null; condition_label: string | null; asking_price_amount: number;
  card: {name: string; number: string} | {name: string; number: string}[] | null};
type Adoption = {targetId: string; itemId: string; variationId: string; reviewHash: string;
  observed: {name: string; variationName: string; price?: {amount: number; currency: string}}};
async function read<T>(url: string, body?: Record<string, unknown>): Promise<T> {
  try {
    const response = await fetch(url, {cache: 'no-store', signal: AbortSignal.timeout(65000), ...(body ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {})});
    const value = await response.json().catch(() => {throw new Error('The Square result is unconfirmed. Refresh its status before trying again.');});
    if (!response.ok) throw new Error(typeof value.error === 'string' ? value.error : 'Square could not be loaded. Try again.');
    return value as T;
  } catch (error) {
    if (error instanceof TypeError || (error instanceof DOMException && ['AbortError','TimeoutError'].includes(error.name))) {
      throw new Error('Square could not be reached. Refresh its status before trying again. Your saved settings are preserved.');
    }
    throw error;
  }
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
  const inFlight = useRef(false);
  const live = useRef(true);
  useEffect(() => {live.current = true;return () => {live.current = false;};}, []);
  const [loadingLocations, setLoadingLocations] = useState(false), [locationError, setLocationError] = useState('');
  const reload = useCallback(async () => {const value = await read<Workspace>('/api/square'); setWorkspace(value); return value;}, []);
  useEffect(() => {void reload().then(value => {
    const current=value.connections.find(row=>row.status==='connected' && row.environment==='production')??value.connections.find(row=>row.status==='connected')??value.connections[0];
    const prefs=value.commerce?.connections.find(row=>row.id===current?.id);
    setAutoEnroll(prefs?.autoEnroll??false);setSellOnSquare(prefs?.sellOnSquare??false);
    if (initialStatus === 'connected' && value.connections.some(row => row.status === 'connected')) setMessage('Square connected. Confirm your location to finish setup.');
    else if (initialStatus) setError('The Square connection was not completed. You can connect again.');
  }).catch(err => setError(err.message));}, [reload, initialStatus]);
  const connection = workspace?.connections.find(row => row.id === connectionId) ?? workspace?.connections.find(row => row.status === 'connected' && row.environment === 'production') ?? workspace?.connections.find(row => row.status === 'connected') ?? workspace?.connections[0];
  const commerce=workspace?.commerce?.connections.find(row=>row.id===connection?.id);
  const ready = connection?.status === 'connected' && !!connection.locationId && connection.autoSync && commerce?.autoEnroll && commerce.sellOnSquare;
  useEffect(() => {
    let active = true;
    setLocations([]); setLocationId(''); setLocationError('');
    setAutoSync(connection?.autoSync ?? false);
    if (connection?.status !== 'connected') {setLoadingLocations(false); return;}
    setLoadingLocations(true);
    void read<{locations: Array<{id:string;name:string}>}>('/api/square', {action:'locations',connectionId:connection.id})
      .then(value => {if (!active) return; setLocations(value.locations);
        if(connection.locationId&&!value.locations.some(row=>row.id===connection.locationId))setLocationError('Your saved Square location is unavailable. Check it in Square, then retry here.');
        setLocationId(value.locations.some(row=>row.id===connection.locationId) ? connection.locationId! : !connection.locationId && value.locations.length===1 ? value.locations[0].id : '');})
      .catch(() => {if (active) setLocationError('Could not load Square locations. Try again.');})
      .finally(() => {if (active) setLoadingLocations(false);});
    return () => {active = false;};
  }, [connection]);
  useEffect(() => {setAutoEnroll(commerce?.autoEnroll??false);setSellOnSquare(commerce?.sellOnSquare??false);}, [commerce]);
  const run = async (task: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(''); setMessage('');
    try {await task();} catch (err) {if(live.current)setError(err instanceof Error ? err.message : 'Square could not be updated.');}
    finally {inFlight.current = false;if(live.current)setBusy(false);}
  };
  const connectSquare = async () => {
    setMessage('Opening Square sign-in…');
    const value = await read<{launchUrl: string}>('/api/square', {action: 'link'});
    if (!live.current) return;
    const launch = new URL(value.launchUrl);
    if (launch.origin !== window.location.origin || launch.pathname !== '/api/square/oauth/launch' || launch.username || launch.password || launch.hash) throw new Error('Square sign-in is unavailable. Try again.');
    window.location.assign(launch.href);
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
    <h1>{connection?.status === 'connected' ? 'Square' : connection?.status === 'reconnect_required' ? 'Reconnect Square' : 'Connect Square'}</h1>
    <p className={s.muted}>Connect once. Add a public For sale card in grookai, and its item, artwork and price sync to Square. Use the same grookai QR on a phone or at your register.</p>
    {error && <p className={`${s.status} ${s.error}`} role="alert">{error}</p>}
    <p className={s.status} role="status" aria-live="polite">{message || (connection?.status === 'reconnect_required' ? 'Reconnect your Square account to continue. Your cards and settings are saved.' : connection?.status === 'connected' && connection.locationId
      ? connection.autoSync && workspace?.catalogEnabled && workspace.commerce?.enabled && commerce?.autoEnroll && commerce.sellOnSquare ? 'Automatic sync is on. Add a card in grookai and set its sale price; no manual Square item entry is needed.' : 'Square is connected. Review automatic stock settings below.'
      : workspace ? 'Choose your Square account and location to begin.' : 'Loading Square connection…')}</p>
    {workspace && <section className={s.section} aria-label="Square connection">
      {!workspace.linkingEnabled && <p className={s.muted}>{workspace.onboarding?.eligible === false
        ? 'Square selling requires an active vendor plan with vendor tools.' : 'Square connections are temporarily unavailable. Try again later.'}</p>}
      {workspace.connections.length > 1 && <label className={s.field}>Connection<select value={connection?.id ?? ''} disabled={busy} onChange={event => {setConnectionId(event.target.value); setLocations([]); setLocationId('');}}>
        {workspace.connections.map(row => <option key={row.id} value={row.id}>{row.environment} · {row.status}</option>)}
      </select></label>}
      {connection?.status !== 'connected' && <>
      <p>Sign in to your Square seller account and approve grookai. You do not need a Square developer account.</p>
      <ol className={s.steps}><li>Connect your Square account</li><li>Confirm your location</li><li>Enable automatic Square sales</li></ol>
      <div className={s.actions}>
        <button className={`${s.button} ${s.primary}`} disabled={busy || !workspace.linkingEnabled} onClick={() => void run(connectSquare)}>{busy ? 'Opening Square…' : connection?.status === 'reconnect_required' ? 'Reconnect Square' : 'Connect Square'}</button>
      </div></>}
      {connection?.status === 'connected' && <>
        <h2>{ready ? 'Automatic Square sales are on' : 'Finish Square setup'}</h2>
        {!ready && <>
          <p>Enable automatic sync for your current and future public For sale cards with a USD price. Each physical card is reserved for Square until sold or safely removed. Private cards stay private.</p>
          {loadingLocations && <p role="status">Loading your Square locations…</p>}
          {locationError && <p role="alert">{locationError}</p>}
          {!loadingLocations && !locationError && !locations.length && <p>No active USD location was found. Finish setting up a location in your Square Dashboard, then retry here.</p>}
          {!loadingLocations && (locationError || !locations.length) && <button className={s.button} disabled={busy} onClick={()=>void run(async()=>{await reload();})}>Retry locations</button>}
        {locations.length > 0 && <>
          <label className={s.field}>Square location<select value={locationId} disabled={busy} onChange={event => setLocationId(event.target.value)}>
            <option value="" disabled>Choose a location</option>
            {locations.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select></label>
        </>}
          <div className={s.actions}><button className={`${s.button} ${s.primary}`} disabled={busy || loadingLocations || !locationId || !!locationError || !workspace.catalogEnabled || !workspace.commerce?.enabled} onClick={()=>void run(async()=>{
            await read('/api/square',{action:'configure',connectionId:connection.id,locationId,autoSync:true});
            await read('/api/square',{action:'preferences',connectionId:connection.id,autoEnroll:true,sellOnSquare:true,confirmed:true});
            await reload();setMessage('Automatic Square sales enabled. Eligible cards sync in the background. Check Ready in Square before checkout.');
          })}>{busy ? 'Saving Square setup…' : 'Enable automatic Square sales'}</button></div>
        </>}
        {ready && <p>Add your next card in grookai, mark it Public / For sale, and set its price. Once it is Ready in Square, scan its grookai QR to sell it.</p>}
        {ready && locationError && <><p role="alert">{locationError}</p><button className={s.button} disabled={busy} onClick={()=>void run(async()=>{await reload();})}>Retry locations</button></>}
        <details className={s.details}><summary>Connection settings</summary>
          <div className={s.actions}>
            <button className={s.button} disabled={busy||!workspace.linkingEnabled} onClick={()=>void run(connectSquare)}>Reconnect Square</button>
            <button className={s.button} disabled={busy} onClick={()=>void run(async()=>{await read('/api/square',{action:'pause',connectionId:connection.id});await reload();setMessage('Automatic sync paused.');})}>Pause automatic sync</button>
            <button className={s.button} disabled={busy} onClick={()=>void run(async()=>{if(!window.confirm('Disconnect Square? Existing items and unresolved stock claims remain protected.'))return;await read('/api/square',{action:'disconnect',connectionId:connection.id});await reload();})}>Disconnect Square</button>
          </div>
          <p className={s.muted}>Automatic catalog updates: {connection.autoSync ? 'on for selected cards' : 'off'}.</p>
          <label className={s.field}>Square location<select value={locationId} disabled={busy||loadingLocations} onChange={event=>setLocationId(event.target.value)}><option value="" disabled>Choose a location</option>{locations.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          <label className={s.check}><input type="checkbox" checked={autoSync} disabled={busy} onChange={event=>setAutoSync(event.target.checked)}/>Keep names, conditions and asking prices updated automatically.</label>
          <button className={s.button} disabled={busy||!locationId||loadingLocations||!!locationError} onClick={()=>void run(async()=>{await read('/api/square',{action:'configure',connectionId:connection.id,locationId,autoSync});await reload();setMessage('Square location and update preference saved.');})}>Save connection settings</button>
        </details>
      </>}
    </section>}
    {connection?.status==='connected'&&connection.locationId&&workspace?.commerce?.enabled&&<section className={s.section} aria-label="Automatic Square stock and sales">
      <h2>Square stock and sales</h2>
      <p className={s.muted}>{commerce?.allocated??0} ready in Square · {commerce?.pending??0} pending · {commerce?.reviews??0} need review</p>
      <p className={s.muted}>{commerce?.sales??0} recorded Square sales · {commerce?.refunds??0} refunds reported</p>
      <details className={s.details}><summary>Automatic sync settings</summary>
      <label className={s.check}><input type="checkbox" checked={autoEnroll} disabled={busy} onChange={event=>setAutoEnroll(event.target.checked)}/>
        Include current and future public For sale cards automatically. Private collection cards stay private.</label>
      <label className={s.check}><input type="checkbox" checked={sellOnSquare} disabled={busy} onChange={event=>setSellOnSquare(event.target.checked)}/>
        Assign these physical cards to Square so they can be sold there. Other grookai sales channels cannot claim the same cards.</label>
      <button className={`${s.button} ${s.primary}`} disabled={busy} onClick={()=>void run(async()=>{
        await read('/api/square',{action:'preferences',connectionId:connection.id,autoEnroll,sellOnSquare,confirmed:true});await processConnection();
      })}>Save automatic sync settings</button>
      </details>
      <div className={s.actions}><button className={s.button} disabled={busy} onClick={()=>void run(processConnection)}>Sync pending cards</button>
        <button className={s.button} disabled={busy} onClick={()=>void run(async()=>{await read('/api/square',{action:'reconcile',connectionId:connection.id});await reload();setMessage('Square sales checked.');})}>Check Square sales</button></div>
      <p className={s.muted}>Your grookai QR stays the same. Ready means the item and its allocated unit were confirmed in Square. Square processes payments; completed sales update your Vault history. Refunds require confirmation that the physical card is back before restocking.</p>
      <details className={s.details}><summary>Stock and sale details</summary>
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
      </details>
    </section>}
    {connection?.status === 'connected' && workspace?.catalogEnabled && connection.locationId && <details className={s.details}><summary>Sync individual cards</summary><section className={s.section} aria-label="Choose cards">
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
    </section></details>}
  </div>;
}
