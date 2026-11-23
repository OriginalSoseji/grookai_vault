import {randomUUID} from 'node:crypto';

// The caller owns the database session and source/publication locks. PostgreSQL
// materializes WITH HOLD at the end of DECLARE's implicit transaction; subsequent
// writes cannot change this traversal. Only a bounded FETCH reaches Node.
export async function* readMarketCursorBatchesV1(client,{query,values=[],batchSize=1000}){
 if(typeof query!=='string'||!query.trim().toLowerCase().startsWith('select ')||!Array.isArray(values)||!Number.isSafeInteger(batchSize)||batchSize<1||batchSize>2000)throw Error('Invalid market cursor configuration');
 const cursor='market_rows_'+randomUUID().replaceAll('-','');
 await client.query(`declare ${cursor} no scroll cursor with hold for ${query}`,values);
 try{for(;;){const {rows}=await client.query(`fetch forward ${batchSize} from ${cursor}`);if(rows.length>batchSize)throw Error('Market cursor page exceeded bound');if(!rows.length)break;yield rows;}}
 finally{await client.query(`close ${cursor}`);}
}
