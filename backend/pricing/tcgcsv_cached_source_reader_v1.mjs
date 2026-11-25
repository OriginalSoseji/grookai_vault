import {marketPipelineDatabaseConfigV1} from './market_pipeline_database_config_v1.mjs';

// A fallback source observation is evidence, never permission to relax TLS or
// transaction safety. The caller supplies its normal private pg Client class.
export async function readLatestCompletedTcgcsvSourceRunV1({connectionString,environment=process.env,Client}){
 if(typeof Client!=='function')throw new Error('CACHED_SOURCE_DATABASE_CLIENT_REQUIRED');
 const config=marketPipelineDatabaseConfigV1(connectionString,environment,{readOnly:true,applicationName:'tcgplayer_market_cached_source_v1'});
 const client=new Client({...config,connectionTimeoutMillis:15000,query_timeout:30000,statement_timeout:30000});
 try{
  await client.connect();
  if(config.ssl!==false&&client.connection?.stream?.authorized!==true)throw new Error('CACHED_SOURCE_VERIFIED_TLS_REQUIRED');
  await client.query('begin transaction read only');
  const mode=await client.query('show transaction_read_only');
  if(mode.rows[0]?.transaction_read_only!=='on')throw new Error('CACHED_SOURCE_READ_ONLY_TRANSACTION_REQUIRED');
  const result=await client.query(`select run_key, status, source_marker, finished_at, price_row_count, failed_count
         from public.tcgcsv_source_sync_runs
        where sync_mode = 'current_full_sync'
          and status = 'completed'
          and failed_count = 0
          and finished_at is not null
        order by finished_at desc, created_at desc, id desc
        limit 1`);
  return result.rows[0]??null;
 }finally{
  await client.query('rollback').catch(()=>{});
  await client.end().catch(()=>{});
 }
}
