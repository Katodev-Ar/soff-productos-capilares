'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Eye, Palette, Save } from 'lucide-react'
import { postAsSoffAdmin } from '@/lib/adminFetch'
import { useStorefrontTheme } from '@/components/storefront/StorefrontThemeProvider'
import { DEFAULT_STOREFRONT_THEME, isStorefrontTheme, type StorefrontTheme } from '@/lib/storefrontTheme'

type ThemeInfo = { id: StorefrontTheme; name: string; info: string; caption: string; background: string; topBar: string; foreground: string; hero: string; accent: string; card: string }
const THEMES: ThemeInfo[] = [
  { id:'clasico', name:'Clásico Beauty', info:'Rosa suave, claridad y el estilo original de SOFF.', caption:'SOFF BEAUTY', background:'#fff5f8', topBar:'#f28599', foreground:'#002f5b', hero:'#f6dce6', accent:'#002f5b', card:'#fff' },
  { id:'premium', name:'Premium Grafito', info:'Negro carbón, azul cian y presentación sofisticada.', caption:'SOFF PREMIUM', background:'#0b131a', topBar:'#122c3b', foreground:'#f3faff', hero:'#203543', accent:'#2ac5e8', card:'#eaf1f5' },
  { id:'perla', name:'Perla Editorial', info:'Gris perla, azul oceánico y estética de revista.', caption:'SOFF EDITORIAL', background:'#edf4f7', topBar:'#155776', foreground:'#173b50', hero:'#dcecf4', accent:'#127ea4', card:'#f9fcff' },
  { id:'aurora', name:'Aurora Studio', info:'Azul noche, acentos cian y reflejos violeta.', caption:'SOFF AURORA', background:'#091b36', topBar:'#343779', foreground:'#f2faff', hero:'#233d69', accent:'#69ddef', card:'#25436a' },
  { id:'salvia', name:'Salvia Botánica', info:'Verde salvia, crema y una estética natural de salón.', caption:'SOFF BOTÁNICA', background:'#eef2e8', topBar:'#315f49', foreground:'#244c38', hero:'#dae8d5', accent:'#32664d', card:'#f8faf3' },
  { id:'malva', name:'Malva Couture', info:'Ciruela profundo, rosa malva y carácter editorial.', caption:'SOFF COUTURE', background:'#1e1423', topBar:'#5d3459', foreground:'#fff2f9', hero:'#3c2745', accent:'#e9bad3', card:'#503352' },
]

export default function AparienciaPage() {
  const [selected,setSelected] = useState<StorefrontTheme>(DEFAULT_STOREFRONT_THEME)
  const [published,setPublished] = useState<StorefrontTheme>(DEFAULT_STOREFRONT_THEME)
  const [loading,setLoading] = useState(true)
  const [saving,setSaving] = useState(false)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const { refreshTheme } = useStorefrontTheme()

  useEffect(() => {
    let active = true
    fetch('/api/storefront/theme',{cache:'no-store'})
      .then(async response => {
        if (!response.ok) throw new Error('No pudimos leer la apariencia actual. Verificá Supabase.')
        return response.json() as Promise<{theme:unknown}>
      })
      .then(data => {
        if (!active) return
        const theme = isStorefrontTheme(data.theme) ? data.theme : DEFAULT_STOREFRONT_THEME
        setSelected(theme);setPublished(theme)
      })
      .catch(e => {if(active)setError(e instanceof Error?e.message:'Error de conexión.')})
      .finally(()=>{if(active)setLoading(false)})
    return ()=>{active=false}
  },[])

  async function publish() {
    if (saving || loading || error || selected===published) return
    setSaving(true);setError('');setNotice('')
    try {
      const result = await postAsSoffAdmin('/api/admin/appearance',{theme:selected})
      if(result.ok!==true || result.theme!==selected) throw new Error('No se confirmó la publicación.')
      setPublished(selected)
      setNotice('Diseño publicado. Las visitas nuevas lo verán al abrir la tienda y las sesiones activas lo recibirán en aproximadamente 45 segundos.')
      window.dispatchEvent(new Event('soff-theme-published'))
      await refreshTheme()
    } catch(e) {
      setError(e instanceof Error?e.message:'No se pudo publicar el diseño.')
    } finally {setSaving(false)}
  }

  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex items-start gap-3"><Palette size={30} className="mt-1 shrink-0 text-cyan-600"/><div>
      <h1 className="text-3xl font-bold text-gray-900">Apariencia de SOFF</h1>
      <p className="mt-1 text-sm text-gray-600">Seis interfaces para una sola tienda. Elegí, previsualizá y publicá para todos.</p>
    </div></div>
    <p className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-gray-700">Seleccionar un diseño no modifica la tienda. <strong>Solo «Publicar diseño»</strong> cambia la apariencia para todos los visitantes.</p>
    <div className="grid gap-5 md:grid-cols-2" role="group" aria-label="Diseños disponibles">
      {THEMES.map(item=><button key={item.id} type="button" disabled={loading||saving} onClick={()=>{setSelected(item.id);setNotice('')}} aria-pressed={selected===item.id}
        className={`rounded-2xl border-2 bg-white p-3 text-left shadow-sm transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 ${selected===item.id?'border-cyan-500':'border-gray-200'}`}>
        <div className="overflow-hidden rounded-xl" style={{background:item.background,color:item.foreground}}>
          <div className="px-4 py-3" style={{background:item.topBar,color:'#fff'}}>
            <span className="text-xs font-bold tracking-[.16em]">{item.caption}</span>
          </div>
          <div className="px-5 py-7">
            <div className="mb-4 rounded-xl px-5 py-7" style={{background:item.hero}}>
              <p className="text-[10px] font-bold uppercase tracking-widest">Productos capilares</p>
              <p className="mt-2 text-xl font-bold">Tu pelo, tu estilo.</p>
              <span className="mt-3 inline-block rounded-full px-3 py-1 text-[10px] font-bold" style={{background:item.accent,color:item.id==='premium'||item.id==='aurora'||item.id==='malva'?'#05131e':'#fff'}}>Explorar</span>
            </div>
            <div className="flex gap-3" aria-hidden="true">{[1,2,3].map(n=><span key={n} className="h-14 flex-1 rounded-xl" style={{background:item.card,border:'1px solid rgba(93,130,155,.15)'}}/>)}</div>
          </div>
        </div>
        <div className="mt-3 flex items-start justify-between gap-3"><div>
          <h2 className="text-lg font-bold text-gray-900">{item.name}</h2>
          <p className="mt-1 text-xs text-gray-600">{item.info}</p>
        </div>{selected===item.id&&<CheckCircle2 className="shrink-0 text-cyan-600" aria-label="Seleccionado"/>}</div>
        {published === item.id &&<span className="mt-3 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">Publicado actualmente</span>}
      </button>)}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5">
      <div className="text-sm text-gray-700"><strong>Elegido:</strong> {THEMES.find(t=>t.id===selected)?.name}<br/>
        <span className="text-xs text-gray-500">Actual: {THEMES.find(t=>t.id===published)?.name}</span>
      </div>
      <div className="flex flex-wrap gap-3">
        <a href={`/?soff_preview=${selected}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-50"><Eye size={16}/> Previsualizar selección</a>
        <button type="button" onClick={()=>void publish()} disabled={loading||saving||Boolean(error)||selected===published} className="inline-flex items-center gap-2 rounded-lg bg-[#002f5b] px-5 py-2 text-sm font-bold text-white hover:bg-[#004b85] disabled:cursor-not-allowed disabled:opacity-40"><Save size={16}/>{saving?'Publicando…':'Publicar diseño'}</button>
      </div>
    </div>
    {notice&&<p role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</p>}
    {error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
  </div>
}
