// Pure fail-closed configuration. No client, provider, dotenv or network on import.
export function readBillingWorkerConfig(env,args) {
 if(args.length!==1||!['--health','--once'].includes(args[0]))throw new Error('Use exactly --health or --once');
 const health=args[0]==='--health';
 if(!health&&(env.GROOKAI_VENDOR_BILLING_RECONCILIATION_ENABLED!=='true'||env.GROOKAI_VENDOR_BILLING_ENABLED!=='true'))throw new Error('Billing reconciliation is disabled');
 if(env.GV_USER_ACCESS_TOKEN)throw new Error('Billing worker requires the system client');
 if(!['test','live'].includes(env.STRIPE_BILLING_MODE)||!/^acct_[A-Za-z0-9]+$/.test(env.STRIPE_ACCOUNT_ID??''))throw new Error('Billing scope required');
 const url=new URL(env.SUPABASE_URL??'');
 const allowed=env.STRIPE_BILLING_MODE==='live'?['https://ycdxbpibncqcchqiihfz.supabase.co']:['http://127.0.0.1:17621'];
 if(!allowed.includes(url.origin)||url.pathname!=='/'||url.username||url.password||url.search||url.hash)throw new Error('Billing worker environment mismatch');
 if(!env.SUPABASE_SECRET_KEY)throw new Error('System database credential required');
 return {health,scope:{accountId:env.STRIPE_ACCOUNT_ID,livemode:env.STRIPE_BILLING_MODE==='live'}};
}
