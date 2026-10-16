import {NextRequest,NextResponse} from 'next/server'
import {requireSoffAdmin,missingMigration} from '@/lib/serverAdmin'
export const runtime='nodejs'
const KEYS=['id','internal_code','barcode'] as const
const FIELDS=['stock','price_minorista','price_mayorista','price_peluquero','price_revendedor'] as const
export async function POST(req:NextRequest){
 const check=await requireSoffAdmin(req);if(check.error)return check.error
 // Prevención de cargas masivas accidentales o abusivas.
 if(Number(req.headers.get('content-length')||0)>250000)return NextResponse.json({error:'Archivo demasiado grande.'},{status:413})
 const x=await req.json().catch(()=>null)
 if(!x||typeof x!=='object'||!Array.isArray(x.rows)||x.rows.length<1||x.rows.length>600 ||x.confirmed!==true)
   return NextResponse.json({error:'Confirmá entre 1 y 600 registros.'},{status:400})
 const rows:Record<string,unknown>[]=[]
 for(const raw of x.rows){
   if(!raw||typeof raw!=='object'||Array.isArray(raw))return NextResponse.json({error:'Registro inválido.'},{status:400})
   const obj=raw as Record<string,unknown>
   const keys=KEYS.filter(k=>typeof obj[k]==='string'&&String(obj[k]).trim())
   if(keys.length!==1)return NextResponse.json({error:'Cada producto debe tener exactamente un identificador.'},{status:400})
   const key=keys[0],value=String(obj[key]).trim()
   if(value.length>100 || value.length<1 || (key==='id'&&!/^[a-f\d-]{36}$/i.test(value)))
     return NextResponse.json({error:'Identificador inválido.'},{status:400})
   const row:Record<string,unknown>={[key]:value}
   for(const f of FIELDS){
     if(obj[f]===undefined || obj[f]===null)continue
     if(typeof obj[f]!=='number'||!Number.isFinite(obj[f] as number))return NextResponse.json({error:`Valor inválido: ${f}`},{status:400})
     const n=obj[f] as number
     if(f==='stock' && (!Number.isInteger(n)||n<0||n>1000000))return NextResponse.json({error:'Stock fuera de límites.'},{status:400})
     if(f!=='stock' && (n<=0||n>100000000||Math.round(n*100)!==n*100 && Math.abs(Math.round(n*100)-n*100)>0.000001))return NextResponse.json({error:'Precio inválido.'},{status:400})
     row[f]=n
   }
   if(Object.keys(row).length<2)return NextResponse.json({error:'La fila no contiene cambios.'},{status:400})
   rows.push(row)
 }
 const {data,error}=await check.db.rpc('soff_admin_apply_catalog_batch',{p_admin_id:check.userId,p_rows:rows})
 if(error){console.error('P006 CSV bulk:',error.code);return NextResponse.json({error:missingMigration(error.code)?'Falta aplicar SQL P006 en Supabase.':'Importación rechazada sin aplicar cambios. Revisá códigos duplicados, stocks y precios.'},{status:missingMigration(error.code)?503:409})}
 return NextResponse.json({success:true,updated:data?.updated||0})
}
