/** Altas y cambios del catálogo; nunca borrar ni editar stock desde este editor. */
import {NextRequest,NextResponse} from 'next/server'
import {requireSoffAdmin} from '@/lib/serverAdmin'
import {PRODUCT_CATEGORIES} from '@/lib/catalog'
export const runtime='nodejs'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALLOWED=['name','category','description','how_to_use','image_url','barcode','internal_code','price_minorista','price_mayorista','price_peluquero','price_revendedor'] as const
const PRICE_FIELDS=['price_minorista','price_mayorista','price_peluquero','price_revendedor'] as const
function parse(body:unknown){
  if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('Datos del producto inválidos.')
  const raw=body as Record<string,unknown>,o:Record<string,string|number|null>={}
  // No aceptar stock, price_base, permisos ni cualquier otra columna del cliente.
  if(Object.keys(raw).some(k=>k!=='id'&&!ALLOWED.some(allowed=>allowed===k)))throw new Error('Se recibieron campos no autorizados.')
  for(const field of ['name','category','description','how_to_use','image_url','barcode','internal_code'] as const){
    if(raw[field]!==undefined&&typeof raw[field]!=='string'&&raw[field]!==null)throw new Error(`Dato inválido: ${field}`)
    const v=typeof raw[field]==='string'?raw[field].trim():''
    if(v.length>1500)throw new Error(`Texto demasiado largo: ${field}`)
    o[field]=v||null
  }
  if(!o.name||String(o.name).length>240)throw new Error('El nombre es obligatorio (máximo 240 caracteres).')
  if(o.category&&!PRODUCT_CATEGORIES.some(c=>c===o.category))throw new Error('Seleccioná una categoría válida.')
  if(o.image_url){
    try{const u=new URL(String(o.image_url));if(u.protocol!=='https:')throw Error()}catch{throw new Error('La imagen debe tener una URL HTTPS válida.')}
  }
  for(const f of ['barcode','internal_code'] as const){if(o[f]&&String(o[f]).length>100)throw new Error(`${f}: máximo 100 caracteres.`)}
  for(const f of PRICE_FIELDS){
    const v=raw[f]
    if((typeof v!=='number'&&typeof v!=='string')||v===''||!Number.isFinite(Number(v))||Number(v)<0||Number(v)>1000000000)throw new Error(`Precio inválido: ${f}`)
    const n=Number(v)
    if(Math.round(n*100)!==n*100&&Math.abs(Math.round(n*100)-n*100)>0.00001)throw new Error(`Máximo dos decimales: ${f}`)
    o[f]=Math.round(n*100)/100
  }
  if((o.price_minorista as number)<=0)throw new Error('El precio minorista debe ser positivo.')
  return o
}
export async function POST(req:NextRequest){return save(req,false)}
export async function PATCH(req:NextRequest){return save(req,true)}
async function save(req:NextRequest,update:boolean){
  const auth=await requireSoffAdmin(req);if(auth.error)return auth.error
  if(Number(req.headers.get('content-length')||0)>10000)return NextResponse.json({error:'Solicitud demasiado grande.'},{status:413})
  const body=await req.json().catch(()=>null)
  let fields:ReturnType<typeof parse>
  try{fields=parse(body)}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Datos inválidos'},{status:400})}
  const id=(body as Record<string,unknown>).id
  if(update&& (typeof id!=='string'||!uuid.test(id)))return NextResponse.json({error:'ID inválido.'},{status:400})
  if(!update&&id!==undefined)return NextResponse.json({error:'El ID lo genera el servidor.'},{status:400})
  for(const column of ['barcode','internal_code'] as const){
    const value=fields[column]
    if(!value)continue
    const {data,error}=await auth.db.from('products').select('id').eq(column,value).limit(3)
    if(error)return NextResponse.json({error:'No se pudo verificar el código del producto.'},{status:503})
    if((data||[]).some(p=>p.id!==id))return NextResponse.json({error:`El ${column} ya pertenece a otro producto. Revisalo antes de guardar.`},{status:409})
  }
  // Los ajustes de stock deben ir por el flujo de inventario P004/P006. Esta ruta jamás modifica existencias.
  const result=update
    ? await auth.db.from('products').update(fields).eq('id',id).select('id').maybeSingle()
    : await auth.db.from('products').insert({...fields,stock:0}).select('id').single()
  if(result.error)return NextResponse.json({error:'No se pudo guardar. Revisá los datos y los permisos.'},{status:409})
  if(update&&!result.data)return NextResponse.json({error:'No se encontró el producto.'},{status:404})
  return NextResponse.json({success:true,id:result.data?.id},{headers:{'Cache-Control':'no-store'}})
}
