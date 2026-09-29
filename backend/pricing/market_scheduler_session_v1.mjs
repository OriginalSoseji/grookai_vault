export function assertMarketSchedulerSessionUrlV1(value) {
  const url = new URL(value);
  if ((url.hostname.endsWith('.pooler.supabase.com') || url.hostname.endsWith('.supabase.co'))
      && url.port && url.port !== '5432') {
    throw new Error('Scheduled pricing requires the Supabase session pooler on port 5432 for its advisory lock');
  }
}

// Preserve the configured project, credentials and TLS options. The shared
// Supabase endpoint exposes session mode on 5432, transaction mode on 6543.
export function marketSessionConnectionStringV1(value) {
  const url = new URL(value);
  if (url.hostname.endsWith('.pooler.supabase.com') && url.port === '6543') url.port = '5432';
  assertMarketSchedulerSessionUrlV1(url.href);
  return url.href;
}

export function startMarketSchedulerHeartbeatV1(client, backendPid, onLost, intervalMs = 30_000) {
  let stopped = false;
  let lost = false;
  let pending = null;
  const timer = setInterval(() => {
    if (stopped || lost || pending) return;
    pending = (async () => {
      try {
        const result = await client.query('select pg_backend_pid() as backend_pid');
        if (result.rows[0]?.backend_pid !== backendPid) {
          throw new Error('Scheduler advisory-lock backend changed');
        }
      } catch (error) {
        if (!stopped && !lost) {
          lost = true;
          onLost(error);
        }
      } finally {
        pending = null;
      }
    })();
  }, intervalMs);
  timer.unref();
  return async () => {
    stopped = true;
    clearInterval(timer);
    await pending;
  };
}
