// Correct at most one pixel of global raster alignment. Title and artwork must
// pass their unchanged thresholds under the SAME offset; no independent crops.
function correlation(a,b,box,dx,dy){
  let sx=0,sy=0,sxx=0,syy=0,sxy=0,n=0;
  const[x1,y1,x2,y2]=box;
  for(let y=y1;y<y2;y++)for(let x=x1;x<x2;x++){const v=a[y*640+x],w=b[(y+dy)*640+x+dx];sx+=v;sy+=w;sxx+=v*v;syy+=w*w;sxy+=v*w;n++;}
  const vx=sxx/n-(sx/n)**2,vy=syy/n-(sy/n)**2;
  return vx<64||vy<64?null:(sxy/n-sx*sy/n/n)/Math.sqrt(vx*vy);
}
export function alignedUpperRegions(reference,scan){
  if(reference.length!==640*880||scan.length!==reference.length)return null;
  const offsets=[[0,0]];
  for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)if(x||y)offsets.push([x,y]);
  for(const[x,y]of offsets){
    const title=correlation(reference,scan,[32,22,608,141],x,y);
    if(title===null||!Number.isFinite(title)||title<.70)continue;
    const art=correlation(reference,scan,[40,150,600,515],x,y);
    if(art!==null&&Number.isFinite(art)&&art>=.80)return{title,art,offset:{x,y}};
  }
  return null;
}
