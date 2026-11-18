import type {ReactNode} from 'react';
const router={refresh(){},push(){},replace(){}};
export function useRouter(){return router;}
export function useClientViewer(){return{userId:'local-fixture-owner',isAuthenticated:true,hasCheckedSession:true};}
export function sendTelemetryEvent(){}
export async function saveVaultItemInstanceConditionAction(input:{instanceId:string;conditionLabel:string}){await new Promise(resolve=>setTimeout(resolve,50));return (globalThis as Record<string,unknown>).fixtureConditionSaveFails?{ok:false,message:'Fixture save failed'}:{ok:true,...input,gvviId:'fixture'};}
export async function saveVaultItemInstanceIntentAction(input:unknown){return{ok:true,...input as object};}
export async function saveVaultItemInstanceImageDisplayModeAction(input:unknown){return{ok:true,...input as object};}
export default function Link({children,href,...props}:{children:ReactNode;href:string;[key:string]:unknown}){return <a href={href} {...props}>{children}</a>;}
