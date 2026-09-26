// Offline expanded candidate. V11 suggestions are retained; structural recovery
// additionally requires title AND exact printed coordinates, never artwork alone.
import sharp from 'sharp';import {createWorker} from 'tesseract.js';import english from '@tesseract.js-data/eng';import path from 'node:path';
import {matchScanV11,scanOrientations,scanTextEvidence} from './scanMatchV11.mjs';
import {qualifiedFooter} from './scanOcrEvidenceV10.mjs';import {rankStructure,structureAdmits} from './scanStructureV12.mjs';
export const SCAN_MATCH_VERSION='vendor_scan_evidence_v12';
export function acceptStructuralIdentity(title,footer,card){
  const evidence=scanTextEvidence(title,footer,card.name,card.number,card.printedCoordinates);
  const prefixed=/^[A-Z]+\d/i.test(card.number);
  return evidence.nameMatch&&evidence.numberMatch&&!evidence.conflict&&(prefixed||evidence.totalMatch);
}
export async function structuralRecovery(bytes,catalog){
  const orientations=await scanOrientations(bytes,1400),candidates=[];let worker,timer,expired=false;
  const work=(async()=>{
    for(const scan of orientations){
      const ranked=rankStructure(scan.descriptor,catalog);if(!structureAdmits(ranked))continue;
      if(!worker)worker=await createWorker('eng',1,{langPath:path.join(path.dirname(english.langPath),'4.0.0_best_int'),gzip:true,cacheMethod:'none',errorHandler:()=>{}});
      if(expired)throw new Error('Matching timed out.');
      await worker.setParameters({tessedit_pageseg_mode:'6'});
      const {width,height}=await sharp(scan.bytes).metadata();
      const title=(await worker.recognize(await sharp(scan.bytes).extract({left:0,top:0,width,height:Math.round(height*.16)}).grayscale().normalize().png().toBuffer())).data.text;
      const reads=[];
      for(const [family,left,top,w,h] of [['full',0,.88,1,.12],['left-wide',.02,.90,.58,.09]]){
        const crop=await sharp(scan.bytes).extract({left:Math.round(width*left),top:Math.round(height*top),width:Math.floor(width*w),height:Math.floor(height*h)}).grayscale().normalize().png().toBuffer();
        const {data}=await worker.recognize(crop,{}, {blocks:true});reads.push({crop:family,data});
      }
      await worker.setParameters({tessedit_pageseg_mode:'7'});
      for(const left of [.15,.73]){
        const strip=await sharp(scan.bytes).extract({left:Math.round(width*left),top:Math.round(height*.94),width:294,height:Math.floor(height*.035)}).png().toBuffer();
        for(const threshold of [null,80]){
          let image=sharp(strip).grayscale();image=threshold===null?image.normalize():image.threshold(threshold);
          const {data}=await worker.recognize(await image.extend({top:20,bottom:20,left:20,right:20,background:'#fff'}).png().toBuffer(),{}, {blocks:true});
          reads.push({crop:'strip-'+left,data});
        }
      }
      const footer=qualifiedFooter(reads),card=catalog.find(c=>c.id===ranked[0].id);
      if(acceptStructuralIdentity(title,footer,card))candidates.push({id:card.id,rotation:scan.rotation,distance:ranked[0].distance,evidence:'title_printed_identity_structure',printedIdentity:scanTextEvidence(title,footer,card.name,card.number,card.printedCoordinates)});
    }
    return {status:candidates.length>1?'ambiguous':candidates.length?'suggestions':'no_match',candidates};
  })();
  try{return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(new Error('Matching timed out.'));},10000);})]);}
  finally{clearTimeout(timer);if(worker)await worker.terminate();}
}
export async function matchScanV12(bytes,references,catalog){
  const prior=await matchScanV11(bytes,references,catalog);
  if(prior.candidates.length||prior.status!=='no_match')return {...prior,version:SCAN_MATCH_VERSION};
  const recovered=await structuralRecovery(bytes,catalog);
  return {...recovered,version:SCAN_MATCH_VERSION,reader:'structure_recovery'};
}


