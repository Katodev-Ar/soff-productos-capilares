'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {supabase} from '@/lib/supabase/client'
import {PRODUCT_CATEGORIES,formatPrice,type Product} from '@/lib/catalog'
import {Plus,Edit3,Package,AlertTriangle} from 'lucide-react'
type Editable={name:string;category:string;description:string;how_to_use:string;image_url:string;barcode:string;internal_code:string;price_minorista:number;price_mayorista:number;price_peluquero:number;price_revendedor:number}
const empty:Editable={name:'',category:'SIN CATEGORIA',description:'',how_to_use:'',image_url:'',barcode:'',internal_code:'',price_minorista:0,price_mayorista:0,price_peluquero:0,price_revendedor:0}
export default function AdminProductosPage(){
  const [products,setProducts]=useState<(Product&{how_to_use?:string|null})[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [search,setSearch]=useState('')
  const [editing,setEditing]=useState<string|null>(null)
  const [visible,setVisible]=useState(false)
  const [form,setForm]=useState<Editable>(empty)
  const [saving,setSaving]=useState(false)
  async function load(){
    setLoading(true);setError('')
    const all:(Product&{how_to_use?:string|null})[]=[]
    for(let page=0;page<10;page++){
      const {data,error}=await supabase.from('products').select('*').order('id').range(page*500,page*500+499)
      if(error){setError('No fue posible consultar los productos.');break}
      all.push(...(data||[]))
      if((data||[]).length<500)break
      if(page===9){setError('Hay más de 5000 productos: ampliar paginación.');break}
    }
    setProducts(all);setLoading(false)
  }
  useEffect(()=>{void load()},[])
  function open(product?:Product&{how_to_use?:string|null}){
    setEditing(product?.id||null)
    setForm(product?{
      name:product.name||'',category:product.category||'SIN CATEGORIA',description:product.description||'',how_to_use:product.how_to_use||'',image_url:product.image_url||'',barcode:product.barcode||'',internal_code:product.internal_code||'',
      price_minorista:Number(product.price_minorista)||0,price_mayorista:Number(product.price_mayorista)||0,price_peluquero:Number(product.price_peluquero)||0,price_revendedor:Number(product.price_revendedor)||0
    }:empty)
    setVisible(true);setError('')
  }
  async function save(event:React.FormEvent){
    event.preventDefault();if(saving)return
    setSaving(true);setError('')
    try{
      const {data:{session}}=await supabase.auth.getSession()
      if(!session?.access_token)throw new Error('Tu sesión venció. Volvé a ingresar.')
      const res=await fetch('/api/admin/catalog/product',{method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({...form,...(editing?{id:editing}:{})})})
      const body=await res.json().catch(()=>({error:'Respuesta inválida del servidor.'}))
      if(!res.ok)throw new Error(body.error||'Error al guardar el producto.')
      setVisible(false);await load()
    }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar.')}
    finally{setSaving(false)}
  }
  const filtered=products.filter(p=>(p.name+' '+(p.barcode||'')+' '+(p.internal_code||'')).toLocaleLowerCase('es-AR').includes(search.toLocaleLowerCase('es-AR')))
  return <div className="space-y-6">
    <div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-3xl font-bold flex items-center gap-2"><Package/> Catálogo</h1><p className="text-gray-600">{products.length} productos registrados</p></div><button onClick={()=>open()} className="bg-black text-white rounded-lg px-4 py-2 flex items-center gap-2"><Plus size={18}/>Nuevo producto</button></div>
    <p className="border border-amber-200 bg-amber-50 p-3 rounded-lg text-sm text-amber-900">El stock se modifica desde <Link className="font-semibold underline" href="/admin/stock">Importar Stock</Link>, para conservar la trazabilidad. No se permite eliminar productos desde este editor: podrían tener pedidos asociados. <Link className="underline" href="/admin/calidad-catalogo">Ver auditoría del catálogo</Link>.</p>
    {error&&<p className="text-red-800 bg-red-50 p-3 rounded-lg" role="alert">{error}</p>}
    <input className="w-full border rounded-lg p-3" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, código o barras"/>
    {loading?<p>Cargando productos…</p>:<div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-sm"><thead className="bg-gray-50"><tr>{['Producto','Minorista','Mayorista','Stock','Editar'].map(h=><th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{filtered.slice(0,500).map(p=><tr key={p.id} className="border-t"><td className="p-3 font-medium">{p.name}</td><td className="p-3">{formatPrice(p.price_minorista)}</td><td className="p-3">{formatPrice(p.price_mayorista)}</td><td className="p-3">{p.stock}</td><td className="p-3"><button aria-label={`Editar ${p.name}`} onClick={()=>open(p)}><Edit3 size={18}/></button></td></tr>)}</tbody></table>{filtered.length>500&&<p className="p-3 text-xs text-gray-600">Mostrando 500 resultados. Refiná la búsqueda.</p>}</div>}
    {visible&&<div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3"><form onSubmit={save} className="max-w-3xl w-full max-h-[90vh] overflow-auto rounded-xl bg-white p-5 space-y-4"><h2 className="text-xl font-bold">{editing?'Editar producto':'Nuevo producto'}</h2>
      <p className="text-sm text-gray-600 flex items-start gap-2"><AlertTriangle size={16} className="shrink-0"/>Los precios en cero para ciertos canales indican que no hay precio de venta. No ingreses descripciones ni modos de uso sin documentación del fabricante.</p>
      <label className="block text-sm">Nombre *<input required maxLength={240} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="block border rounded-lg p-2 w-full"/></label>
      <label className="block text-sm">Categoría<select className="block w-full border rounded-lg p-2" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{PRODUCT_CATEGORIES.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
      <div className="grid sm:grid-cols-2 gap-3">{(['barcode','internal_code'] as const).map(k=><label key={k} className="text-sm">{k==='barcode'?'Código de barras':'Código interno'}<input value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} className="block border rounded-lg p-2 w-full"/></label>)}</div>
      <label className="block text-sm">URL imagen HTTPS<input value={form.image_url} onChange={e=>setForm({...form,image_url:e.target.value})} className="block border rounded-lg p-2 w-full"/></label>
      <div className="grid sm:grid-cols-2 gap-3">{(['price_minorista','price_mayorista','price_peluquero','price_revendedor'] as const).map(k=><label key={k} className="text-sm">{k.replace('price_','Precio ')}<input type="number" required step="0.01" min={k==='price_minorista'?'0.01':'0'} value={form[k]} onChange={e=>setForm({...form,[k]:Number(e.target.value)})} className="block border rounded-lg p-2 w-full"/></label>)}</div>
      <label className="block text-sm">Descripción<textarea rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="block border rounded-lg p-2 w-full"/></label>
      <label className="block text-sm">Modo de uso (solo información verificada)<textarea rows={3} value={form.how_to_use} onChange={e=>setForm({...form,how_to_use:e.target.value})} className="block border rounded-lg p-2 w-full"/></label>
      {error&&<p role="alert" className="text-red-700">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={()=>{setVisible(false);setError('')}} className="border rounded-lg p-2">Cancelar</button><button disabled={saving} type="submit" className="bg-black text-white rounded-lg p-2 disabled:opacity-50">{saving?'Guardando…':'Guardar producto'}</button></div>
    </form></div>}
  </div>
}
