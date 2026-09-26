// Test-process preload only. Never imported by application code.
// Preserve the real Stripe SDK HTTP path, but keep every request in this lab.
require('./vendor_storefront_network_guard.cjs');
const assert=require('node:assert/strict'),http=require('node:http'),https=require('node:https');
assert.equal(process.env.GROOKAI_REFUND_BROWSER_TRANSPORT,'24045');
assert.equal(process.env.NEXT_PUBLIC_STOREFRONT_LOCAL_TEST,'true');
assert.equal(process.env.SITE_URL,'http://127.0.0.1:24040');
assert.equal(process.env.STRIPE_SECRET_KEY,'sk_test_refundBrowserSyntheticOnly');
assert.equal(process.env.GROOKAI_DISABLE_TELEMETRY,'1');
assert.ok(!process.env.VERCEL&&!process.env.VERCEL_ENV);
const original=https.request;
https.request=function(options,...rest){
 if(options&&typeof options==='object'&&(options.host??options.hostname)==='api.stripe.com'){
  assert.equal(Number(options.port),443);assert.ok(['GET','POST'].includes(options.method));
  const request=http.request({...options,host:'127.0.0.1',hostname:'127.0.0.1',port:24045,protocol:'http:',agent:false},...rest);
  // NodeHttpClient waits for secureConnect when configured for the Stripe host.
  // The test socket is plain loopback; no TLS or external connection is created.
  request.once('socket',socket=>{if(socket.connecting)socket.once('connect',()=>socket.emit('secureConnect'));});
  return request;
 }
 return original.call(this,options,...rest);
};
