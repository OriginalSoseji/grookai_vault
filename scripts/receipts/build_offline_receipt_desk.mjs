import fs from 'node:fs';import path from 'node:path';import {fileURLToPath}from'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),dir=root+'/apps/web/src/lib/receipts';
// Keep each module's private helpers scoped, and embed only these local modules.
const modules=['tradeReceipt','receiptBook','receiptDesk'];
const source=modules.map((name,index)=>{
 let code=fs.readFileSync(dir+'/'+name+'.mjs','utf8');
 const exports=[...code.matchAll(/^export (?:function|const) (\w+)/gm)].map(m=>m[1]);
 code=code.replace(/^import \{([^}]+)\} from '\.\/(\w+)\.mjs';\r?\n/gm,(_,bindings,dependency)=>{
  if(!modules.slice(0,index).includes(dependency))throw Error('Unsupported standalone dependency: '+dependency);
  return `const {${bindings.replace(/\s+as\s+/g,':')}} = ${dependency}Module;\n`;
 }).replaceAll(/^export /gm,'');
 if(/^import |^export /m.test(code))throw Error('Unsupported standalone module syntax');
 return `const ${name}Module = (()=>{\n${code}\nreturn {${exports.join(',')}};\n})();`;
}).join('\n');
if(source.includes('</script'))throw Error('Unsafe script terminator');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Grookai Receipt Desk</title><style>body{margin:0;background:#f5f7f3}${fs.readFileSync(dir+'/receiptDesk.css','utf8')}</style></head><body><main id="app"></main><script type="module">${source}\nreceiptDeskModule.mountReceiptDesk(document.getElementById('app'));</script></body></html>`;
fs.mkdirSync(root+'/artifacts/receipts',{recursive:true});fs.writeFileSync(root+'/artifacts/receipts/Grookai-Receipt-Desk.html',html);console.log('Built standalone receipt desk; no external scripts or network requests.');
