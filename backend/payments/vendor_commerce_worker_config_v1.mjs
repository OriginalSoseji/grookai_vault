// No dotenv, provider, database or network effects on import.
export function readCommerceWorkerConfig(env, args) {
  if (args.length !== 1 || !['--orders', '--billing', '--health'].includes(args[0])) throw new Error('Commerce worker mode required');
  const lane = args[0].slice(2), mode = env.STRIPE_PAYMENTS_MODE;
  if (!['test', 'live'].includes(mode) || env.STRIPE_BILLING_MODE !== mode || !/^acct_[A-Za-z0-9]+$/.test(env.STRIPE_ACCOUNT_ID ?? ''))
    throw new Error('Commerce scope mismatch');
  if (env.GV_USER_ACCESS_TOKEN || !env.SUPABASE_SECRET_KEY) throw new Error('System database credential required');
  const expected = mode === 'live' ? 'https://ycdxbpibncqcchqiihfz.supabase.co' : 'http://127.0.0.1:22021';
  if (env.SUPABASE_URL !== expected) throw new Error('Commerce database environment mismatch');
  // Health remains readable when processing, acquisition or publication is paused.
  if (lane === 'orders' && env.GROOKAI_VENDOR_ORDER_QUEUE_ENABLED !== 'true') throw new Error('Order queue disabled');
  if (lane === 'billing' && (env.GROOKAI_VENDOR_BILLING_ENABLED !== 'true' || env.GROOKAI_VENDOR_BILLING_RECONCILIATION_ENABLED !== 'true'))
    throw new Error('Billing reconciliation disabled');
  return { lane, scope: { accountId: env.STRIPE_ACCOUNT_ID, livemode: mode === 'live' } };
}
