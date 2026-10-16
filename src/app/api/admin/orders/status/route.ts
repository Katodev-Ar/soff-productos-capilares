import {NextRequest,NextResponse} from 'next/server'
import {requireSoffAdmin,missingMigration} from '@/lib/serverAdmin'
export const runtime='nodejs'
const UUID=/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i
const STATUSES=new Set(['en_preparacion','enviado','entregado','cancelado'])
export async function POST(req:NextRequest){
  const check=await requireSoffAdmin(req)
  if(check.error)return check.error
  const input=await req.json().catch(()=>null)
  if(!input||typeof input!=='object'||Array.isArray(input))return NextResponse.json({error:'Solicitud inválida.'},{status:400})
  const {orderId,newStatus,reason,bankChecked}=input as Record<string,unknown>
  if(typeof orderId!=='string'||!UUID.test(orderId)||typeof newStatus!=='string'||!STATUSES.has(newStatus)
     ||typeof reason!=='string'||reason.length>400||typeof bankChecked!=='boolean')return NextResponse.json({error:'Datos de cambio de estado inválidos.'},{status:400})
  if(newStatus==='cancelado' && bankChecked!==true)return NextResponse.json({error:'Verificá los cobros pendientes antes de cancelar.'},{status:400})
  const {data,error}=await check.db.rpc('soff_admin_change_order_status',{
    p_admin_id:check.userId,p_order_id:orderId,p_status:newStatus,p_reason:reason,p_bank_checked:bankChecked
  })
  if(error){console.error('P006 order status:',error.code);return NextResponse.json({error:missingMigration(error.code)?'Falta aplicar SQL P006 en Supabase.':'Estado no permitido. Verificá el estado actual y si hubo pagos.'},{status:missingMigration(error.code)?503:409})}
  return NextResponse.json({success:true,newStatus:data?.status})
}
