import { NextRequest, NextResponse } from 'next/server'
import { requireSoffAdmin, missingMigration } from '@/lib/serverAdmin'
import { fiscalCents, fiscalCSV, FISCAL_STATUS_FOR_ORDER, SOFF_FISCAL_TYPES, SOFF_FISCAL_CLASSES } from '@/lib/fiscal'
export const runtime = 'nodejs'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CUIT = /^\d{11}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const DATE_RANGE_MAX_DAYS = 366
const CURRENCIES = ['ARS']
const DOC_TYPES = ['CUIT','DNI','CF']
function dateValid(value: string) {
  if (!DATE.test(value)) return false
  const d=new Date(value+'T12:00:00Z')
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10)===value
}
function parseRange(url: URL) {
  const now=new Date()
  const from=url.searchParams.get('from') || now.toISOString().slice(0,7)+'-01'
  const to=url.searchParams.get('to') || now.toISOString().slice(0,10)
  if(!dateValid(from)||!dateValid(to)||from>to || (Date.parse(to)-Date.parse(from))/86400000>DATE_RANGE_MAX_DAYS) return null
  return {from,to}
}

export async function GET(req: NextRequest) {
  const auth=await requireSoffAdmin(req); if(auth.error) return auth.error
  const range=parseRange(req.nextUrl)
  if (!range) return NextResponse.json({error:'Indicá fechas válidas (máximo 366 días).'}, {status:400})
  // El informe nunca devuelve un subconjunto silencioso; si excede el máximo se exige acotar las fechas.
  const {data:orders,error:ordersError}=await auth.db.from('orders')
    .select('id,total,status,created_at').gte('created_at',range.from+'T00:00:00-03:00')
    .lte('created_at',range.to+'T23:59:59.999-03:00').order('created_at',{ascending:false}).limit(1001)
  if(ordersError) return NextResponse.json({error:'No se pudieron consultar pedidos.'},{status:503})
  if((orders?.length||0)>1000) return NextResponse.json({error:'Hay más de 1000 pedidos. Acotá el período para evitar un informe incompleto.'},{status:413})
  const ids=(orders||[]).map(o=>o.id)
  let docs:Record<string,unknown>[]=[]
  if(ids.length){
    for(let n=0;n<ids.length;n+=150){
      const {data,error}=await auth.db.from('soff_fiscal_documents')
        .select('id,order_id,document_class,voucher_type,point_of_sale,voucher_number,issued_on,total_amount,cae,created_at')
        .in('order_id',ids.slice(n,n+150)).order('created_at',{ascending:false})
      if(error) return NextResponse.json({error:missingMigration(error.code)?'Falta instalar la migración P007 en Supabase.':'No se pudo consultar el registro fiscal.'},{status:503})
      docs=docs.concat(data||[])
    }
  }
  const byOrder=new Map<string,Record<string,unknown>[]>()
  for(const d of docs){const id=String(d.order_id);byOrder.set(id,[...(byOrder.get(id)||[]),d])}
  const rows=(orders||[]).map(o=>{
    const od=byOrder.get(o.id)||[]
    const invoice=od.find(d=>d.document_class==='factura')
    const credits=od.filter(d=>d.document_class==='nota_credito')
    const creditCents=credits.reduce((s,c)=>s+(fiscalCents(c.total_amount)||0),0)
    const status = invoice ? (o.status==='cancelado' && credits.length===0?'Revisar nota de crédito':'Comprobante registrado') :
      (FISCAL_STATUS_FOR_ORDER.has(o.status) ? 'Pendiente de registrar factura' : 'Sin factura registrada')
    return {id:o.id,created_at:o.created_at,order_status:o.status,order_total:o.total,
      fiscal_status:status,invoice_type:invoice?.voucher_type||null,invoice_id:invoice?.id||null,
      invoice_number:invoice?`${String(invoice.point_of_sale).padStart(5,'0')}-${String(invoice.voucher_number).padStart(8,'0')}`:null,
      invoice_cae:invoice?.cae||null,invoice_total:invoice?.total_amount||null,
      credit_count:credits.length,credit_total:(creditCents/100).toFixed(2)}
  })
  if(req.nextUrl.searchParams.get('format')==='csv'){
    const headers=['Pedido','Fecha','Estado pedido','Total pedido ARS','Situación fiscal','Tipo comprobante','Punto venta - número','CAE registrado','Total factura ARS','Notas de crédito','Total notas de crédito ARS']
    const payload=fiscalCSV(headers,rows.map(r=>[r.id,r.created_at,r.order_status,r.order_total,r.fiscal_status,r.invoice_type,r.invoice_number,r.invoice_cae,r.invoice_total,r.credit_count,r.credit_total]))
    return new NextResponse(payload,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="soff-control-fiscal.csv"','Cache-Control':'no-store'}})
  }
  return NextResponse.json({rows,from:range.from,to:range.to,count:rows.length},{headers:{'Cache-Control':'no-store'}})
}

export async function POST(req:NextRequest){
  const auth=await requireSoffAdmin(req);if(auth.error)return auth.error
  if(Number(req.headers.get('content-length')||0)>16_000)return NextResponse.json({error:'Solicitud demasiado grande.'},{status:413})
  const obj=await req.json().catch(()=>null)
  if(!obj||typeof obj!=='object'||Array.isArray(obj))return NextResponse.json({error:'Datos inválidos.'},{status:400})
  const i=obj as Record<string,unknown>
  const str=(key:string) => typeof i[key]==='string'?String(i[key]).trim():''
  const docClass=str('documentClass'),voucherType=str('voucherType'),docType=str('recipientDocType')
  const orderId=str('orderId'),issuerCuit=str('issuerCuit'),recipientDoc=str('recipientDocNumber')
  const cae=str('cae'),issuedOn=str('issuedOn'),caeExpiry=str('caeExpiry')
  const referenceId=str('referenceDocumentId')
  const pos=i.pointOfSale,voucherNumber=i.voucherNumber
  if(!UUID.test(orderId)||!SOFF_FISCAL_CLASSES.some(x=>x===docClass)||!SOFF_FISCAL_TYPES.some(x=>x===voucherType)||
     !CUIT.test(issuerCuit)||!DOC_TYPES.includes(docType)||!/^\d{1,11}$/.test(recipientDoc)||
     (docType==='CUIT'&&!CUIT.test(recipientDoc))||!/^\d{14}$/.test(cae)||!dateValid(issuedOn)||!dateValid(caeExpiry)||
     !Number.isInteger(pos)||Number(pos)<1||Number(pos)>99999||!Number.isInteger(voucherNumber)||Number(voucherNumber)<1||Number(voucherNumber)>99999999||
     i.checkedAgainstArca!==true||!CURRENCIES.includes(str('currency'))||
     (docClass==='nota_credito'&&!UUID.test(referenceId))||(docClass==='factura'&&referenceId)){
       return NextResponse.json({error:'Verificá tipo, datos fiscales, CAE, numeración y comprobación manual ante ARCA.'},{status:400})
  }
  const dateNow=new Date().toISOString().slice(0,10)
  if(issuedOn>dateNow)return NextResponse.json({error:'La fecha de emisión no puede ser futura.'},{status:400})
  const fields=['netAmount','vatAmount','exemptAmount','nonTaxableAmount','otherTaxesAmount','totalAmount'] as const
  const cents=fields.map(k=>fiscalCents(i[k]))
  // TypeScript: el acumulador debe ser number, aunque fiscalCents pueda devolver null.
  const componentsTotalCents = cents.slice(0,5).reduce<number>((sum, value) => sum + (value ?? 0), 0)
  if(cents.some(n=>n===null)||cents[5]===0 || componentsTotalCents!==cents[5] ||
     (voucherType==='C' && cents[1]!==0))return NextResponse.json({error:'Los componentes fiscales deben sumar exactamente el total; factura C sin IVA discriminado.'},{status:400})
  // No se emite ni se confirma automáticamente ninguna factura: solo carga de documento autorizado fuera de SOFF.
  const {data,error}=await auth.db.rpc('soff_register_external_fiscal_document',{
    p_actor_id:auth.userId,p_order_id:orderId,p_document_class:docClass,p_voucher_type:voucherType,
    p_issuer_cuit:issuerCuit,p_recipient_type:docType,p_recipient_number:recipientDoc,
    p_pos:pos,p_number:voucherNumber,p_issued_on:issuedOn,p_cae:cae,p_cae_expiration:caeExpiry,
    p_net:((cents[0]||0)/100).toFixed(2),p_vat:((cents[1]||0)/100).toFixed(2),
    p_exempt:((cents[2]||0)/100).toFixed(2),p_non_taxable:((cents[3]||0)/100).toFixed(2),
    p_other_taxes:((cents[4]||0)/100).toFixed(2),p_total:((cents[5]||0)/100).toFixed(2),
    p_reference_document:referenceId || null
  })
  if(error){console.error('P007 fiscal registry:',error.code)
    return NextResponse.json({error:missingMigration(error.code)?'Falta aplicar SQL P007 en Supabase.':'Registro rechazado. Revisá CAE, pedido, importe, duplicados y nota de crédito.'},{status:missingMigration(error.code)?503:409})}
  return NextResponse.json({success:true,record:data},{headers:{'Cache-Control':'no-store'}})
}
