'use client'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {getAsSoffAdmin} from '@/lib/adminFetch'
import {type CatalogQualityRow} from '@/lib/catalogQuality'
import {AlertTriangle,Download,RefreshCw} from 'lucide-react'
import Link from 'next/link'
type QualityReport={counts:{total:number;withIssues:number;critical:number};byFlag:Record<string,number>;rows:CatalogQualityRow[]}
export default function CalidadCatalogoPage(){
  const [report,setReport]=useState<QualityReport|null>(null)
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(true)
  const [q,setQ]=useState('')
  const [level,setLevel]=useState('todos')
  const [exporting,setExporting]=useState(false)
  const load=useCallback(async()=>{
    setLoading(true);setError('')
    try{setReport(await getAsSoffAdmin('/api/admin/catalog/quality') as unknown as QualityReport)}
    catch(e){setError(e instanceof Error?e.message:'No se pudo cargar la auditoría')}
    finally{setLoading(false)}
  },[])
  useEffect(()=>{void load()},[load])
  const filtered=useMemo(()=>report?.rows.filter(row=>{
    const matches=(row.name+' '+row.category+' '+row.id).toLocaleLowerCase('es-AR').includes(q.toLocaleLowerCase('es-AR'))
    return matches && (level==='todos' || (level==='con_observaciones' && row.flags.length>0)||row.flags.some(f=>f.level===level))
  })||[],[report,q,level])
  async function exportCSV(){
    setExporting(true);setError('')
    try{
      // La exportación lleva el token de administrador, no se abre una URL pública.
      const {supabase}=await import('@/lib/supabase/client')
      const {data:{session}}=await supabase.auth.getSession()
      if(!session?.access_token)throw new Error('Ingresá nuevamente como administrador.')
      const res=await fetch('/api/admin/catalog/quality?format=csv',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'})
      if(!res.ok)throw new Error('No se pudo exportar el catálogo.')
      const blob=await res.blob(),url=URL.createObjectURL(blob)
      const a=document.createElement('a');a.href=url;a.download='soff-auditoria-catalogo.csv';a.click();URL.revokeObjectURL(url)
    }catch(e){setError(e instanceof Error?e.message:'Error exportando CSV')}
    finally{setExporting(false)}
  }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl md:text-3xl font-bold">Calidad del catálogo</h1><p className="text-gray-600 mt-1">Diagnóstico de datos; no modifica productos ni existencias.</p></div><div className="flex gap-2"><button onClick={()=>void load()} className="border rounded-lg px-3 py-2 flex items-center gap-2" disabled={loading}><RefreshCw size={16}/>Actualizar</button><button onClick={()=>void exportCSV()} disabled={!report||exporting} className="bg-black text-white rounded-lg px-3 py-2 flex items-center gap-2 disabled:opacity-40"><Download size={16}/>Exportar CSV</button></div></div>
    <p className="rounded-lg bg-amber-50 border border-amber-200 text-amber-900 p-3 text-sm">El campo <strong>price_base</strong> no está confirmado como costo. Los avisos de mayorista inferior a este valor no prueban pérdidas. Los códigos duplicados pueden representar variantes legítimas.</p>
    {error&&<div role="alert" className="rounded-lg bg-red-50 border border-red-200 text-red-800 p-3">{error}</div>}
    {loading?<p>Analizando catálogo…</p>:report&&<>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{[['Productos',report.counts.total],['Con observaciones',report.counts.withIssues],['Con problemas críticos',report.counts.critical]].map(([name,count])=><div key={String(name)} className="bg-white border rounded-xl p-4"><p className="text-sm text-gray-500">{name}</p><p className="text-2xl font-bold">{count}</p></div>)}</div>
      <div className="flex flex-wrap gap-2">{Object.entries(report.byFlag).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([code,n])=><span key={code} className="bg-white border rounded-full px-3 py-1 text-xs">{code.replaceAll('_',' ')}: {n}</span>)}</div>
      <div className="flex flex-wrap gap-3"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar producto, categoría o ID" className="border rounded-lg px-3 py-2 flex-1 min-w-52"/><select value={level} onChange={e=>setLevel(e.target.value)} className="border rounded-lg px-3 py-2"><option value="todos">Todos los productos</option><option value="con_observaciones">Con observaciones</option><option value="critico">Críticos</option><option value="revisar">A revisar</option><option value="informativo">Informativos</option></select></div>
      <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-sm"><thead className="bg-gray-50"><tr>{['Producto','Categoría','Observaciones'].map(h=><th key={h} className="text-left p-3">{h}</th>)}</tr></thead><tbody>{filtered.slice(0,300).map(p=><tr key={p.id} className="border-t align-top"><td className="p-3 min-w-52 font-medium">{p.name}</td><td className="p-3">{p.category}</td><td className="p-3 space-y-1">{p.flags.length?p.flags.map(f=><div key={f.code} className="flex gap-2 items-start"><AlertTriangle className={f.level==='critico'?'text-red-600 shrink-0 mt-1':'text-amber-600 shrink-0 mt-1'} size={13}/><span>{f.explanation}</span></div>):<span className="text-green-700">Sin observaciones de estas reglas</span>}</td></tr>)}</tbody></table></div>
      {filtered.length>300&&<p className="text-sm text-gray-600">Se muestran 300 de {filtered.length} productos. Usá los filtros o exportá el CSV completo.</p>}
      <p className="text-sm text-gray-600">Para editar un producto, ingresá al <Link href="/admin/productos" className="underline font-semibold">panel de productos</Link>. No se aplicaron cambios masivos.</p>
    </>}
  </div>
}
