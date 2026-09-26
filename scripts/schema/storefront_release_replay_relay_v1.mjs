// Dedicated release rehearsal only; no configurable destinations or credentials.
import net from 'node:net';
const project = 'grookai-storefront-release-20260919';
for (const [port, service, destination] of [[16822,'db',5432],[16821,'kong',8000],[16824,'inbucket',8025]]) {
  net.createServer(source => {
    const target = net.connect({host:`supabase_${service}_${project}`,port:destination});
    source.on('error',()=>target.destroy());target.on('error',()=>source.destroy());
    source.on('close',()=>target.destroy());target.on('close',()=>source.destroy());
    source.pipe(target).pipe(source);
  }).listen(port,'0.0.0.0');
}
