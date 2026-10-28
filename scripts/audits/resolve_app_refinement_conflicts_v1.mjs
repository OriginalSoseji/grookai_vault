import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='C:/gv_app_integration_20261028';
assert.equal(process.cwd().replaceAll('\\','/'),root);
const review='C:/gv_intake_recovery_private_20261027/app-source-preservation-20261028/client-reconciliation-v2';
const rows=JSON.parse(fs.readFileSync(review+'/report.json')).rows;
// Each decision follows inspection of the three-way conflict and current main.
const decisions={
  'lib/screens/binders/binder_detail_screen.dart':[['P'],'Use shared cover gallery/metadata dialog; retain main variant copy outside conflict.'],
  'lib/screens/dex/grookai_dex_species_screen.dart':[['P'],'Use durable review with main-selected exact printing.'],
  'lib/screens/grookai_objects/grookai_objects_hub_screen.dart':[['C'],'Preserve current owned-item market value, including sealed objects.'],
  'lib/screens/grookai_objects/lot_pricing_screen.dart':[['C','C','C'],'Retain sealed identity and unknown-value wording.'],
  'lib/screens/gvvi/public_gvvi_screen.dart':[['P'],'Shared review preserves verified preferred printing and edition guard.'],
  'lib/screens/identity_scan/identity_scan_screen.dart':[['CP','P'],'Keep current edition exception handling; shared review validates exact printing.'],
  'lib/screens/scanner/scan_identify_screen.dart':[['CP','P'],'Keep edition recovery; use durable review.'],
  'lib/screens/scanner_v5/scan_capture_v5_screen.dart':[['CP','P','PC'],'Combine saved-copy action and current edition recovery.'],
  'lib/screens/sets/public_set_detail_screen.dart':[['C'],'Retain current large-text price footer fix.'],
  'lib/services/grookai_objects/grookai_object_export_service.dart':[['P'],'Preserve original brand casing in error text.'],
  'lib/services/public/card_surface_pricing_service.dart':[['C'],'Preserve eBay active-listing source distinction.'],
  'lib/services/public/public_sets_service.dart':[['C','C','C'],'Retain current catalog RPC/cache/performance behavior.'],
  'lib/theme/gv_grid_constants.dart':[['C'],'Both sides use required 9px gaps; retain shared documentation.'],
  'lib/theme/gv_tokens.dart':[['P'],'Retain selected brightness and readable platform chrome with bundled Roboto.'],
  'lib/utils/pokemon_sprite_url.dart':[['C'],'Retain governed self-hosted sprite delivery.'],
  'lib/widgets/grookai_objects/grookai_object_atoms.dart':[['C','P'],'Preserve current exports dependencies and brand casing.'],
  'lib/widgets/grookai_objects/grookai_object_destination_export_renderer.dart':[['C'],'Preserve type guard so non-lot backs use correct renderer.'],
  'lib/widgets/grookai_objects/lot_card_widgets.dart':[['C'],'Retain unknown-value formatting instead of inventing zero prices.'],
  'lib/widgets/onboarding/onboarding_ladder_sheet.dart':[['P'],'Use shared durable review and verified printing guard.'],
};
const log=[];
for(const [file,[choices,reason]]of Object.entries(decisions)){
  const row=rows.find(r=>r.path===file);assert.equal(row.result,'manual_conflict_review');
  const source=fs.readFileSync(row.review+'/review','utf8');let count=0;
  const resolved=source.replace(/^<<<<<<<[^\n]*\n([\s\S]*?)^\|\|\|\|\|\|\|[^\n]*\n([\s\S]*?)^=======\n([\s\S]*?)^>>>>>>>[^\n]*\n?/gm,(_,current,ancestor,preserved)=>{
    const choice=choices[count++];assert.ok(['C','P','CP','PC'].includes(choice),file+' missing decision');
    return [...choice].map(c=>c==='C'?current:preserved).join('');
  });
  assert.equal(count,choices.length,file+' unexpected conflict count');assert.doesNotMatch(resolved,/^<<<<<<<|^=======|^>>>>>>>/m);
  const target=root+'/'+file;
  assert.ok(!fs.existsSync(target)||fs.readFileSync(target,'utf8').replaceAll('\r\n','\n')===fs.readFileSync(row.review+'/current','utf8'),file+' changed after review');
  fs.writeFileSync(target,resolved);
  log.push({file,choices,reason,sha256:createHash('sha256').update(resolved).digest('hex')});
}
fs.writeFileSync(review+'/native-reviewed-resolutions-v1.json',JSON.stringify({at:new Date().toISOString(),log},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({resolvedFiles:log.length,needsAnalysisAndTests:true}));
