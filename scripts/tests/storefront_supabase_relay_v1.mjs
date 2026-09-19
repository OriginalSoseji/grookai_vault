// Test-only TCP relay. Publish only on host loopback. No configurable targets,
// Docker socket, HTTP proxy, credentials or application logic.
import net from 'node:net';
const project = 'grookai-storefront-verification-20260918';
for (const [port, host, destination] of [
    [16422, `supabase_db_${project}`, 5432],
    [16421, `supabase_kong_${project}`, 8000],
    [16424, `supabase_inbucket_${project}`, 8025],
]) {
    net.createServer((source) => {
        const target = net.connect({ host, port: destination });
        source.on('error', () => target.destroy());
        target.on('error', () => source.destroy());
        source.on('close', () => target.destroy());
        target.on('close', () => source.destroy());
        source.pipe(target).pipe(source);
    }).listen(port, '0.0.0.0');
}
