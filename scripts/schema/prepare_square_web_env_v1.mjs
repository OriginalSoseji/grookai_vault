// Synthetic, task-owned local configuration only. Never reads production env.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root='C:/grookai_square_sync_20261110',lab='C:/grookai_vault_operator_artifacts/square_sync_20261110/local-fresh-v1';
assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);
assert.equal(JSON.parse(fs.readFileSync(lab+'/candidate-result.json')).pass,true);
const raw=execFileSync('supabase',['status','--workdir',lab,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true});
const cfg=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1));
const url=new URL(cfg.API_URL);assert.equal(url.origin,'http://127.0.0.1:61841');
assert.ok(cfg.PUBLISHABLE_KEY&&cfg.SECRET_KEY);
const env={SUPABASE_URL:url.origin,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:cfg.SECRET_KEY,
  NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_SQUARE_LOCAL_TEST:'true',GROOKAI_DISABLE_TELEMETRY:'1',
  NEXT_PUBLIC_SITE_URL:'http://127.0.0.1:61850',SITE_URL:'http://127.0.0.1:61850',
  SQUARE_ENVIRONMENT:'sandbox',SQUARE_APP_ID:'synthetic-fixture-app',SQUARE_APP_SECRET:'synthetic-fixture-secret',
  SQUARE_TOKEN_ENCRYPTION_KEY:randomBytes(32).toString('base64'),SQUARE_CALLBACK_URL:'https://example.invalid/api/square/oauth/callback',
  GROOKAI_SQUARE_LINKING_ENABLED:'true',GROOKAI_SQUARE_CATALOG_ENABLED:'true'};
fs.writeFileSync(root+'/apps/web/.env.local',Object.entries(env).map(([key,value])=>key+'='+value).join('\n')+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({prepared:true,target:'LOCAL http://127.0.0.1:61841',productionCredentialsRead:0,providerRequests:0}));
