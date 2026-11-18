export type ConditionCode='NM'|'LP'|'MP'|'HP'|'DMG';
export type ConditionPriceV1={version:'CONDITION_PRICE_READ_MODEL_V1';status:'available'|'unavailable';confidence:'medium'|'unavailable';card_printing_id:string;condition:ConditionCode;amount:number|null;currency:null;currency_hint:'USD';currency_verified:false;source_label:string;provider_updated_at:string|null;pricing_lane:'reference';unavailable_reason:string|null};
export const CONDITION_PRICE_VERSION:'CONDITION_PRICE_READ_MODEL_V1';
export function getConditionPriceV1(client:{from:(relation:string)=>unknown},selection:{cardPrintingId:string;condition:ConditionCode;now?:string}):Promise<ConditionPriceV1>;
export function createConditionPriceHandlerV1(dependencies:{authorize:(request:Request)=>Promise<boolean>;read:(selection:{cardPrintingId:string;condition:ConditionCode})=>Promise<ConditionPriceV1>}):(request:Request)=>Promise<Response>;
