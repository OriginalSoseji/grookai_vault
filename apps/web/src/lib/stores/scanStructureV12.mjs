// Illumination-tolerant gradient directions; never identity evidence on their own.
export function structureFeature(descriptor) {
  const bytes=Buffer.from(descriptor,'base64');
  if(bytes.length!==2304)throw new Error('Invalid visual descriptor.');
  const gray=Array.from({length:768},(_,i)=>(bytes[i*3]+bytes[i*3+1]+bytes[i*3+2])/3),feature=[];
  for(let y=5;y<16;y++)for(let x=3;x<21;x++){
    const i=y*24+x,dx=gray[i+1]-gray[i-1],dy=gray[i+24]-gray[i-24],norm=Math.max(12,Math.hypot(dx,dy));
    feature.push(dx/norm,dy/norm);
  }
  return feature;
}
const cache=new WeakMap();
export function rankStructure(descriptor,catalog){
  let features=cache.get(catalog);if(!features){features=catalog.map(c=>structureFeature(c.descriptor));cache.set(catalog,features);}
  const own=structureFeature(descriptor);
  return catalog.map((card,i)=>({id:card.id,distance:features[i].reduce((s,n,j)=>s+(n-own[j])**2,0)/own.length})).sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id));
}
export function structureAdmits(ranked){return !!ranked[0]&&ranked[0].distance<=.40&&(!ranked[1]||ranked[1].distance-ranked[0].distance>=.10);}
