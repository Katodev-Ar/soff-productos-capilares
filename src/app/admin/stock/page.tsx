'use client'
import {useState} from 'react'
import Link from 'next/link'
import {UploadCloud,ArrowLeft,AlertTriangle,CheckCircle} from 'lucide-react'
import {parseSoffCatalogCsv,type CatalogRow} from '@/lib/soffCsv'
import {postAsSoffAdmin} from '@/lib/adminFetch'
export default function AdminStockCSVPage(){
 const [rows,setRows]=useState<CatalogRow[]>([])
 const [filename,setFilename]=useState('')
 const [error,setError]=useState('')
 const [result,setResult]=useState('')
 const [working,setWorking]=useState(false)
 const [accepted,setAccepted]=useState(false)
 const read=async(f?:File)=>{
  setRows([]);setError('');setResult('');setAccepted(false);setFilename(f?.name||'')
  if(!f)return
  if(f.size>1000000){setError('CSV máximo 1 MB.');return}
  try{setRows(parseSoffCatalogCsv(await f.text()))}
  catch(err){setError(err instanceof Error?err.message:'Archivo CSV incorrecto')}
 }
 const apply=async()=>{
  if(!rows.length||!accepted||working)return
  if(!window.confirm(`¿Confirmás la actualización de ${rows.length} productos? Este cambio modifica stock y/o precios reales cuando se conecte con Supabase.`))return
  setWorking(true);setError('');setResult('')
  try{const x=await postAsSoffAdmin('/api/admin/catalog/bulk',{rows,confirmed:true});setResult(`Se actualizaron ${String(x.updated)} productos correctamente.`);setAccepted(false);setRows([])}
  catch(err){setError(err instanceof Error?err.message:'Error en importación. No volver a cargar sin comprobar el resultado.')}
  finally{setWorking(false)}
 }
 return <div className="min-h-screen bg-gray-50 py-12 px-4 mt-16">
  <div className="max-w-5xl mx-auto space-y-5">
   <Link href="/admin" className="text-sm text-gray-600 flex items-center gap-2"><ArrowLeft size={16}/> Volver al panel</Link>
   <div className="rounded-2xl border bg-white p-6 space-y-4">
    <h1 className="text-2xl font-bold flex items-center gap-2"><UploadCloud/> Importación controlada CSV</h1>
    <p className="text-sm text-gray-700">Ahora se identifica cada producto por <strong>UUID</strong>, <strong>código interno</strong> o <strong>código de barras</strong>; nunca por nombre. Si hay identificadores repetidos en el catálogo, se rechaza el archivo completo sin aplicar cambios.</p>
    <p className="text-sm text-gray-700">Columnas admitidas: <code>id</code>, <code>codigo_interno</code>, <code>codigo_barras</code>, <code>stock</code>, <code>precio_minorista</code>, <code>precio_mayorista</code>, <code>precio_peluquero</code>, <code>precio_revendedor</code>. Una sola columna de identificación con valor por fila. No se aceptan stocks negativos ni precios 0.</p>
    <input type="file" accept=".csv,text/csv" aria-label="Seleccionar CSV" onChange={e=>read(e.target.files?.[0])} className="block w-full border rounded-lg p-3" />
    <p className="text-xs text-gray-500">Archivos de hasta 1 MB o 600 productos; delimitadores coma o punto y coma, UTF-8. Para decimales usá 1250.50 o 1250,50 (sin separadores de miles). No afecta la base hasta confirmar.</p>
    {filename&&<p className="text-sm">Archivo: <strong>{filename}</strong></p>}
    {error&&<p className="p-3 border border-red-200 bg-red-50 text-red-800 rounded flex gap-2" role="alert"><AlertTriangle size={20}/>{error}</p>}
    {result&&<p className="p-3 border border-green-200 bg-green-50 rounded flex gap-2" role="status"><CheckCircle/>{result}</p>}
    {rows.length>0&&<>
      <p className="font-semibold">Vista previa: {rows.length} productos preparados</p>
      <div className="overflow-x-auto border rounded-lg"><table className="text-xs min-w-full">
       <thead><tr className="bg-gray-100">{['Identificador','Stock','Minorista','Mayorista','Peluquero','Revendedor'].map(x=><th key={x} className="p-2 text-left">{x}</th>)}</tr></thead>
       <tbody>{rows.slice(0,15).map((row,i)=><tr key={i} className="border-t">
        <td className="p-2 font-mono">{row.id||row.internal_code||row.barcode}</td>
        <td className="p-2">{row.stock??'—'}</td><td className="p-2">{row.price_minorista??'—'}</td>
        <td className="p-2">{row.price_mayorista??'—'}</td><td className="p-2">{row.price_peluquero??'—'}</td>
        <td className="p-2">{row.price_revendedor??'—'}</td></tr>)}</tbody>
       </table></div>
       {rows.length>15&&<p className="text-xs text-gray-500">Se muestran las primeras 15 filas.</p>}
       <label className="flex gap-2 text-sm items-center"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>
         Revisé el archivo y autorizo los cambios. Tengo un respaldo de inventario.</label>
       <button disabled={!accepted||working} onClick={apply} className="px-5 py-3 bg-black text-white rounded-lg disabled:opacity-30">
         {working?'Actualizando...':'Confirmar actualización en la base de datos'}</button>
    </>}
   </div>
  </div>
 </div>
}
