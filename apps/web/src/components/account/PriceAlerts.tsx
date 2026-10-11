"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {supabase} from "@/lib/supabaseClient";
import {createPriceTargetClient,PriceTargetRejected} from "@/lib/notifications/priceTargetClient";
import {priceTargetAmount,type PriceTarget,type PriceTargets,type PriceTargetCatalog,type PriceTargetRequest} from "@/lib/notifications/priceTargets";
import s from "./PriceAlerts.module.css";
type Client = ReturnType<typeof createPriceTargetClient>;
export function PriceAlerts({ownerId}:{ownerId:string}) {
  const [client,setClient]=useState<Client|null>(null),[closed,setClosed]=useState(false);
  const [model,setModel]=useState<PriceTargets|null>(null),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false),[retry,setRetry]=useState(false),[creating,setCreating]=useState(false);
  const [catalog,setCatalog]=useState<PriceTargetCatalog|null>(null),[query,setQuery]=useState(""),[offset,setOffset]=useState(0);
  const [card,setCard]=useState<PriceTargetCatalog["cards"][number]|null>(null),[printing,setPrinting]=useState("");
  const [selected,setSelected]=useState<PriceTarget|null>(null),[amount,setAmount]=useState(""),[direction,setDirection]=useState<PriceTarget["direction"]>("at_or_below");
  const pending=useRef<PriceTargetRequest|null>(null),working=useRef(false),openedTarget=useRef(false);
  useEffect(()=>{
    const api=createPriceTargetClient(ownerId,supabase.auth,fetch,()=>{setClosed(true);setModel(null);setCatalog(null);pending.current=null;});setClient(api);
    void api.read().then(value=>{if(api.current())setModel(value);}).catch(e=>{if(api.current())setError((e as Error).message);});
    return ()=>api.dispose();
  },[ownerId]);
  useEffect(()=>{
    if(!model||openedTarget.current)return;
    const id=new URLSearchParams(window.location.search).get("target");
    if(id&&model.targets.some(t=>t.id===id)){openedTarget.current=true;document.getElementById(`price-target-${id}`)?.scrollIntoView({block:"start",behavior:"instant"});}
  },[model]);
  async function reload() {
    if(!client?.current()||working.current||pending.current)return;
    working.current=true;setBusy(true);setError("");
    try {const next=await client.read();if(client.current()){setModel(next);setSelected(null);setAmount("");}}
    catch(e){if(client.current())setError((e as Error).message);}
    finally{working.current=false;if(client.current())setBusy(false);}
  }
  async function search(page=0) {
    if(!client?.current()||working.current||pending.current)return;
    working.current=true;setBusy(true);setError("");setNotice("");
    try {const next=await client.catalog(query,page);if(client.current()){setCatalog(next);setOffset(page);}}
    catch(e){if(client.current())setError((e as Error).message);}
    finally{working.current=false;if(client.current())setBusy(false);}
  }
  async function save(enabled=true, target:PriceTarget|null=selected) {
    if(!client?.current()||working.current||(!pending.current&&!model?.editEnabled))return;
    try {pending.current ??= {requestId:crypto.randomUUID(),id:target?.id??crypto.randomUUID(),expectedRevision:target?.revision??"0",printingId:target?.printingId??printing,direction:target?target.direction:direction,amount:priceTargetAmount(target?target.amount:amount),currency:"USD",enabled};}
    catch(e){setError((e as Error).message);return;}
    working.current=true;setBusy(true);setError("");setNotice("");
    try {
      await client.save(pending.current);if(!client.current())return;
      pending.current=null;setRetry(false);setNotice(enabled?"Target saved. It can notify once when an eligible reference matches.":"Target paused. It will not start another notification.");setSelected(null);setAmount("");setCard(null);setPrinting("");setCatalog(null);setQuery("");setCreating(false);
      try {const next=await client.read();if(client.current())setModel(next);} catch {if(client.current())setError("Your target was saved. Reload alerts to see its current status.");}
    } catch(e) {if(!client.current())return;if(e instanceof PriceTargetRejected)pending.current=null;setRetry(pending.current!==null);setError((e as Error).message);}
    finally{working.current=false;if(client.current())setBusy(false);}
  }
  if(closed)return <main className={s.page}><p role="status">Your account changed. Reopen price alerts.</p><a href="/account/price-alerts" className={s.button}>Reopen price alerts</a></main>;
  const locked=busy||retry;
  return <main className={s.page}>
    <div className={s.heading}><h1>Price alerts</h1><Link href="/account/notifications">Notification settings</Link></div>
    <p>Get one notification when a fresh TCGPlayer Market reference meets your USD target for an exact raw-card printing.</p>
    <details className={s.muted}><summary>How price alerts work</summary><p>The current reference may match immediately. Prices describe raw cards, not slab values, condition-specific valuations or guaranteed sale prices. Quiet hours, card mutes and your notification limits still apply.</p></details>
    {error&&<p role="alert" className={s.error}>{error}</p>}{notice&&<p role="status" className={s.notice}>{notice}</p>}
    <button disabled={locked} onClick={()=>void reload()}>Reload alerts</button>
    {!model&&!error&&<p role="status">Loading your alerts…</p>}
    {retry&&<section className={s.panel}><h2>Confirm your last save</h2><p>Keep this page open. Retry checks the same request without creating another target. Editing stays paused until the result is known.</p><button disabled={busy} onClick={()=>void save(pending.current?.enabled??true)}>{busy?"Confirming…":"Retry the same save"}</button></section>}
    {model&&!model.editEnabled&&<p role="status">Price alert editing is not available yet. Your saved targets remain visible.</p>}
    {model?.editEnabled&&model.targets.length>0&&!selected&&!creating&&!retry&&<button disabled={busy} onClick={()=>{setCreating(true);setNotice("");}}>New price target</button>}
    {model?.editEnabled&&!retry&&(model.targets.length===0||creating||selected)&&<section className={s.panel} aria-label="Price target editor"><h2>{selected?"Edit price target":"New price target"}</h2>
      {selected?<><p>{selected.name} · {selected.finish}</p><p className={s.muted}>{selected.printingGvId}</p><button disabled={busy} onClick={()=>{setSelected(null);setAmount("");}}>Cancel edit</button></>:<>
        <form onSubmit={e=>{e.preventDefault();void search();}}><label>Search card name or GV-ID<input required minLength={2} maxLength={120} value={query} disabled={busy} onChange={e=>setQuery(e.target.value)}/></label><button disabled={busy}>Find cards</button></form>
        {catalog&&<><div className={s.results}>{catalog.cards.map(c=><button className={s.choice} key={c.id} type="button" aria-pressed={card?.id===c.id} disabled={busy||!c.printings.length} onClick={()=>{setCard(c);setPrinting("");}}><strong>{c.name}</strong><span>{c.set_code} · {c.number}</span><span className={s.muted}>{c.gv_id}</span>{!c.printings.length&&<span>No eligible printing</span>}</button>)}</div>{!catalog.cards.length&&<p>No cards found. Try the card name or GV-ID.</p>}<div className={s.actions}><button disabled={busy||offset===0} onClick={()=>void search(Math.max(0,offset-20))}>Previous results</button><button disabled={busy||!catalog.more} onClick={()=>void search(offset+20)}>Next results</button></div></>}
        {card&&<label>Exact printing<select value={printing} disabled={busy} onChange={e=>setPrinting(e.target.value)}><option value="">Choose a printing</option>{card.printings.map(p=><option key={p.id} value={p.id}>{p.finish_label} · {p.printing_gv_id}</option>)}</select></label>}
      </>}
      {(selected||printing)&&<form onSubmit={e=>{e.preventDefault();void save(true,selected?{...selected,amount,direction}:null);}}><label>Notify me when the market reference is<select value={direction} disabled={busy} onChange={e=>setDirection(e.target.value as PriceTarget["direction"])}><option value="at_or_below">At or below my target</option><option value="at_or_above">At or above my target</option></select></label><label>Target amount (USD)<input required inputMode="decimal" maxLength={1024} value={amount} disabled={busy} onChange={e=>setAmount(e.target.value)}/></label><p className={s.muted}>The current reference may match immediately. Saving starts a new target revision that can notify once, even if this target previously matched.</p><button disabled={busy}>{busy?"Saving…":"Save price target"}</button></form>}
    </section>}
    {model&&<section aria-label="Saved price targets"><h2>Your targets ({model.targets.length})</h2>{!model.targets.length&&<p>No price targets yet.</p>}{model.targets.map(t=><article className={s.panel} key={t.id} id={`price-target-${t.id}`}><h3>{t.name}</h3><p>{t.finish} · {t.direction==="at_or_below"?"At or below":"At or above"} USD {t.amount}</p><p className={s.muted}>{t.printingGvId}</p><p><strong>{!t.enabled?"Paused":t.triggeredAt?"Target matched":t.reference?"Watching for your target":"Waiting for an eligible price"}</strong></p>{t.reference&&<p>Last eligible reference: USD {t.reference.amount}, observed {new Date(t.reference.observedAt).toLocaleString()}.</p>}{t.triggeredAt&&<p className={s.muted}>Matched {new Date(t.triggeredAt).toLocaleString()}. Notification delivery depends on your settings and device.</p>}<div className={s.actions}><button disabled={locked||!model.editEnabled} onClick={()=>{setSelected(t);setAmount(t.amount);setDirection(t.direction);setError("");setNotice("");window.scrollTo({top:0,behavior:"smooth"});}}>Edit or start again</button>{t.enabled&&<button disabled={locked||!model.editEnabled} onClick={()=>void save(false,t)}>Pause target</button>}</div></article>)}</section>}
  </main>;
}
