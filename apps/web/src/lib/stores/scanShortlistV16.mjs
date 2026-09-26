// Retrieval only. These IDs must never be returned as verified suggestions
// without geometric/reference verification and current public revalidation.
import {scanOrientations,evidenceVisualScores} from './scanMatchV11.mjs';
import {rankStructure} from './scanStructureV12.mjs';
export async function shortlistVisualReferences(bytes,references,catalog){
 const found=new Map();
 for(const scan of await scanOrientations(bytes,640)){
  const colors=evidenceVisualScores(scan.descriptor,references);
  const rankings=[colors.slice().sort((a,b)=>a.distance-b.distance).slice(0,6),rankStructure(scan.descriptor,catalog).slice(0,6),colors.slice().sort((a,b)=>a.artDistance-b.artDistance).slice(0,4)];
  for(const ranking of rankings)ranking.forEach((r,i)=>{const old=found.get(r.id);if(!old||i<old.rank)found.set(r.id,{id:r.id,rank:i});});
 }
 return [...found.values()].sort((a,b)=>a.rank-b.rank||a.id.localeCompare(b.id)).slice(0,32).map(r=>r.id);
}
