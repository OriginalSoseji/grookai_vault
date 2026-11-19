import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import AddToVaultCardAction from '../../apps/web/src/components/vault/AddToVaultCardAction';
import VaultInstanceSettingsCard from '../../apps/web/src/components/vault/VaultInstanceSettingsCard';
const fixture=await fetch('/fixture.json').then(response=>response.json());
const printings=fixture.catalog.map((row:{id:string;printingGvId:string;finishKey:string;number:string})=>({id:row.id,printing_gv_id:row.printingGvId,finish_key:row.finishKey,finish_name:`${row.number} ${row.finishKey}`,is_display_fallback:false}));
const fallback={id:'fallback',finish_key:'normal',finish_name:'Unresolved',is_display_fallback:true};
function Settings(){const [graded,setGraded]=useState(false),[archived,setArchived]=useState(false);return <><label className="block text-sm"><input type="checkbox" checked={graded} onChange={event=>setGraded(event.target.checked)}/> Test graded</label><label className="block text-sm"><input type="checkbox" checked={archived} onChange={event=>setArchived(event.target.checked)}/> Test archived</label><VaultInstanceSettingsCard instanceId="fixture-instance" initialIntent="hold" initialConditionLabel="NM" initialImageDisplayMode="canonical" isActive={!archived} isGraded={graded} cardPrintingId={printings[0].id}/></>;}
function App(){
 const [id,setId]=useState(printings[0].id),[unresolved,setUnresolved]=useState(false);
 return <><label className="block text-sm">Test printing<select className="min-h-11 w-full rounded-lg border p-2" value={id} onChange={event=>setId(event.target.value)}>{printings.map((row:{id:string;finish_name:string})=><option key={row.id} value={row.id}>{row.finish_name}</option>)}</select></label><label className="block py-3 text-sm"><input type="checkbox" checked={unresolved} onChange={event=>setUnresolved(event.target.checked)}/> Test unresolved printing</label>
 <AddToVaultCardAction action={async()=>{throw new Error('Fixture cannot save copies');}} isAuthenticated loginHref="/login" currentPath="/local-fixture" gvId="fixture-card" printings={unresolved?[fallback]:printings} selectedPrintingId={unresolved?'fallback':id} initialPrintingId={id} telemetryEnabled={false}/></>;
}
createRoot(document.getElementById('root')!).render(location.pathname==='/settings'?<Settings/>:<App/>);
