import {NextResponse} from 'next/server';
import {getPublicVaultInstanceByGvvi} from '@/lib/vault/getPublicVaultInstanceByGvvi';
import {createServerAdminClient} from '@/lib/supabase/admin';
import {resolveCardImageFieldsV1} from '@/lib/canon/resolveCardImageFieldsV1';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const columns='image_source,image_path,image_url,image_alt_url,image_status,image_note';
export async function GET(_request:Request,{params}:{params:Promise<{gvvi:string}>}){
 const {gvvi}=await params;
 const missing=()=>new NextResponse(null,{status:404,headers:{'Cache-Control':'private, no-store'}});
 if(!/^GVVI-[A-Z0-9]+-[0-9]{6}$/.test(gvvi))return missing();
 try{
  // Public eligibility is reproved by the existing exact-copy reader. Owner photos are never considered.
  const detail=await getPublicVaultInstanceByGvvi(gvvi);
  if(!detail?.isVendorOffer||!detail.cardPrintingId)return missing();
  const admin=createServerAdminClient();
  const [parent,child]=await Promise.all([
   admin.from('card_prints').select(`id,gv_id,name,set_code,number,variant_key,printed_identity_modifier,representative_image_url,${columns}`).eq('id',detail.cardPrintId).maybeSingle(),
   admin.from('card_printings').select(`id,card_print_id,printing_gv_id,${columns}`).eq('id',detail.cardPrintingId).eq('card_print_id',detail.cardPrintId).maybeSingle(),
  ]);
  if(parent.error||child.error)throw new Error('Canonical artwork read unavailable');
  if(!parent.data||!child.data)return missing();
  const childImage=await resolveCardImageFieldsV1({...parent.data,...child.data,gv_id:child.data.printing_gv_id,representative_image_url:null});
  const parentImage=await resolveCardImageFieldsV1(parent.data);
  // A parent image is safe card-level coverage, never proof of the child's finish/stamp.
  const hasChildAsset=Boolean(child.data.image_path||child.data.image_url||child.data.image_alt_url);
  if(hasChildAsset&&childImage.display_image_kind==='blocked')return missing();
  const useChild=hasChildAsset&&Boolean(childImage.display_image_url);
  const chosen=useChild?childImage:parentImage;
  const kind=useChild?childImage.display_image_kind:'representative';
  if(!chosen.display_image_url||!['exact','representative','missing_variant_visual'].includes(kind)||parentImage.display_image_kind==='blocked')return missing();
  return NextResponse.json({version:'SQUARE_CANONICAL_ARTWORK_V1',gvvi,cardPrintId:detail.cardPrintId,printingId:detail.cardPrintingId,
   url:chosen.display_image_url,kind},{headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return NextResponse.json({error:'Canonical artwork is temporarily unavailable.'},{status:503,headers:{'Cache-Control':'private, no-store'}});}
}
