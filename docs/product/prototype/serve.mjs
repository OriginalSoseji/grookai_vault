import http from 'node:http';
import fs from 'node:fs';
const page = new URL('./index.html', import.meta.url);
http.createServer((req, res) => {
  if (req.url?.split('?')[0] !== '/') { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(fs.readFileSync(page));
}).listen(32992, '127.0.0.1', () => console.log('Prototype: http://127.0.0.1:32992'));
