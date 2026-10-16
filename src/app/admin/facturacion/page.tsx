'use client'

import {useCallback,useEffect,useState} from 'react'
import {supabase} from '@/lib/supabase/client'
import {postAsSoffAdmin} from '@/lib/adminFetch'
import {fiscalCents} from '@/lib/fiscal'

type FiscalRow = {
  id:string;created_at:string;order_status:string;order_total:number;
  fiscal_status:string;invoice_type:string|null;invoice_id:string|null;
  invoice_number:string|null;invoice_cae:string|null;invoice_total:number|null;
  credit_count:number;credit_total:string;
}
const today = new Date().toISOString().slice(0,10)
const first = today.slice(0,7)+'-01'
const empty = {orderId:'',documentClass:'factura',voucherType:'B',issuerCuit:'',
 recipientDocType:'DNI',recipientDocNumber:'',pointOfSale:'',voucherNumber:'',issuedOn:today,
 cae:'',caeExpiry:'',netAmount:'',vatAmount:'0',exemptAmount:'0',nonTaxableAmount:'0',
 otherTaxesAmount:'0',totalAmount:'',currency:'ARS',referenceDocumentId:'',checkedAgainstArca:false}

export default function FacturacionControl(){
  const [from,setFrom]=useState(first),[to,setTo]=useState(today)
  const [rows,setRows]=useState<FiscalRow[]>([]),[notice,setNotice]=useState(''),[error,setError]=useState('')
  const [loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[exporting,setExporting]=useState(false)
  const [draft,setDraft]=useState({...empty})
  const update=(key:keyof typeof empty,value:string|boolean)=>setDraft(current=>({...current,[key]:value}))
  const selected = rows.find(r=>r.id===draft.orderId)
  const amountKeys=['netAmount','vatAmount','exemptAmount','nonTaxableAmount','otherTaxesAmount'] as const
  const components = amountKeys.map(key=>fiscalCents(draft[key]))
  const amountTotal=fiscalCents(draft.totalAmount)
  const balanced=components.every(x=>x!==null) && amountTotal!==null && amountTotal>0 && components.reduce<number>((sum,x)=>sum+(x||0),0)===amountTotal

  const getToken=async()=>{
    const {data:{session}}=await supabase.auth.getSession()
    if(!session?.access_token)throw new Error('Iniciá sesión como administrador.')
    return session.access_token
  }
  const reportUrl=(format?:string)=>'/api/admin/fiscal?'+new URLSearchParams({from,to,...format?{format}:{}})
  const refresh=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const token=await getToken()
      const res=await fetch(reportUrl(),{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'No se pudo consultar el reporte')
      setRows(body.rows||[])
    }catch(e){setRows([]);setError(e instanceof Error?e.message:'Error de consulta')}
    finally{setLoading(false)}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[from,to])
  useEffect(()=>{void refresh()},[refresh])

  async function downloadCSV(){
    setExporting(true);setError('')
    try{
      const token=await getToken()
      const res=await fetch(reportUrl('csv'),{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      if(!res.ok){const body=await res.json();throw new Error(body.error||'No se pudo exportar')}
      const blob=await res.blob()
      const url=URL.createObjectURL(blob)
      const a=document.createElement('a');a.href=url;a.download=`soff_control_fiscal_${from}_${to}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)
    }catch(e){setError(e instanceof Error?e.message:'Error al exportar')}
    finally{setExporting(false)}
  }
  async function register(){
    if(!selected)return setError('Seleccioná un pedido del reporte.')
    if(!balanced)return setError('Los cinco componentes del comprobante deben sumar exactamente el total.')
    if(!draft.checkedAgainstArca)return setError('Tenés que revisar el comprobante autorizado antes de registrarlo.')
    if(!window.confirm('¿Comprobaste el comprobante REAL en ARCA? Este registro quedará inmutable y NO emite facturas.'))return
    setSaving(true);setError('');setNotice('')
    try{
      await postAsSoffAdmin('/api/admin/fiscal',{
        ...draft,pointOfSale:Number(draft.pointOfSale),voucherNumber:Number(draft.voucherNumber),
        referenceDocumentId:draft.documentClass==='nota_credito'?selected.invoice_id:null,
      })
      setNotice('Comprobante EXTERNO registrado. Esto no significa que SOFF lo haya emitido ni validado ante ARCA.')
      setDraft({...empty})
      await refresh()
    }catch(e){setError(e instanceof Error?e.message:'No se pudo registrar')}
    finally{setSaving(false)}
  }
  const eligible=rows.filter(r=>['pagado','en_preparacion','enviado','entregado'].includes(r.order_status))
  const pending=eligible.filter(r=>!r.invoice_id)
  const withInvoice=rows.filter(r=>r.invoice_id)
  return <main className="space-y-7 p-4 text-gray-900">
    <div><h1 className="text-2xl font-bold">Control fiscal y contable</h1>
      <p className="mt-2 text-sm text-gray-700">P007: seguimiento de pedidos y comprobantes ya autorizados fuera de SOFF.
        <strong> No se emiten facturas, no se obtienen CAE ni se determina IVA automáticamente.</strong></p></div>
    <div className="p-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-950 text-sm">
      Para habilitar el registro de documentos se debe configurar la CUIT fiscal del emisor y ejecutar el SQL P007 en Supabase.
      El administrador debe corroborar el CAE en ARCA. La declaración manual no constituye verificación electrónica.</div>
    <section className="bg-white rounded-lg border p-4 space-y-4">
      <h2 className="font-semibold">Pedidos y facturas</h2>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">Desde<input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="block border rounded p-2 mt-1"/></label>
        <label className="text-sm">Hasta<input type="date" value={to} onChange={e=>setTo(e.target.value)} className="block border rounded p-2 mt-1"/></label>
        <button type="button" onClick={()=>void refresh()} disabled={loading} className="bg-gray-900 text-white rounded px-4 py-2 disabled:opacity-60">{loading?'Consultando…':'Actualizar'}</button>
        <button type="button" onClick={()=>void downloadCSV()} disabled={exporting||loading} className="border border-gray-600 rounded px-4 py-2 disabled:opacity-60">{exporting?'Exportando…':'Exportar CSV'}</button>
      </div>
      <p className="text-sm text-gray-700">Pedidos del período: <b>{rows.length}</b> · Acreditados sin factura registrada: <b>{pending.length}</b> · Con factura registrada: <b>{withInvoice.length}</b>. Máximo 1.000 pedidos por consulta; reducir el período si es necesario.</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[790px] text-xs md:text-sm"><thead><tr className="bg-gray-100 text-left">
        {['Pedido','Fecha','Estado','Total ARS','Situación fiscal','Comprobante'].map(h=><th key={h} className="p-2">{h}</th>)}
      </tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t">
        <td className="p-2 font-mono" title={r.id}>{r.id.slice(0,8)}</td>
        <td className="p-2">{new Date(r.created_at).toLocaleDateString('es-AR')}</td>
        <td className="p-2">{r.order_status}</td><td className="p-2 tabular-nums">{Number(r.order_total).toLocaleString('es-AR',{minimumFractionDigits:2})}</td>
        <td className="p-2">{r.fiscal_status}</td><td className="p-2">{r.invoice_number||'—'}</td>
      </tr>)}</tbody></table></div>
      {!rows.length&&!loading&&!error&&<p className="text-sm text-gray-500">No hay pedidos para el período.</p>}
    </section>
    <section className="bg-white rounded-lg border p-4 space-y-4">
      <h2 className="font-semibold">Registrar comprobante autorizado externamente</h2>
      <p className="text-sm text-gray-600">Cargá solamente los datos que figuran en el comprobante REAL emitido por el sistema autorizado. No inventes IVA, número ni CAE. Los registros no se pueden borrar ni editar.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-sm">Clase de documento
          <select value={draft.documentClass} onChange={e=>{update('documentClass',e.target.value);update('orderId','')}} className="block border rounded p-2 mt-1 w-full"><option value="factura">Factura</option><option value="nota_credito">Nota de crédito</option></select>
        </label>
        <label className="text-sm">Pedido
          <select value={draft.orderId} onChange={e=>update('orderId',e.target.value)} className="block border rounded p-2 mt-1 w-full"><option value="">Seleccioná un pedido</option>
            {rows.filter(r=>draft.documentClass==='factura'?(eligible.some(x=>x.id===r.id)&&!r.invoice_id):Boolean(r.invoice_id)).map(r=><option key={r.id} value={r.id}>{r.id.slice(0,8)} · $ {r.order_total} {r.invoice_number?'· Factura '+r.invoice_number:''}</option>)}
          </select></label>
        <label className="text-sm">Tipo fiscal<select value={draft.voucherType} onChange={e=>update('voucherType',e.target.value)} className="block border rounded p-2 mt-1 w-full">{['A','B','C','M'].map(x=><option key={x}>{x}</option>)}</select></label>
        {([['issuerCuit','CUIT del emisor'],['recipientDocNumber','Documento del receptor'],['pointOfSale','Punto de venta'],['voucherNumber','Número de comprobante'],['cae','CAE (14 dígitos)']] as const).map(([key,label])=><label key={key} className="text-sm">{label}<input type="text" value={draft[key]} onChange={e=>update(key,e.target.value)} className="block border rounded p-2 mt-1 w-full"/></label>)}
        <label className="text-sm">Tipo de documento receptor<select value={draft.recipientDocType} onChange={e=>update('recipientDocType',e.target.value)} className="block border rounded p-2 mt-1 w-full"><option>CUIT</option><option>DNI</option><option value="CF">Consumidor final (CF)</option></select></label>
        <label className="text-sm">Fecha de emisión<input type="date" value={draft.issuedOn} onChange={e=>update('issuedOn',e.target.value)} className="block border rounded p-2 mt-1 w-full"/></label>
        <label className="text-sm">Vencimiento del CAE<input type="date" value={draft.caeExpiry} onChange={e=>update('caeExpiry',e.target.value)} className="block border rounded p-2 mt-1 w-full"/></label>
        {([['netAmount','Neto gravado / monto sin IVA discriminado'],['vatAmount','IVA según comprobante'],['exemptAmount','Exento'],['nonTaxableAmount','No gravado'],['otherTaxesAmount','Otros tributos'],['totalAmount','Total de la factura o NC']] as const).map(([key,label])=><label key={key} className="text-sm">{label} (ARS)
          <input inputMode="decimal" placeholder="0.00" type="text" value={draft[key]} onChange={e=>update(key,e.target.value.replace(',','.'))} className="block border rounded p-2 mt-1 w-full"/></label>)}
      </div>
      {selected&&<p className="text-sm text-gray-700">Pedido seleccionado: <b>${Number(selected.order_total).toLocaleString('es-AR',{minimumFractionDigits:2})}</b>. {draft.documentClass==='nota_credito'?'Nota de crédito vinculada a la factura '+selected.invoice_number:'La factura debe coincidir con el total del pedido.'}</p>}
      <p className={balanced?'text-green-700 text-sm':'text-amber-700 text-sm'}>{balanced?'Componentes del comprobante: suman exactamente el total.':'Revisá que los importes sumen exactamente el total, con dos decimales.'}</p>
      <label className="flex gap-2 text-sm items-start"><input type="checkbox" checked={draft.checkedAgainstArca} onChange={e=>update('checkedAgainstArca',e.target.checked)} className="mt-1"/><span>Comprobé manualmente la existencia, numeración y CAE en los canales oficiales de ARCA. Comprendo que SOFF NO realiza esa verificación.</span></label>
      <button type="button" disabled={saving||!balanced||!selected||!draft.checkedAgainstArca} onClick={()=>void register()} className="bg-blue-900 text-white px-4 py-2 rounded disabled:opacity-40">{saving?'Registrando…':'Registrar comprobante externo'}</button>
    </section>
    {error&&<p role="alert" className="bg-red-50 text-red-800 p-3 rounded">{error}</p>}
    {notice&&<p role="status" className="bg-green-50 text-green-900 p-3 rounded">{notice}</p>}
  </main>
}
