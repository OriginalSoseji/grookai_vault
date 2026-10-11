import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {test} from 'node:test';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
const ts=require('typescript');
const file=new URL('../../supabase/functions/_shared/notification_quiet_hours_v1.ts',import.meta.url);
const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const context={exports:{},Intl,Date};vm.runInNewContext(output,context);
const {isInsideQuietHours,nextQuietEnd}=context.exports;
const prefs=(start,end,timezone='UTC')=>({quiet_hours_start:start,quiet_hours_end:end,timezone});
const cases=[
 ['spring forward','2026-03-08T06:30:00Z',prefs('22:00','03:00','America/New_York'),'2026-03-08T07:00:00.000Z'],
 ['fall back','2026-11-01T04:30:00Z',prefs('22:00','03:00','America/New_York'),'2026-11-01T08:00:00.000Z'],
 ['ordinary night','2026-02-08T06:30:00Z',prefs('22:00','03:00','America/New_York'),'2026-02-08T08:00:00.000Z'],
 ['skipped end minute','2026-03-08T06:30:00Z',prefs('22:00','02:30','America/New_York'),'2026-03-08T07:00:00.000Z'],
 ['first repeated end','2026-11-01T04:30:00Z',prefs('22:00','01:30','America/New_York'),'2026-11-01T05:30:00.000Z'],
 ['second repeated end','2026-11-01T06:10:00Z',prefs('22:00','01:30','America/New_York'),'2026-11-01T06:30:00.000Z'],
 ['fractional offset','2026-01-01T18:35:20Z',prefs('00:00','01:00','Asia/Kathmandu'),'2026-01-01T19:15:00.000Z'],
 ['midnight end','2026-01-01T23:59:59Z',prefs('22:00','00:00'),'2026-01-02T00:00:00.000Z'],
 ['midnight start','2026-01-01T00:00:00Z',prefs('00:00','01:00'),'2026-01-01T01:00:00.000Z'],
 ['legacy end of day','2026-01-01T23:59:59Z',prefs('22:00','24:00:00'),'2026-01-02T00:00:00.000Z'],
 ['legacy start of day','2026-01-01T00:00:00Z',prefs('24:00:00.000000','01:00'),'2026-01-01T01:00:00.000Z'],
 ['half-hour fall back','2026-04-04T14:00:00Z',prefs('22:00','03:00','Australia/Lord_Howe'),'2026-04-04T16:30:00.000Z'],
 ['half-hour spring forward','2026-10-03T15:00:00Z',prefs('22:00','03:00','Australia/Lord_Howe'),'2026-10-03T16:00:00.000Z'],
 ['invalid legacy timezone uses UTC','2026-01-01T23:00:00Z',prefs('22:00','03:00','Invalid/Timezone'),'2026-01-02T03:00:00.000Z'],
];
for(const [name,time,settings,expected] of cases)test(name,()=>{
 const now=new Date(time);assert.equal(isInsideQuietHours(now,settings),true);
 const end=nextQuietEnd(now,settings);assert.equal(end.toISOString(),expected);
 assert.equal(isInsideQuietHours(end,settings),false);
 assert.equal(isInsideQuietHours(new Date(end.getTime()-1),settings),true);
});
for(const [name,settings] of [
 ['missing start',prefs(null,'03:00')],['missing end',prefs('22:00',null)],
 ['equal endpoints',prefs('22:00','22:00')],['invalid hour',prefs('25:00','03:00')],
 ['invalid minute',prefs('22:99','03:00')],['invalid seconds',prefs('22:00:99','03:00')],
 ['trailing garbage',prefs('22:00bad','03:00')],
])test(name+' disables the malformed window',()=>{
 const now=new Date('2026-01-01T23:00:00Z');assert.equal(isInsideQuietHours(now,settings),false);assert.equal(nextQuietEnd(now,settings).getTime(),now.getTime());
});
test('start inclusive, end exclusive and daytime outside unchanged',()=>{
 const settings=prefs('09:00:00','17:00:00');
 for(const [time,inside] of [['08:59:59',false],['09:00:00',true],['16:59:59',true],['17:00:00',false]]){
  const now=new Date('2026-01-01T'+time+'Z');assert.equal(isInsideQuietHours(now,settings),inside);
  if(!inside)assert.equal(nextQuietEnd(now,settings).getTime(),now.getTime());
 }
});
