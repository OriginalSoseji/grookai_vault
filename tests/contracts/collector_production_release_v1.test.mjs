import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCollectorReleaseEnvironment } from '../../apps/web/src/lib/collectorRelease.mjs';

const valid = { GROOKAI_COLLECTOR_RELEASE_V1:'true', VERCEL_ENV:'production',
  VERCEL_PROJECT_ID:'prj_m3B6s7jAwXJ4WGbE9fK2WhJsFlum',
  SUPABASE_URL:'https://ycdxbpibncqcchqiihfz.supabase.co', SITE_URL:'https://grookaivault.com' };
test('release is explicit and limited to current production project/database',()=>{
  assert.doesNotThrow(()=>assertCollectorReleaseEnvironment(valid));
  for(const change of [{GROOKAI_COLLECTOR_RELEASE_V1:undefined},{VERCEL_ENV:'preview'},
    {VERCEL_ENV:'development'},{VERCEL_PROJECT_ID:'prj_pPujDVUHcFfqArtLGRQ4niAQbbFB'},
    {SUPABASE_URL:'https://hcdpcbpnnvtbaezefjkd.supabase.co'},{SUPABASE_URL:'http://127.0.0.1:54321'},
    {SUPABASE_URL:'https://dkuiaiorwirujnrmbpvq.supabase.co'},{SUPABASE_URL:valid.SUPABASE_URL+'?test=1'},
    {SUPABASE_URL:'https://user@ycdxbpibncqcchqiihfz.supabase.co'},{SITE_URL:'https://grookai-collector-staging.vercel.app'}]) {
    assert.throws(()=>assertCollectorReleaseEnvironment({...valid,...change}));
  }
});
test('all sample, fixture, preview and hosted modes are incompatible with production',()=>{
  for(const key of ['NEXT_PUBLIC_COLLECTOR_STAGING','NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB',
    'NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING','NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY']) {
    for(const value of ['true','TRUE','1'])assert.throws(()=>assertCollectorReleaseEnvironment({...valid,[key]:value}));
    assert.doesNotThrow(()=>assertCollectorReleaseEnvironment({...valid,[key]:'false'}));
  }
});
