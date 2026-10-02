import fs from 'node:fs';import path from 'node:path';import {fileURLToPath}from'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),dir=root+'/apps/web/src/lib/receipts';
const source=fs.readFileSync(dir+'/receiptBook.mjs','utf8').replaceAll(/^export /gm,'')+'\n'+fs.readFileSync(dir+'/receiptDesk.mjs','utf8').replace(/^import .*;\r?\n/,'').replaceAll(/^export /gm,'');
if(source.includes('</script'))throw Error('Unsafe script terminator');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Grookai Receipt Desk</title><style>body{margin:0;background:#f5f7f3}${fs.readFileSync(dir+'/receiptDesk.css','utf8')}</style></head><body><main id="app"></main><script type="module">${source}\nconst h=escapeHtml;mountReceiptDesk(document.getElementById('app'));</script></body></html>`;
fs.mkdirSync(root+'/artifacts/receipts',{recursive:true});fs.writeFileSync(root+'/artifacts/receipts/Grookai-Receipt-Desk.html',html);console.log('Built standalone receipt desk; no external scripts or network requests.');
