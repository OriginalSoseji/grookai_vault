"use client";
/* eslint-disable @next/next/no-img-element -- Authenticated, private product media. */
import { useEffect, useRef, useState } from "react";
import type { TeamWorkflows, TeamWorkspace } from "@/lib/stores/storeTeam";
import { storeRequest, type OwnerProduct, type ProductList } from "./storeManagerClient";
import { definitiveRejection, teamWrite } from "./storeTeamWorkflowClient";
import s from "./StoreTeam.module.css";

function Editor({ initial, endpoint, model, context, close }: { initial: OwnerProduct | null; endpoint: string; model: TeamWorkspace; context: TeamWorkflows; close: () => Promise<void> }) {
  const [product, setProduct] = useState(initial), [title, setTitle] = useState(initial?.title ?? ""), [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(String(initial?.asking_price_amount ?? "")), [quantity, setQuantity] = useState(String(initial?.available_quantity ?? 0));
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState(""), [retry, setRetry] = useState(false);
  const attempt = useRef<Record<string,unknown> | null>(null);
  const canPrice = model.permissions.includes("pricing"), canList = model.permissions.includes("listings"), canSection = model.permissions.includes("sections");
  const dirty = title !== (product?.title ?? "") || description !== (product?.description ?? "") || price !== String(product?.asking_price_amount ?? "") || quantity !== String(product?.available_quantity ?? 0);
  const locked = busy || retry || !!product?.archived_at;
  function update(p: OwnerProduct) { setProduct(p); setTitle(p.title); setDescription(p.description); setPrice(String(p.asking_price_amount ?? "")); setQuantity(String(p.available_quantity)); }
  async function mutate(action: string, data: Record<string, unknown> = {}) {
    if (busy) return; setBusy(true); setError(""); setNotice("");
    const creating = !product;
    const body = { id: product?.id ?? null, version: product?.version ?? null, action, data };
    if (creating) attempt.current ??= { ...body, request: crypto.randomUUID() };
    try {
      const result = await teamWrite<ProductList>(`${endpoint}/products`, creating ? attempt.current! : body);
      update(result.products[0]); attempt.current = null; setRetry(false); setNotice("Saved.");
    } catch (e) {
      setError((e as Error).message);
      if (creating) { if (definitiveRejection(e)) attempt.current = null; setRetry(!!attempt.current); }
    } finally { setBusy(false); }
  }
  async function reload() {
    setBusy(true); setError("");
    try { const data = await storeRequest<ProductList>(`${endpoint}/products?id=${product!.id}`); const p = data.products.find(p => p.id === product!.id); if (!p) throw new Error("Product unavailable"); update(p); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function upload(file: File) {
    if (!product || busy) return; setBusy(true); setError("");
    try { if (!file.size || file.size > 5 * 1024 * 1024) throw new Error("Choose an image up to 5 MB");
      const data = new FormData(); data.set("file", file);
      update((await storeRequest<ProductList>(`${endpoint}/products/media?product=${product.id}&version=${product.version}`, data)).products[0]);
    } catch (e) { setError(`${(e as Error).message} Reload the product before retrying an upload.`); } finally { setBusy(false); }
  }
  return <section className={s.panel}><div className={s.actions}><h2>{product ? "Edit custom product" : "New custom product"}</h2><button disabled={busy || retry} onClick={() => { if (!dirty || window.confirm("Discard unsaved product changes?")) void close(); }}>All products</button></div>
    <p>Saving keeps drafts private. Editing a published product updates its public details.</p>{error && <p className={s.error} role="alert">{error}</p>}{notice && <p className={s.notice} role="status">{notice}</p>}
    <form onSubmit={e => { e.preventDefault(); void mutate("save", { title, description, available_quantity: Number(quantity), ...(canPrice ? { asking_price_amount: price === "" ? null : Number(price) } : {}) }); }}>
      <fieldset disabled={locked}><label>Title<input maxLength={120} value={title} onChange={e => setTitle(e.target.value)} /></label><label>Description<textarea maxLength={4000} value={description} onChange={e => setDescription(e.target.value)} /></label><div className={s.grid}><label>Asking price ({context.currency ?? "USD"})<input disabled={!canPrice} type="number" min={0} max={99999999.99} step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></label><label>Available quantity<input required type="number" min={0} max={1000000} step={1} value={quantity} onChange={e => setQuantity(e.target.value)} /></label></div></fieldset>
      {retry && <p>Keep this page open and retry to confirm the same draft without creating a duplicate.</p>}<button disabled={busy || !!product?.archived_at}>{retry ? "Retry and confirm draft" : product ? "Save product" : "Create draft"}</button>
    </form>
    {product && <><div className={s.actions}><span>{product.archived_at ? "Archived" : product.published ? "Published" : "Draft"}</span><button disabled={busy} onClick={() => { if (!dirty || window.confirm("Discard unsaved edits and reload?")) void reload(); }}>Reload latest version</button></div>{dirty && <p className={s.muted}>Save details before changing photos, sections or publication.</p>}{product.ineligible_reason && <p className={s.muted}>Before publishing: {product.ineligible_reason}</p>}
      <h3>Product photos</h3><p className={s.muted}>Up to eight JPG, PNG or WebP images, 5 MB each. The first is the cover.</p><div className={s.grid}>{product.photo_paths.map((path, index) => <div key={path}><div className={s.art}><img src={`${endpoint}/products/media?product=${product.id}&photo=${encodeURIComponent(path.split("/").pop()!)}`} alt={`${product.title || "Product"}, photo ${index + 1}`} /></div><div className={s.actions}><button disabled={locked || dirty || index === 0} onClick={() => { const paths = [...product.photo_paths]; [paths[index-1],paths[index]] = [paths[index],paths[index-1]]; void mutate("photos", { paths }); }}>Make earlier</button><button disabled={locked || dirty} onClick={() => void mutate("photos", { paths: product.photo_paths.filter(p => p !== path) })}>Remove photo {index + 1}</button></div></div>)}</div>
      <label>Add photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={locked || dirty || product.photo_paths.length >= 8} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void upload(file); }} /></label>
      {canSection && <fieldset className={s.permissions} disabled={locked || dirty}><legend>Store sections</legend>{context.sections.map(section => <label key={section.id}><input type="checkbox" checked={product.section_ids.includes(section.id)} onChange={e => void mutate("sections", { section_ids: e.target.checked ? [...product.section_ids,section.id] : product.section_ids.filter(id => id !== section.id) })} />{section.name}</label>)}</fieldset>}
      {canList && <button disabled={locked || dirty || (!product.published && !!product.ineligible_reason)} onClick={() => void mutate(product.published ? "unpublish" : "publish")}>{product.published ? "Unpublish product" : "Publish product"}</button>}
    </>}
  </section>;
}

export default function StoreTeamProducts({ endpoint, model, context }: { endpoint: string; model: TeamWorkspace; context: TeamWorkflows }) {
  const [list, setList] = useState<ProductList | null>(null), [selected, setSelected] = useState<OwnerProduct | null | undefined>(undefined), [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; storeRequest<ProductList>(`${endpoint}/products`).then(data => { if (active) setList(data); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [endpoint]);
  async function load(offset = 0) { setBusy(true); setError(""); try { setList(await storeRequest<ProductList>(`${endpoint}/products?offset=${offset}`)); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  if (selected !== undefined) return <Editor key={selected?.id ?? "new"} initial={selected} endpoint={endpoint} model={model} context={context} close={async () => { setSelected(undefined); await load(list?.offset ?? 0); }} />;
  return <section className={s.panel}><div className={s.actions}><h2>Custom products</h2><button onClick={() => setSelected(null)}>Add custom product</button><button disabled={busy} onClick={() => void load(list?.offset ?? 0)}>Refresh products</button></div>{error && <p className={s.error} role="alert">{error}</p>}{!list && !error && <p>Loading products…</p>}{list?.total === 0 && <p>No custom products yet.</p>}
    <div className={s.grid}>{list?.products.map(product => <article className={s.card} key={product.id}>{product.photo_paths[0] && <div className={s.art}><img alt={product.title || "Product"} src={`${endpoint}/products/media?product=${product.id}&photo=${encodeURIComponent(product.photo_paths[0].split("/").pop()!)}`} /></div>}<h3>{product.title || "Untitled draft"}</h3><p>{product.asking_price_amount === null ? "Price not set" : `${product.asking_price_currency} ${Number(product.asking_price_amount).toFixed(2)}`} · {product.available_quantity} available</p><p>{product.archived_at ? "Archived" : product.published ? "Published" : "Draft"}</p><button onClick={() => setSelected(product)}>Edit product</button></article>)}</div>
    <div className={s.actions}><button disabled={busy || !list || list.offset === 0} onClick={() => void load(Math.max(0,(list?.offset ?? 0)-40))}>Previous products</button><button disabled={busy || !list || list.offset+40 >= list.total} onClick={() => void load((list?.offset ?? 0)+40)}>Next products</button></div>
  </section>;
}
