// SQL transport for two fixed isolated replay labs; never accepts a DB URL.
import pg from 'pg';import assert from 'node:assert/strict';
assert.equal(process.argv.length,3);
const targets={'jungle-edition-full-421-v22-20261001':{port:65200,address:'10.248.13.3'},'jungle-edition-upgrade-421-v23-20261001':{port:65520,address:'10.248.16.3'}};
const target=targets[process.argv[2]];assert.ok(target,'Unknown local fixture');
let sql='';for await(const chunk of process.stdin)sql+=chunk;assert.ok(sql.length>0&&sql.length<2*1024*1024);
const c=new pg.Client({host:'127.0.0.1',port:target.port,user:'postgres',password:'postgres',database:'postgres',connectionTimeoutMillis:10000,statement_timeout:120000});
await c.connect();try{
 const state=(await c.query("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers")).rows[0];
 assert.deepEqual(state,{address:target.address,workers:'0'});
 const result=await c.query(sql);
 for(const r of Array.isArray(result)?result:[result])for(const row of r.rows??[])console.log(Object.values(row).map(v=>v===null?'':typeof v==='object'?JSON.stringify(v):String(v)).join('|'));
}finally{await c.end();}
