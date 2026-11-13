import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {localSupabaseStatusSecret} from '../lib/local_supabase_cli_status_v1.mjs';
const lab='C:/grookai_vault_operator_artifacts/square_onboarding_20261112/candidate-v2/fresh-495';
assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);
assert.equal(JSON.parse(fs.readFileSync(lab+'/replay-proof.json')).pass,true);
assert.equal(JSON.parse(fs.readFileSync('C:/grookai_vault_operator_artifacts/square_onboarding_20261112/candidate-v2/runtime-proof.json')).pass,true);
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',lab,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));
assert.equal(cfg.API_URL,'http://127.0.0.1:62941');
const env={...process.env};for(const key of Object.keys(env))if(/^(SUPABASE_|NEXT_PUBLIC_|GROOKAI_|STRIPE_|SQUARE_|VERCEL|SITE_URL|GV_USER_)|SECRET|TOKEN|PASSWORD|API_KEY|DATABASE_URL|POSTGRES_URL/.test(key))delete env[key];
Object.assign(env,{SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.ANON_KEY,SUPABASE_SECRET_KEY:localSupabaseStatusSecret(cfg),NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_SQUARE_ONBOARDING_LOCAL_TEST:'true',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_PUBLIC_SITE_URL:'http://127.0.0.1:62980',SITE_URL:'http://127.0.0.1:62980',NODE_USE_SYSTEM_CA:'1',
 SQUARE_ENVIRONMENT:'sandbox',SQUARE_APP_ID:'sandbox-fixture-app',SQUARE_APP_SECRET:'fixture-only-secret',SQUARE_TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,17).toString('base64'),SQUARE_CALLBACK_URL:'https://example.invalid/api/square/oauth/callback',GROOKAI_SQUARE_LINKING_ENABLED:'true',GROOKAI_SQUARE_CATALOG_ENABLED:'true',GROOKAI_SQUARE_COMMERCE_ENABLED:'true'});
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','62980'],{cwd:'C:/grookai_square_onboarding_20261112/apps/web',env,windowsHide:true,stdio:'inherit'});
child.once('exit',code=>{process.exitCode=code??1;});
