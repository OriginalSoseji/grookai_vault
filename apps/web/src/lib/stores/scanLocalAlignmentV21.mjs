// Small, bounded footer registration after global visual alignment. No OCR.
import { regionCorrelation } from './scanGeometryV16.mjs';
export function boundedFooterTransform(matrix) {
  if (matrix.length !== 6 || !Array.from(matrix).every(Number.isFinite)) return false;
  const [a,b,tx,c,d,ty] = matrix, determinant = a*d-b*c;
  if (a < .94 || a > 1.06 || d < .94 || d > 1.06 || Math.abs(b) > .04 || Math.abs(c) > .04 || determinant < .9 || determinant > 1.1) return false;
  for (const [x,y] of [[20,20],[619,20],[619,98],[20,98]]) {
    const u=a*x+b*y+tx,v=c*x+d*y+ty;
    if (u < 0 || u >= 640 || v < 0 || v >= 117 || Math.hypot(u-x,v-y) > 18) return false;
  }
  return true;
}

export function alignFooter(cv, reference, scan) {
  const objects = [], own = value => (objects.push(value), value);
  try {
    const rectangle = new cv.Rect(0,763,640,117);
    const template = own(reference.roi(rectangle)), input = own(scan.roi(rectangle));
    const warp = own(cv.matFromArray(2,3,cv.CV_32F,[1,0,0,0,1,0])), mask = own(new cv.Mat());
    const criteria = new cv.TermCriteria(cv.TermCriteria_COUNT | cv.TermCriteria_EPS,40,.0001);
    const ecc = cv.findTransformECC(template,input,warp,cv.MOTION_AFFINE,criteria,mask,5);
    if (!Number.isFinite(ecc) || !boundedFooterTransform(warp.data32F)) return null;
    const corrected = own(new cv.Mat());
    cv.warpAffine(input,corrected,warp,new cv.Size(640,117),cv.INTER_LINEAR|cv.WARP_INVERSE_MAP);
    const correlation = regionCorrelation(template.data,corrected.data,640,[20,20,620,99]);
    return correlation === null || !Number.isFinite(correlation) ? null : {correlation,ecc,transform:Array.from(warp.data32F)};
  } catch { return null; } finally { for (const object of objects.reverse()) object.delete(); }
}
