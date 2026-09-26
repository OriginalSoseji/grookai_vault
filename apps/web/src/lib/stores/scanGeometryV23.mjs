// Offline candidate. Keeps global geometry/title/art gates; adds bounded local
// registration and bidirectional footer-edge evidence for foil backgrounds.
import { geometryFrame, regionCorrelation } from './scanGeometryV16.mjs';
import { alignedUpperRegions } from './scanRegionAlignmentV23.mjs';
import { alignFooter } from './scanLocalAlignmentV21.mjs';
import { footerEdges } from './scanFooterEdgesV22.mjs';
export { prepareGeometryImage } from './scanGeometryV19.mjs';
export const GEOMETRY_VERSION = 'vendor_scan_geometry_v23';

export function footerEdgesAdmit(evidence) {
  return !!evidence && ['recall','precision','f1'].every(key=>Number.isFinite(evidence[key])&&evidence[key]>=0&&evidence[key]<=1)
    && Number.isInteger(evidence.referenceEdges) && Number.isInteger(evidence.queryEdges)
    && evidence.referenceEdges >= 80 && evidence.queryEdges >= 80
    && evidence.recall >= .80 && evidence.precision >= .70 && evidence.f1 >= .75;
}

export function combineCorrespondences(first, second) {
  const byPoint = new Map();
  for (const row of [...first,...second]) {
    const key = Math.round(row[0])+':'+Math.round(row[1]);
    if (!byPoint.has(key)) byPoint.set(key,row);
    else { const existing=byPoint.get(key); if(existing && Math.hypot(existing[2]-row[2],existing[3]-row[3])>3)byPoint.set(key,null); }
  }
  return [...byPoint.values()].filter(Boolean);
}

function correspondences(cv,reference,scan) {
  if(reference.descriptor.rows<8||scan.descriptor.rows<8)return [];
  const matcher=new cv.BFMatcher(cv.NORM_HAMMING,false),pairs=new cv.DMatchVectorVector();
  try{
    matcher.knnMatch(reference.descriptor,scan.descriptor,pairs,2);const rows=[];
    for(let i=0;i<pairs.size();i++){const pair=pairs.get(i);try{
      if(pair.size()!==2)continue;const a=pair.get(0),b=pair.get(1);
      if(a.distance>=.75*b.distance||a.distance>=64)continue;
      const p=reference.points.get(a.queryIdx).pt,q=scan.points.get(a.trainIdx).pt;rows.push([p.x,p.y,q.x,q.y]);
    }finally{pair.delete();}}
    return rows;
  }finally{pairs.delete();matcher.delete();}
}

function verifyCorrespondences(cv,reference,scan,rows) {
  if(rows.length<40)return null;
  const objects=[],own=x=>(objects.push(x),x);
  try{
    const source=own(cv.matFromArray(rows.length,1,cv.CV_32FC2,rows.flatMap(r=>r.slice(0,2))));
    const dest=own(cv.matFromArray(rows.length,1,cv.CV_32FC2,rows.flatMap(r=>r.slice(2,4))));
    const mask=own(new cv.Mat());cv.setRNGSeed(1600);
    const h=own(cv.findHomography(source,dest,cv.RANSAC,3,mask,2000,.995));if(h.empty())return null;
    let inliers=0,art=0;const cells=new Set();
    for(let i=0;i<rows.length;i++)if(mask.data[i]){const[x,y]=rows[i];inliers++;if(y>132&&y<528)art++;cells.add(Math.floor(x/160)+':'+Math.floor(y/147));}
    if(inliers<40||inliers/rows.length<.55||art<8||cells.size<8)return null;
    const frame=geometryFrame(h.data64F);if(!frame)return null;
    const warped=own(new cv.Mat());cv.warpPerspective(scan.image,warped,h,new cv.Size(640,880),cv.INTER_LINEAR|cv.WARP_INVERSE_MAP);
    const correlation=alignedUpperRegions(reference.image.data,warped.data);
    if(!correlation)return null;
    correlation.footer=regionCorrelation(reference.image.data,warped.data,640,[20,783,620,862]);
    let footerEvidence='pixels',localFooter,edges;
    if(correlation.footer===null||!Number.isFinite(correlation.footer)||correlation.footer<.65){
      localFooter=alignFooter(cv,reference.image,warped);
      if(!localFooter)return null;
      if(localFooter.correlation>=.65)footerEvidence='registered_pixels';
      else{
        edges=footerEdges(cv,reference.image,warped,localFooter.transform);
        if(!footerEdgesAdmit(edges))return null;
        footerEvidence='registered_edges';
      }
    }
    return{inliers,matches:rows.length,artPoints:art,cells:cells.size,correlation,footerEvidence,localFooter,edges,rotation:(scan.baseRotation-frame.turn+360)%360};
  }finally{for(const object of objects.reverse())object.delete();}
}

export function verifyGeometryV23(cv,reference,scan) {
  const first=correspondences(cv,reference.original,scan.original);
  const original=verifyCorrespondences(cv,reference,scan,first);
  if(original)return{...original,featureView:'original'};
  const second=correspondences(cv,reference,scan);
  const balanced=verifyCorrespondences(cv,reference,scan,second);
  if(balanced)return{...balanced,featureView:'balanced'};
  const combined=verifyCorrespondences(cv,reference,scan,combineCorrespondences(first,second));
  return combined?{...combined,featureView:'combined'}:null;
}
