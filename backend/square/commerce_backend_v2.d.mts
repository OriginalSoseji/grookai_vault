import type {SquareBackend} from './backend_service_v1.mjs';
type Commerce = {
 preferences(ownerId:string,connectionId:string,input:{autoEnroll:boolean;sellOnSquare:boolean;confirmed:boolean}):Promise<unknown>;
 processConnection(ownerId:string,connectionId:string,input?:{maxTargets?:number;manual?:boolean;focusInstanceId?:string}):Promise<unknown>;
 reconcile(ownerId:string,connectionId:string):Promise<unknown>;
 withdraw(ownerId:string,connectionId:string,targetId:string):Promise<unknown>;
 releaseStock(ownerId:string,connectionId:string,targetId:string,input:{confirmed:boolean;physicalCopyPresent:boolean;registerOnline:boolean}):Promise<unknown>;
 receiveReturn(ownerId:string,connectionId:string,saleId:string,confirmed:boolean):Promise<unknown>;
};
export function createSquareCommerceBackend():SquareBackend & {commerce:Commerce};
