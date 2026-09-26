// Local visual edge evidence only; never text recognition or printing inference.
import { boundedFooterTransform } from './scanLocalAlignmentV21.mjs';
export function edgeAgreement(reference, query, width, height, box) {
  if (reference.length !== width*height || query.length !== reference.length) return null;
  const [x1,y1,x2,y2]=box;
  if (x1<1||y1<1||x2>=width||y2>=height||x2<=x1||y2<=y1) return null;
  let a=0,b=0,hitA=0,hitB=0;
  function nearby(pixels,x,y){for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(pixels[(y+dy)*width+x+dx])return true;return false;}
  for(let y=y1;y<y2;y++)for(let x=x1;x<x2;x++){
    if(reference[y*width+x]){a++;if(nearby(query,x,y))hitA++;}
    if(query[y*width+x]){b++;if(nearby(reference,x,y))hitB++;}
  }
  if(a<80||b<80)return null;
  const recall=hitA/a,precision=hitB/b;
  return {referenceEdges:a,queryEdges:b,recall,precision,f1:recall+precision?2*recall*precision/(recall+precision):0};
}

export function footerEdges(cv,reference,scan,transform) {
  if(!boundedFooterTransform(transform))return null;
  const objects=[],own=x=>(objects.push(x),x);
  try {
    const rect=new cv.Rect(0,763,640,117),template=own(reference.roi(rect)),input=own(scan.roi(rect));
    const warp=own(cv.matFromArray(2,3,cv.CV_32F,transform)),corrected=own(new cv.Mat());
    cv.warpAffine(input,corrected,warp,new cv.Size(640,117),cv.INTER_LINEAR|cv.WARP_INVERSE_MAP);
    const a=own(new cv.Mat()),b=own(new cv.Mat());
    cv.Canny(template,a,60,120,3,true);cv.Canny(corrected,b,60,120,3,true);
    return edgeAgreement(a.data,b.data,640,117,[20,20,620,99]);
  }finally{for(const object of objects.reverse())object.delete();}
}
