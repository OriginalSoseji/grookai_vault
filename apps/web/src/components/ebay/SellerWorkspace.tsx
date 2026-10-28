'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowUpRight, Check, CreditCard, ImagePlus, Package, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { emptySellerListing, readSellerRecovery, sellerRecoveryKey } from '@/lib/ebay/sellerRecovery';
import type { SellerDraft, SellerListingInput, SellerLocalDraft, SellerMetadata,
  SellerPendingAction, SellerWorkspaceData } from '@/lib/ebay/sellerTypes';
import s from './SellerWorkspace.module.css';

const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const stateLabel = (state: string) => ({ editing: 'Draft', preparing: 'Preparing', prepared: 'Ready for review',
  publishing: 'Publishing', live: 'Live on eBay', withdrawn: 'Listing ended', ended: 'Listing ended',
  sale_reported: 'Sale reported', sold: 'Sale recorded', uncertain: 'Check eBay status', abandoned: 'Discarded' }[state] ?? state);
async function request<T>(url: string, body?: Record<string, unknown>): Promise<T> {
  let response: Response;
  let data;
  try {
    response = await fetch(url, { method: body ? 'POST' : 'GET', cache: 'no-store',
      credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {},
      ...(body ? { body: JSON.stringify(body) } : {}) });
    data = await response.json();
  } catch { throw new Error('Connection interrupted. Your draft or operation may already be saved. Refresh its status before trying again.'); }
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not confirm the eBay result. Refresh its status.');
  return data as T;
}
const post = <T,>(body: Record<string, unknown>) => request<T>('/api/ebay/seller', body);

export default function SellerWorkspace({ actorId, instanceId, draftId: selectedDraftId, linkStatus }: {
  actorId: string; instanceId: string | null; draftId: string | null; linkStatus: string | null;
}) {
  const [workspace, setWorkspace] = useState<SellerWorkspaceData | null>(null);
  const [draft, setDraft] = useState<SellerDraft | null>(null);
  const [local, setLocal] = useState<SellerLocalDraft | null>(null);
  const localRef = useRef<SellerLocalDraft | null>(null);
  const storageKey = useRef<string | null>(null);
  const startingNew = useRef(false);
  const copyIdRef = useRef<string | null>(instanceId);
  const [metadata, setMetadata] = useState<SellerMetadata | null>(null);
  const [busy, setBusy] = useState<string | null>('Loading');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [clock, setClock] = useState(Date.now());
  const [salePrice, setSalePrice] = useState('');
  const [saleConfirmed, setSaleConfirmed] = useState(false);
  const [referenceImageFailed, setReferenceImageFailed] = useState(false);
  const persist = useCallback((value: SellerLocalDraft) => {
    if (!storageKey.current) throw new Error('Select an owned copy first.');
    localStorage.setItem(storageKey.current, JSON.stringify(value));
    localRef.current = value; setLocal(value); setConfirmed(false);
  }, []);
  const refresh = useCallback(async () => {
    let selected: SellerDraft | null = null;
    const preferred = (!startingNew.current ? selectedDraftId : null) ?? localRef.current?.draftId;
    if (selectedDraftId && !startingNew.current) selected = (await request<{ draft: SellerDraft }>(`/api/ebay/seller?draftId=${encodeURIComponent(selectedDraftId)}`)).draft;
    const copyId = selected?.instanceId ?? copyIdRef.current;
    copyIdRef.current = copyId;
    const current = await request<SellerWorkspaceData>(`/api/ebay/seller${copyId ? '?instanceId=' + encodeURIComponent(copyId) : ''}`);
    setWorkspace(current);
    if (!current.copy) return;
    storageKey.current = sellerRecoveryKey(actorId, current.copy.id);
    const saved = readSellerRecovery(localStorage.getItem(storageKey.current));
    const active = current.drafts.find(d => d.id === preferred)
      ?? current.drafts.find(d => d.id === saved?.draftId)
      ?? current.drafts.find(d => !['withdrawn', 'ended', 'sold', 'abandoned'].includes(d.state));
    if (!selected && active) selected = (await request<{ draft: SellerDraft }>(`/api/ebay/seller?draftId=${encodeURIComponent(active.id)}`)).draft;
    setDraft(selected);
    const retained = saved && (!selected || saved.draftId === selected.id) ? saved : null;
    const next = retained?.dirty && (!selected || selected.state === 'editing') ? {
      ...retained, revision: selected?.revision ?? retained.revision,
    } : { version: 1 as const, draftId: selected?.id ?? retained?.draftId ?? crypto.randomUUID(),
      input: selected?.input ?? retained?.input ?? emptySellerListing(current.copy),
      revision: selected?.revision ?? 0, dirty: !selected,
      ...(retained?.pending ? { pending: retained.pending } : {}),
      ...(retained?.pendingPhoto ? { pendingPhoto: retained.pendingPhoto } : {}) };
    persist(next);
    if (next.pending?.action === 'record_sale' && next.pending.salePriceCents) {
      setSalePrice((next.pending.salePriceCents / 100).toFixed(2));
    }
    setSaleConfirmed(false);
    if (retained?.dirty && selected) setNotice('Your local edits are retained. Save the draft to update the saved version.');
  }, [actorId, persist, selectedDraftId]);
  useEffect(() => {
    let active = true;
    void refresh().catch(e => { if (active) setError(e instanceof Error ? e.message : 'Could not load eBay listings.'); })
      .finally(() => { if (active) setBusy(null); });
    return () => { active = false; };
  }, [refresh]);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 10000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    let active = true;
    void Promise.all((draft?.photos ?? []).map(async photo => {
      const { data } = await supabase.storage.from('ebay-listing-private').createSignedUrl(photo.path, 120);
      return [photo.id, data?.signedUrl] as const;
    })).then(rows => { if (active) setPhotoUrls(Object.fromEntries(rows.filter((v): v is readonly [string, string] => Boolean(v[1])))); });
    return () => { active = false; };
  }, [draft]);
  async function run(label: string, action: () => Promise<void>) {
    if (busy) return;
    setBusy(label); setError(null); setNotice(null);
    try { await action(); }
    catch (e) { setError(e instanceof Error ? e.message : 'The result is unconfirmed. Refresh the saved status.'); }
    finally { setBusy(null); }
  }
  function change(patch: Partial<SellerListingInput>) {
    if (!localRef.current) return;
    try { persist({ ...localRef.current, input: { ...localRef.current.input, ...patch }, dirty: true }); }
    catch { setError('Local recovery storage is unavailable. Keep this page open and restore browser storage before saving.'); }
  }
  async function save() {
    const value = localRef.current;
    if (!value || !workspace?.copy || !workspace.account.accountId) throw new Error('Select a copy and connect your seller account first.');
    persist(value);
    const result = await post<{ revision: number }>({ action: 'save', draftId: value.draftId,
      instanceId: workspace.copy.id, accountId: workspace.account.accountId,
      revision: value.revision, listing: value.input });
    persist({ ...value, revision: result.revision, dirty: false });
    await refresh();
  }
  async function loadMetadata() {
    if (!workspace?.copy || !workspace.account.accountId) return;
    const data = await post<SellerMetadata>({ action: 'metadata', instanceId: workspace.copy.id, accountId: workspace.account.accountId });
    setMetadata(data);
    const value = localRef.current;
    if (value) {
      persist({ ...value, dirty: true, input: { ...value.input, categoryId: data.categoryId,
        condition: !value.input.condition.descriptors.length && !value.input.condition.description ? data.suggestedCondition : value.input.condition } });
    }
  }
  async function upload(file: File) {
    if (!localRef.current) return;
    if (!['image/jpeg', 'image/png'].includes(file.type) || !file.size || file.size > 16 * 1024 * 1024) throw new Error('Choose a JPEG or PNG photo up to 16 MB.');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || user?.id !== actorId) throw new Error('Sign in to the same grookai account before uploading.');
    if (localRef.current.dirty || !draft) await save();
    const value = localRef.current!;
    const sha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))].map(b => b.toString(16).padStart(2, '0')).join('');
    if (value.pendingPhoto && value.pendingPhoto.sha256 !== sha256) throw new Error(`Reselect ${value.pendingPhoto.filename} to finish its upload before adding another photo.`);
    const photo = value.pendingPhoto ?? { id: crypto.randomUUID(), filename: file.name, sha256 };
    persist({ ...value, pendingPhoto: photo });
    const registered = await post<{ path: string; revision: number }>({ action: 'photo', draftId: value.draftId,
      photoId: photo.id, revision: value.revision });
    if (registered.path !== `${actorId}/${value.draftId}/${photo.id}.jpg`) throw new Error('Could not confirm the private photo destination.');
    persist({ ...localRef.current!, revision: registered.revision });
    const { error: uploadError } = await supabase.storage.from('ebay-listing-private').upload(registered.path, file, { contentType: file.type, upsert: true });
    if (uploadError) throw new Error('Photo upload is unconfirmed. Reselect the same photo to finish it.');
    const finished = { ...localRef.current! }; delete finished.pendingPhoto; persist(finished);
    await refresh();
  }
  async function operate(action: 'prepare' | 'publish' | 'withdraw' | 'reconcile' | 'edit' | 'abandon' | 'record_sale') {
    if (action === 'prepare' && localRef.current?.dirty) await save();
    const value = localRef.current;
    if (!value) return;
    if (action === 'record_sale' && (!saleConfirmed || !/^\d+(?:\.\d{1,2})?$/.test(salePrice)
      || Number(salePrice) <= 0 || Number(salePrice) > 1000000)) throw new Error('Enter the actual sale price and confirm that the sale completed.');
    let pending: SellerPendingAction = value.pending?.action === action ? { ...value.pending } : {
      action, requestId: crypto.randomUUID(), revision: value.revision,
      ...(action === 'record_sale' ? { salePriceCents: Math.round(Number(salePrice) * 100) } : {}),
      ...(action === 'publish' && draft?.reviewHash ? { reviewHash: draft.reviewHash } : {}) };
    const existing = draft?.operations.find(op => op.requestId === pending.requestId);
    if (action === 'prepare' && existing?.status === 'running') pending = { ...pending, operationId: existing.id };
    persist({ ...value, pending });
    for (let step = 0; step < 20; step++) {
      const result = await post<{ operationId?: string; continuationReady?: boolean; status?: string }>({
        ...pending, draftId: value.draftId, confirmed: action === 'publish' ? confirmed
          : action === 'record_sale' ? saleConfirmed : action === 'withdraw',
      });
      if (action !== 'prepare' || !result.continuationReady || !result.operationId) break;
      pending = { ...pending, operationId: result.operationId };
      persist({ ...localRef.current!, pending });
    }
    const finished = { ...localRef.current! }; delete finished.pending; persist(finished);
    await refresh();
  }
  async function removePhoto(photoId: string) {
    let value = localRef.current;
    if (!value) return;
    if (value.dirty) { await save(); value = localRef.current!; }
    const result = await post<{ revision: number }>({ action: 'remove_photo',
      draftId: value.draftId, photoId, revision: value.revision });
    const next = { ...value, revision: result.revision };
    if (next.pendingPhoto?.id === photoId) delete next.pendingPhoto;
    persist(next);
    await refresh();
  }
  function startNewDraft() {
    if (!localRef.current || !workspace?.copy || workspace.copy.isArchived
        || !draft || !['withdrawn', 'ended', 'abandoned'].includes(draft.state)) return;
    persist({ version: 1, draftId: crypto.randomUUID(), input: localRef.current.input,
      revision: 0, dirty: true });
    startingNew.current = true;
    // Remove an old history draft from the address before a cold refresh can
    // select it again. Recovery input was persisted above, before navigation.
    window.history.replaceState(null, '', `${location.pathname}?instanceId=${encodeURIComponent(workspace.copy.id)}`);
    setDraft(null); setMetadata(null); setPhotoUrls({}); setSalePrice(''); setSaleConfirmed(false);
  }
  const account = workspace?.account;
  const copy = workspace?.copy;
  const input = local?.input;
  const editable = !copy?.isArchived && (!draft || draft.state === 'editing');
  const prepared = draft?.state === 'prepared';
  const reviewDetails = !editable ? draft?.prepared?.reviewDetails : null;
  const quoteFresh = draft?.feeQuote && clock - draft.feeQuote.requestedAt >= 0 && clock - draft.feeQuote.requestedAt <= 120000;
  const pendingPrepare = draft?.operations.find(op => op.kind === 'prepare' && op.status === 'running' && op.continuationReady);
  return <section className={s.workspace} aria-label="eBay listing workspace" aria-busy={Boolean(busy)}>
    <header className={s.header}><div><Link className={s.back} href="/vault"><ArrowLeft size={15} />Vault</Link><h1>eBay listings</h1></div>
      <button className={s.button} disabled={Boolean(busy)} onClick={() => void run('Refreshing', refresh)} aria-label="Refresh eBay status"><RefreshCw size={16} /></button></header>
    {linkStatus && <p className={s.status}>{linkStatus === 'linked' ? 'Seller connection saved. Return to your copy to prepare a listing.' : linkStatus === 'denied' ? 'Seller connection cancelled. You can return to grookai.' : 'The connection result is unconfirmed. Refresh its saved status before starting again.'}</p>}
    {error && <p className={`${s.status} ${s.error}`} role="alert">{error}</p>}
    {notice && <p className={s.status} role="status">{notice}</p>}
    {busy && <p className={s.muted} role="status">{busy}…</p>}
    {account && <div className={s.account}><div><strong>{account.linked ? account.username ?? 'eBay seller connected' : 'Connect your eBay seller account'}</strong><span className={s.muted}>{account.reconnectRequired ? 'Reconnect to continue listing.' : 'One exact copy · your photos · your selling policies'}</span></div>
      {(!account.linked || account.reconnectRequired) && <button className={`${s.button} ${s.primary}`} disabled={Boolean(busy) || !account.linkingEnabled} onClick={() => void run('Connecting', async () => {
        const result = await post<{ launchUrl: string }>({ action: 'link' }); const url = new URL(result.launchUrl);
        if (url.origin !== 'https://grookaivault.com' || url.pathname !== '/api/ebay/seller/oauth/launch') throw new Error('Could not confirm the seller connection destination.');
        location.assign(url.href);
      })}>Connect eBay<ArrowUpRight size={15} /></button>}</div>}
    {account && !account.linkingEnabled && <p className={s.status}>eBay seller listings aren’t available yet. Active and sold searches remain available from your card details.</p>}
    {!copy && workspace && <section><h2>Recent listings</h2><p className={s.muted}>Choose an exact copy from your Vault to start a listing.</p><div className={s.drafts}>{workspace.drafts.map(item => <Link className={s.draftLink} href={`/vault/ebay?draftId=${item.id}`} key={item.id}><div>{item.title ?? 'Listing draft'}<small>{stateLabel(item.state)}</small></div><ArrowUpRight size={16} /></Link>)}</div></section>}
    {copy && input && <><div className={s.copy}><span className={s.copyIcon}>{!referenceImageFailed && copy.gvId
      ? <Image src={`/api/canon/cards/${encodeURIComponent(copy.gvId)}/image`} alt={`${copy.name} catalog reference`} width={64} height={90} unoptimized onError={() => setReferenceImageFailed(true)} />
      : <Package size={23} />}</span><div><strong>{copy.name}</strong><small>{copy.setCode} · {copy.number} · {copy.isGraded ? `${copy.grader ?? 'Graded'} ${copy.grade ?? ''}` : copy.condition ?? 'Condition unknown'}</small><small>{copy.gvviId} · {draft ? stateLabel(draft.state) : 'New draft'}</small></div></div>
      <div className={s.body}><div className={s.form}><fieldset disabled={Boolean(busy) || !editable || !account?.preparationEnabled}>
        <section className={s.section}><h2>Listing details</h2>{!editable ? <div className={s.fields}><h3 className={s.listingTitle}>{input.title}</h3><p className={s.description}>{input.description}</p></div> : <div className={s.fields}>
          <label className={s.field}>Title<input maxLength={80} value={input.title} onChange={e => change({ title: e.target.value })} /><span className={s.hint}>{input.title.length}/80</span></label>
          <div className={s.row}><label className={s.field}>Description<textarea maxLength={5000} value={input.description} onChange={e => change({ description: e.target.value })} /></label><label className={s.field}>Asking price · USD<input key={`${local.draftId}:${local.revision}`} inputMode="decimal" aria-label="Asking price in USD" defaultValue={input.priceCents ? (input.priceCents / 100).toFixed(2) : ''} onChange={e => { const raw = e.target.value; if (/^\d*(?:\.\d{0,2})?$/.test(raw)) change({ priceCents: raw ? Math.round(Number(raw) * 100) : 0 }); else change({ priceCents: 0 }); }} /></label></div>
        </div>}</section>
        <section className={s.section}><h2>Condition &amp; item specifics</h2>{reviewDetails ? <div className={s.fields}><p>{reviewDetails.condition} · {reviewDetails.conditionDescription}</p><dl className={s.summary}>{reviewDetails.descriptors.map(item => <div key={item.name}><dt>{item.name}</dt><dd>{item.values.join(', ')}</dd></div>)}{Object.entries(reviewDetails.aspects).map(([name, values]) => <div key={name}><dt>{name}</dt><dd>{values.join(', ')}</dd></div>)}</dl></div> : !metadata ? <button className={s.button} onClick={() => void run('Loading selling options', loadMetadata)} disabled={!account?.linked}>Load eBay options</button> : <div className={s.fields}>
          <p className={s.muted}>Category: CCG individual cards · {copy.isGraded ? 'Graded' : 'Ungraded'}</p>
          {metadata.conditionChoices.find(v => v.conditionId === input.condition.conditionId)?.conditionDescriptors?.map(descriptor => {
            const selected = input.condition.descriptors.find(d => d.id === descriptor.conditionDescriptorId);
            const update = (next: { values?: string[]; additionalInfo?: string }) => change({ condition: { ...input.condition, descriptors: [...input.condition.descriptors.filter(d => d.id !== descriptor.conditionDescriptorId), ...((next.values?.length || next.additionalInfo) ? [{ id: descriptor.conditionDescriptorId, ...next }] : [])] } });
            return <label className={s.field} key={descriptor.conditionDescriptorId}>{descriptor.conditionDescriptorName}{descriptor.conditionDescriptorConstraint.usage === 'REQUIRED' ? ' *' : ''}{descriptor.conditionDescriptorConstraint.mode === 'FREE_TEXT'
              ? <input maxLength={descriptor.conditionDescriptorConstraint.maxLength ?? 100} value={selected?.additionalInfo ?? ''} onChange={e => update({ additionalInfo: e.target.value })} />
              : <select value={selected?.values?.[0] ?? ''} onChange={e => update({ values: e.target.value ? [e.target.value] : [] })}><option value="">Choose {descriptor.conditionDescriptorName.toLowerCase()}</option>{descriptor.conditionDescriptorValues?.map(option => <option key={option.conditionDescriptorValueId} value={option.conditionDescriptorValueId}>{option.conditionDescriptorValueName}</option>)}</select>}</label>;
          })}
          <label className={s.field}>Condition description<textarea maxLength={1000} value={input.condition.description} onChange={e => change({ condition: { ...input.condition, description: e.target.value } })} /><span className={s.hint}>Describe wear and damage visible in your photos.</span></label>
          {copy.condition === 'DMG' && <label className={s.check}><input type="checkbox" checked={input.condition.damagedDisclosureConfirmed === true} onChange={e => change({ condition: { ...input.condition, damagedDisclosureConfirmed: e.target.checked } })} />I am listing under eBay’s lowest CCG condition and explicitly disclosing that this card is damaged.</label>}
          {metadata.aspects.map(aspect => <label className={s.field} key={aspect.localizedAspectName}>{aspect.localizedAspectName}{aspect.aspectConstraint.aspectRequired ? ' *' : ''}{aspect.aspectConstraint.aspectMode === 'SELECTION_ONLY'
            ? <select value={input.aspects[aspect.localizedAspectName]?.[0] ?? ''} onChange={e => change({ aspects: { ...input.aspects, [aspect.localizedAspectName]: e.target.value ? [e.target.value] : [] } })}><option value="">Choose {aspect.localizedAspectName.toLowerCase()}</option>{aspect.aspectValues?.map(v => <option value={v.localizedValue} key={v.localizedValue}>{v.localizedValue}</option>)}</select>
            : <input maxLength={aspect.aspectConstraint.aspectMaxLength ?? 65} value={input.aspects[aspect.localizedAspectName]?.[0] ?? ''} onChange={e => { const next = { ...input.aspects }; if (e.target.value) next[aspect.localizedAspectName] = [e.target.value]; else delete next[aspect.localizedAspectName]; change({ aspects: next }); }} />}</label>)}
        </div>}</section>
        <section className={s.section}><h2>Shipping &amp; returns</h2>{reviewDetails ? <div className={s.fields}>{Object.entries(reviewDetails.policies).map(([kind, policy]) => <div key={kind}><strong>{policy.name}</strong>{policy.terms.map((term, index) => <p className={s.hint} key={index}>{term}</p>)}</div>)}</div> : metadata ? <div className={s.fields}>
          {(['fulfillment', 'payment', 'return'] as const).map(kind => <label className={s.field} key={kind}>{kind === 'fulfillment' ? 'Shipping policy' : kind === 'payment' ? 'Payment policy' : 'Return policy'}<select value={input.policies[kind]} onChange={e => change({ policies: { ...input.policies, [kind]: e.target.value } })}><option value="">Choose your saved eBay policy</option>{metadata.policies[kind]?.map(policy => { const id = String(policy[kind + 'PolicyId']); return <option key={id} value={id}>{String(policy.name ?? id)}</option>; })}</select></label>)}
          <label className={s.field}>Ships from<select value={input.locationKey} onChange={e => change({ locationKey: e.target.value })}><option value="">Choose your eBay inventory location</option>{metadata.locations.filter(l => l.merchantLocationStatus === 'ENABLED').map(l => <option key={l.merchantLocationKey} value={l.merchantLocationKey}>{l.name ?? l.merchantLocationKey}</option>)}</select></label>
        </div> : <p className={s.muted}>Load eBay options to choose your existing policies.</p>}</section>
        <section className={s.section}><h2>Your copy photos</h2>{editable && <p className={s.muted}>Use clear front, back and detail photos of this exact card. JPEG or PNG, up to 16 MB each. Photos need a long edge of at least 600 pixels.</p>}<div className={s.photoRow}>{draft?.photos.map((photo, index) => <div key={photo.id}><div className={s.photo}>{photoUrls[photo.id]
          // Private owner-authorized Storage URL; next/image must not proxy it.
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={photoUrls[photo.id]} alt={`Your copy photo ${index + 1}`} referrerPolicy="no-referrer" /> : <span>Photo {index + 1}<br />{photo.state === 'awaiting_upload' ? 'Upload pending' : photo.state === 'hosted' ? 'Ready' : photo.state === 'uncertain' ? 'Check upload' : 'Saved'}</span>}</div>{editable && <button className={s.button} disabled={Boolean(busy)} onClick={() => void run('Removing listing photo', () => removePhoto(photo.id))}>Remove photo {index + 1}</button>}</div>)}</div>
          {local.pendingPhoto && <p className={s.hint}>Reselect {local.pendingPhoto.filename} to finish the interrupted upload.</p>}
          {editable && <label className={s.button}><ImagePlus size={16} />Add copy photo<input className={s.file} type="file" accept="image/jpeg,image/png" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void run('Uploading private photo', () => upload(file)); }} /></label>}</section>
      </fieldset></div><aside className={s.review}><h2>{draft?.state === 'sold' ? 'Sale recorded' : prepared ? 'Review your listing' : draft?.state === 'live' ? 'Live listing' : 'Listing summary'}</h2><div className={s.price}>{draft?.recordedSale ? money(draft.recordedSale.priceCents) : input.priceCents ? money(input.priceCents) : 'Set your price'}</div>
        <dl className={s.summary}><div><dt>Quantity</dt><dd>1 exact copy</dd></div><div><dt>Marketplace</dt><dd>eBay US</dd></div><div><dt>Format</dt><dd>Fixed price</dd></div>{draft?.feeQuote?.fees.map((fee, index) => <div key={index}><dt>{fee.type}</dt><dd className={s.fee}>{money(fee.amount.cents)}{fee.promotionalDiscount ? ` · ${money(fee.promotionalDiscount.cents)} discount` : ''}</dd></div>)}</dl>
        {draft?.feeQuote && <p className={s.hint}>eBay’s estimated listing fees. Final selling fees and net proceeds are not included.</p>}
        {prepared && <><p className={s.hint}>{quoteFresh ? 'Fee quote is current.' : 'The fee quote has expired. Edit and prepare again to refresh it.'}</p><label className={s.check}><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={Boolean(busy) || !quoteFresh} />I reviewed this exact copy, its photos, condition, price and selling policies.</label><button className={`${s.button} ${s.primary}`} disabled={Boolean(busy) || !confirmed || !quoteFresh || !account?.publicationEnabled} onClick={() => void run('Publishing on eBay', () => operate('publish'))}><ArrowUpRight size={16} />Publish on eBay</button><button className={s.button} disabled={Boolean(busy)} onClick={() => void run('Opening draft', () => operate('edit'))}>Edit draft</button></>}
        {editable && <><button className={s.button} disabled={Boolean(busy) || !account?.preparationEnabled} onClick={() => void run('Saving draft', save)}>Save draft</button><button className={`${s.button} ${s.primary}`} disabled={Boolean(busy) || !account?.preparationEnabled || Boolean(local.pendingPhoto) || !metadata || !draft?.photos.length} onClick={() => void run('Preparing your listing', () => operate('prepare'))}><CreditCard size={16} />Prepare listing</button><p className={s.hint}>Preparation creates an unpublished offer for review.</p></>}
        {pendingPrepare && <button className={`${s.button} ${s.primary}`} disabled={Boolean(busy)} onClick={() => void run('Continuing preparation', () => {
          persist({ ...localRef.current!, pending: { action: 'prepare', requestId: pendingPrepare.requestId, operationId: pendingPrepare.id, revision: pendingPrepare.expectedRevision } }); return operate('prepare');
        })}>Continue preparation</button>}
        {draft?.state === 'preparing' && !pendingPrepare && <button className={s.button} disabled={Boolean(busy)} onClick={() => void run('Checking preparation', async () => {
          const op = draft.operations.find(item => item.kind === 'prepare' && item.status === 'running');
          if (op) persist({ ...localRef.current!, pending: { action: 'prepare', requestId: op.requestId, operationId: op.id, revision: op.expectedRevision } });
          await operate('prepare');
        })}>Check preparation status</button>}
        {draft?.listingId && <a className={s.button} href={`https://www.ebay.com/itm/${encodeURIComponent(draft.listingId)}`} target="_blank" rel="noopener noreferrer">View on eBay<ArrowUpRight size={15} /></a>}
        {['live', 'uncertain'].includes(draft?.state ?? '') && <button className={s.button} disabled={Boolean(busy) || !draft?.listingId} onClick={() => void run('Ending eBay listing', () => operate('withdraw'))}>End eBay listing</button>}
        {['preparing', 'publishing', 'live', 'uncertain'].includes(draft?.state ?? '') && <button className={s.button} disabled={Boolean(busy)} onClick={() => void run('Checking eBay status', () => operate('reconcile'))}>Check eBay status</button>}
        {draft?.state === 'sale_reported' && <><p className={s.hint}>eBay reports a sale. Verify the listing ended, then enter the actual sale price to record it in your Vault.</p><button className={s.button} disabled={Boolean(busy)} onClick={() => void run('Verifying ended sale', () => operate('reconcile'))}>Verify ended sale</button><label className={s.field}>Actual sale price · USD<input inputMode="decimal" value={salePrice} disabled={Boolean(busy) || local.pending?.action === 'record_sale'} onChange={e => setSalePrice(e.target.value)} /></label><label className={s.check}><input type="checkbox" checked={saleConfirmed} disabled={Boolean(busy)} onChange={e => setSaleConfirmed(e.target.checked)} />I confirmed this sale completed and entered its actual sale price.</label><button className={`${s.button} ${s.primary}`} disabled={Boolean(busy) || !saleConfirmed || !salePrice} onClick={() => void run('Recording completed sale', () => operate('record_sale'))}>Record eBay sale</button></>}
        {draft?.state === 'sold' && <p className={s.hint}>Recorded in your existing Vault sale history. Actual selling fees and net proceeds are not inferred.</p>}
        {draft && !copy.isArchived && ['withdrawn', 'ended', 'abandoned'].includes(draft.state) && <button className={s.button} disabled={Boolean(busy)} onClick={startNewDraft}>Start a new listing</button>}
        {draft && ['editing', 'prepared', 'uncertain'].includes(draft.state) && <button className={s.button} disabled={Boolean(busy)} onClick={() => void run('Discarding draft', () => operate('abandon'))}>Discard draft</button>}
        {draft?.state === 'withdrawn' && <p className={s.hint}><Check size={16} />eBay confirmed the listing ended. This copy remains in your Vault.</p>}
      </aside></div></>}
  </section>;
}
