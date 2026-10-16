import {NextRequest,NextResponse} from 'next/server'
import {requireSoffAdmin,missingMigration} from '@/lib/serverAdmin'
export const runtime='nodejs'
const UUID=/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i
export async function POST(req:NextRequest){
 const check=await requireSoffAdmin(req);if(check.error)return check.error
 const data=await req.json().catch(()=>null)
 if(!data||typeof data!=='object'||Array.isArray(data))return NextResponse.json({error:'Datos inválidos.'},{status:400})
 const {id,code,discountPercentage,maxUses,isActive}=data as Record<string,unknown>
 if(id!==null&&id!==undefined&&(typeof id!=='string'||!UUID.test(id)))return NextResponse.json({error:'Cupón inválido.'},{status:400})
 if(typeof code!=='string'||!/^[A-Z0-9_-]{3,40}$/.test(code)||typeof discountPercentage!=='number'||
    !Number.isFinite(discountPercentage)||discountPercentage<=0||discountPercentage>80 ||
    (maxUses!==null&&(!Number.isInteger(maxUses)||Number(maxUses)<1||Number(maxUses)>100000))||typeof isActive!=='boolean')
   return NextResponse.json({error:'Código, descuento o límite inválidos.'},{status:400})
 const {data:result,error}=await check.db.rpc('soff_admin_upsert_coupon',{
   p_admin_id:check.userId,p_id:id||null,p_code:code,p_discount:discountPercentage,p_max_uses:maxUses,p_is_active:isActive
 })
 if(error){console.error('P006 coupon:',error.code);return NextResponse.json({error:missingMigration(error.code)?'Falta aplicar SQL P006 en Supabase.':'No se pudo guardar el cupón. Revisá código, usos y descuentos.'},{status:missingMigration(error.code)?503:409})}
 return NextResponse.json({success:true,id:result?.id})
}
