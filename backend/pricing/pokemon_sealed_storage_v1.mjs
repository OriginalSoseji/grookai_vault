import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const imageHash = bytes => createHash('sha256').update(bytes).digest('hex');
export function pokemonSealedObjectV1(row) {
  assert.equal(row.status,'verified');
  const image=row.image;
  assert.ok(image.valid_image&&!image.placeholder_suspected);
  assert.match(image.sha256,/^[a-f0-9]{64}$/);
  const ext={'image/jpeg':'jpg','image/png':'png','image/gif':'gif','image/webp':'webp'}[image.content_type];
  assert.ok(ext&&image.width>=80&&image.height>=80&&image.size_bytes>2000);
  assert.equal(row.local_filename,`${image.sha256}.${ext}`);
  return {bucket:'user-card-images',path:`sealed/pokemon/sha256/${image.sha256.slice(0,2)}/${image.sha256}.${ext}`,
    local_filename:row.local_filename,image};
}
export function storageObjectMissingV1(error) {
  return ['404','400'].includes(String(error?.statusCode??error?.status))&&
    /(?:object|resource).*not found/i.test(error.message??'');
}
export async function storePokemonSealedObjectV1({storage,object,bytes,onJournal}) {
  assert.equal(imageHash(bytes),object.image.sha256,'Local image hash mismatch');
  assert.equal(bytes.length,object.image.size_bytes,'Local byte length mismatch');
  const bucket=storage.from(object.bucket);
  const first=await bucket.download(object.path);
  let created=false;
  if(first.error){
    if(!storageObjectMissingV1(first.error)) throw new Error(`Collision preflight failed: ${first.error.message}`);
    await onJournal({event:'absent',path:object.path,at:new Date().toISOString()});
    const uploaded=await bucket.upload(object.path,bytes,{upsert:false,contentType:object.image.content_type,cacheControl:'31536000'});
    if(uploaded.error) throw new Error(`Upload failed; retained for collision readback on resume: ${uploaded.error.message}`);
    created=true;
    await onJournal({event:'created',path:object.path,at:new Date().toISOString()});
  }
  const downloaded=created?await bucket.download(object.path):first;
  if(downloaded.error) throw new Error(`Readback failed; object retained for resume: ${downloaded.error.message}`);
  const remote=Buffer.from(await downloaded.data.arrayBuffer());
  // Never delete a collision or an object with uncertain ownership.
  assert.equal(imageHash(remote),object.image.sha256,`Storage collision/readback mismatch: ${object.path}`);
  assert.equal(remote.length,bytes.length,'Storage byte count mismatch');
  const result={event:'verified',path:object.path,sha256:object.image.sha256,bytes:remote.length,
    created_this_attempt:created,verified_at:new Date().toISOString()};
  await onJournal(result);
  return result;
}
