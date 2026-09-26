// Visual/reference verification only. Never selects a printing or writes identity.
import sharp from 'sharp';
export const GEOMETRY_VERSION='vendor_scan_geometry_v16';
const WIDTH=640,HEIGHT=880;
export async function prepareGeometryImage(cv,bytes){
 const input=sharp(bytes,{limitInputPixels:16_000_000,failOn:'warning'}),meta=await input.metadata();
 if(!['jpeg','png','webp'].includes(meta.format)||(meta.pages??1)!==1)throw Error('Use one still image.');
 const {data,info}=await input.autoOrient().removeAlpha().toColourspace('srgb').raw().toBuffer({resolveWithObject:true});
 const objects=[],own=o=>(objects.push(o),o);let image,points,descriptor;
 try{
  const rgb=own(cv.matFromArray(info.height,info.width,cv.CV_8UC3,data)),gray=own(new cv.Mat());cv.cvtColor(rgb,gray,cv.COLOR_RGB2GRAY);
  const baseRotation=gray.cols>gray.rows?90:0,oriented=own(new cv.Mat());
  if(baseRotation)cv.rotate(gray,oriented,cv.ROTATE_90_CLOCKWISE);else gray.copyTo(oriented);
  image=new cv.Mat();cv.resize(oriented,image,new cv.Size(WIDTH,HEIGHT),0,0,cv.INTER_LINEAR);
  points=new cv.KeyPointVector();descriptor=new cv.Mat();const orb=own(new cv.ORB(1000,1.2,8,15,0,2,cv.ORB_HARRIS_SCORE,31,12)),mask=own(new cv.Mat());
  orb.detectAndCompute(image,mask,points,descriptor);
  return {image,points,descriptor,baseRotation,dispose(){descriptor.delete();points.delete();image.delete();}};
 }catch(e){descriptor?.delete();points?.delete();image?.delete();throw e;}finally{for(const o of objects.reverse())o.delete();}
}
export function regionCorrelation(a,b,width,[x1,y1,x2,y2]){
 let sx=0,sy=0,sxx=0,syy=0,sxy=0,n=0;
 for(let y=y1;y<y2;y++)for(let x=x1;x<x2;x++){const i=y*width+x,v=a[i],w=b[i];sx+=v;sy+=w;sxx+=v*v;syy+=w*w;sxy+=v*w;n++;}
 const vx=sxx/n-(sx/n)**2,vy=syy/n-(sy/n)**2;
 return vx<64||vy<64?null:(sxy/n-sx*sy/n/n)/Math.sqrt(vx*vy);
}
export function geometryFrame(h){
 const corners=[[0,0],[WIDTH,0],[WIDTH,HEIGHT],[0,HEIGHT]].map(([x,y])=>{const w=h[6]*x+h[7]*y+h[8];return[(h[0]*x+h[1]*y+h[2])/w,(h[3]*x+h[4]*y+h[5])/w];});
 if(corners.some(([x,y])=>!Number.isFinite(x)||!Number.isFinite(y)||x< -64||x>704||y< -88||y>968))return null;
 let area=0;for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4],c=corners[(i+2)%4];if((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])<=0)return null;area+=a[0]*b[1]-a[1]*b[0];}
 area/=2*WIDTH*HEIGHT;if(area<.65||area>1.15)return null;
 const angle=Math.atan2(corners[1][1]-corners[0][1],corners[1][0]-corners[0][0])*180/Math.PI,turn=Math.round(angle/90)*90;
 return Math.abs(angle-turn)>12?null:{turn,area};
}
export function verifyGeometry(cv,reference,scan){
 if(reference.descriptor.rows<8||scan.descriptor.rows<8)return null;
 const objects=[],own=o=>(objects.push(o),o);
 try{
  const matcher=own(new cv.BFMatcher(cv.NORM_HAMMING,false)),pairs=own(new cv.DMatchVectorVector());matcher.knnMatch(reference.descriptor,scan.descriptor,pairs,2);
  const src=[],dst=[];
  for(let i=0;i<pairs.size();i++){const pair=pairs.get(i);try{if(pair.size()!==2)continue;const a=pair.get(0),b=pair.get(1);if(a.distance>=.75*b.distance||a.distance>=64)continue;const p=reference.points.get(a.queryIdx).pt,q=scan.points.get(a.trainIdx).pt;src.push(p.x,p.y);dst.push(q.x,q.y);}finally{pair.delete();}}
  const count=src.length/2;if(count<40)return null;
  const source=own(cv.matFromArray(count,1,cv.CV_32FC2,src)),dest=own(cv.matFromArray(count,1,cv.CV_32FC2,dst)),mask=own(new cv.Mat());cv.setRNGSeed(1600);
  const h=own(cv.findHomography(source,dest,cv.RANSAC,3,mask,2000,.995));if(h.empty())return null;
  let inliers=0,art=0;const cells=new Set();for(let i=0;i<count;i++){if(!mask.data[i])continue;const x=src[2*i],y=src[2*i+1];inliers++;if(y>132&&y<528)art++;cells.add(Math.floor(x/160)+':'+Math.floor(y/147));}
  if(inliers<40||inliers/count<.55||art<8||cells.size<8)return null;
  const frame=geometryFrame(h.data64F);if(!frame)return null;
  const warped=own(new cv.Mat());cv.warpPerspective(scan.image,warped,h,new cv.Size(WIDTH,HEIGHT),cv.INTER_LINEAR|cv.WARP_INVERSE_MAP);
  const correlation={};for(const [name,box,min]of [['title',[32,22,608,141],.70],['art',[40,150,600,515],.80],['footer',[20,783,620,862],.65]]){
   const r=regionCorrelation(reference.image.data,warped.data,WIDTH,box);if(r===null||!Number.isFinite(r)||r<min)return null;correlation[name]=r;
  }
  return {inliers,matches:count,artPoints:art,cells:cells.size,correlation,rotation:(scan.baseRotation-frame.turn+360)%360};
 }finally{for(const o of objects.reverse())o.delete();}
}
