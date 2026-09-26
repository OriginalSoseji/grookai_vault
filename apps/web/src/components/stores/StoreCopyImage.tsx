"use client";
/* eslint-disable @next/next/no-img-element -- Private copy photos require uncached cookie-authorized delivery. */
import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { COPY_PHOTO_ACCEPT, COPY_PHOTO_MAX_BYTES } from "@/lib/stores/storeCopyPhoto";
import { storeRequest } from "./storeManagerClient";
import type { StoreTask } from "./StoreManager";
import s from "./StoreManager.module.css";

export default function StoreCopyImage({ id, name, image, catalogImage, userPhoto = false, busy, canEdit, task, refresh }: { id?: string; name: string; image: string | null; catalogImage?: string | null; userPhoto?: boolean; busy: boolean; canEdit: boolean; task: StoreTask; refresh: () => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [failed, setFailed] = useState(false), [fallbackFailed, setFallbackFailed] = useState(false);
  const source = !failed ? image : !fallbackFailed ? catalogImage : null;
  return <div className={s.copyVisual}>
    <div className={s.copyImageStage}>
      {source ? <img src={source} alt={userPhoto && !failed ? `Your photo of ${name}` : name} loading="lazy" onError={() => failed ? setFallbackFailed(true) : setFailed(true)} /> : <div className={s.copyImagePlaceholder}><span aria-hidden="true">▧</span><span>No card image available</span></div>}
      {id && <><input ref={input} className={s.hiddenFile} type="file" accept={COPY_PHOTO_ACCEPT} aria-label={`Upload photo for ${name}`} disabled={busy || !canEdit} onChange={event => {
        const file = event.target.files?.[0]; event.target.value = "";
        if (!file) return;
        void task(async () => {
          if (file.size === 0 || file.size > COPY_PHOTO_MAX_BYTES) throw new Error("Choose a JPEG, PNG or WebP image up to 4 MB.");
          const form = new FormData(); form.set("file", file);
          await storeRequest(`/api/stores/owner/copy-photo?id=${encodeURIComponent(id)}`, form);
          await refresh();
        }, "Your copy photo is saved.");
      }} /><button type="button" className={s.photoPencil} disabled={busy || !canEdit} onClick={() => input.current?.click()} aria-label={`${userPhoto ? "Replace" : "Add"} photo for ${name}`} title={`${userPhoto ? "Replace" : "Add"} your copy photo`}><Pencil size={19} aria-hidden="true" /></button></>}
    </div>
    <div className={s.copyPhotoCaption}><span>{userPhoto && !failed ? "Your copy photo" : "Catalog image"}</span>{id && userPhoto && <button type="button" disabled={busy || !canEdit} onClick={() => task(async () => { await storeRequest(`/api/stores/owner/copy-photo?id=${encodeURIComponent(id)}&action=catalog`, {}); await refresh(); }, "Catalog image restored. Your uploaded photo is retained with this copy.")}>Use catalog image</button>}</div>
  </div>;
}
