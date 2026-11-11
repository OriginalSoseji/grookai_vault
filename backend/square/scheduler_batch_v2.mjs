// Stable bounded rotation prevents the first ten sellers monopolizing every
// scheduled tick. Immediate owner/webhook work continues independently.
export function squareScheduledConnections(connections,{now=Date.now(),limit=10}={}){
 if(!Array.isArray(connections)||!Number.isInteger(limit)||limit<1||limit>10||!Number.isFinite(now))throw Error('square_connections_incomplete');
 const sorted=[...connections].sort((a,b)=>String(a.connectionId).localeCompare(String(b.connectionId)));
 if(sorted.length<=limit)return sorted;
 const offset=(Math.floor(now/300000)*limit)%sorted.length;
 return sorted.slice(offset).concat(sorted.slice(0,offset)).slice(0,limit);
}
