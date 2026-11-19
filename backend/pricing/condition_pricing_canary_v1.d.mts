// Keep this read boundary independent of the backend/web SDK generic versions.
export type ConditionReadClient={from:(relation:string)=>unknown};
export type ConditionCode='NM'|'LP'|'MP'|'HP'|'DMG';
export type ConditionCanaryPrinting={id:string;cardPrintId:string;name:string;number:string;finishKey:string;printingGvId:string|null};
export type ConditionCanaryPrice={version:string;status:'available'|'unavailable';card_printing_id:string;card_print_id:string;condition:ConditionCode;amount:number|null;currency:null;currency_hint:'USD';currency_verified:false;source_label:string;provider_updated_at:string|null;unavailable_reason:string|null;pricing_lane:'reference';private_preview:true};
export const CANARY_SET:{readonly categoryId:3;readonly groupId:1394;readonly setCode:'bw6';readonly name:'Dragons Exalted'};
export const CANARY_VERSION:'CONDITION_PRICING_PRIVATE_CANARY_V1';
export function getConditionCanaryCatalogV1(client:ConditionReadClient):Promise<ConditionCanaryPrinting[]>;
export function getConditionCanaryPriceV1(client:ConditionReadClient,request:{cardPrintingId:string;condition:ConditionCode;now?:string}):Promise<ConditionCanaryPrice|null>;
export function createConditionCanaryHandlerV1(dependencies:{authorize:(request:Request)=>Promise<{authenticated:boolean;founder:boolean}>;read:(selection:{cardPrintingId:string;condition:ConditionCode})=>Promise<ConditionCanaryPrice|null>}):(request:Request)=>Promise<Response>;
