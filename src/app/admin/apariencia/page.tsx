'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Eye, Palette, Save, Sun, Moon } from 'lucide-react'
import { postAsSoffAdmin } from '@/lib/adminFetch'
import { useStorefrontTheme } from '@/components/storefront/StorefrontThemeProvider'
import { DEFAULT_STOREFRONT_THEME, isStorefrontTheme, type StorefrontTheme } from '@/lib/storefrontTheme'

const THEMES = [
  {id:'clasico' as const, name:'Clásico Beauty', info:'Diseño luminoso, catálogo tradicional y la navegación que SOFF ya utilizaba.'},
  {id:'premium' as const, name:'Premium Grafito', info:'Portada grafito, acentos cian y logos de marcas sobre fondos perla para mejor contraste.'},
]

export default function AparienciaPage() {
  const [selected, setSelected] = useState<StorefrontTheme>(DEFAULT_STOREFRONT_THEME)
  const [published, setPublished] = useState<StorefrontTheme>(DEFAULT_STOREFRONT_THEME)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const { refreshTheme } = useStorefrontTheme()

  useEffect(() => {
    let active = true
    fetch('/api/storefront/theme', {cache:'no-store'})
      .then(async response => {
        if (!response.ok) throw new Error('No pudimos leer la apariencia actual. Verificá Supabase.')
        return response.json() as Promise<{theme:unknown}>
      })
      .then(data => {
        if (!active) return
        const theme = isStorefrontTheme(data.theme) ? data.theme : DEFAULT_STOREFRONT_THEME
        setSelected(theme); setPublished(theme)
      })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Error de conexión.') })
      .finally(() => { if (active) setLoading(false) })
    return () => {active = false}
  }, [])

  async function publish() {
    if (saving || selected === published) return
    setSaving(true); setError(''); setNotice('')
    try {
      const result = await postAsSoffAdmin('/api/admin/appearance', {theme:selected})
      if (result.ok !== true || result.theme !== selected) throw new Error('No se confirmó la publicación.')
      setPublished(selected)
      setNotice('Diseño publicado. Los visitantes lo verán al abrir o actualizar la tienda; las sesiones activas lo recibirán automáticamente en aproximadamente 45 segundos.')
      window.dispatchEvent(new Event('soff-theme-published'))
      await refreshTheme()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo publicar el diseño.')
    } finally { setSaving(false) }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3"><Palette size={30} className="text-cyan-600" /><div>
        <h1 className="text-3xl font-bold text-gray-900">Apariencia de SOFF</h1>
        <p className="text-sm text-gray-600">Un catálogo, dos interfaces. Elegí y publicá el diseño para todos los clientes.</p>
      </div></div>
      <p className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-gray-700">La vista previa es local a tu navegador: elegir una opción o abrir una vista previa no modifica la tienda hasta que presiones <strong>Publicar diseño</strong>.</p>
      <div className="grid gap-5 md:grid-cols-2" role="group" aria-label="Diseños disponibles">
        {THEMES.map(item => (
          <button key={item.id} type="button" onClick={() => {setSelected(item.id);setNotice('')}} disabled={loading || saving}
            aria-pressed={selected === item.id}
            className={`rounded-2xl border-2 bg-white p-3 text-left shadow-sm transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 ${selected === item.id ? 'border-cyan-500' : 'border-gray-200'}`}>
            <div className={`overflow-hidden rounded-xl ${item.id === 'premium' ? 'bg-[#0b131a]' : 'bg-[#fff5f8]'}`}>
              <div className={`flex items-center gap-2 px-4 py-3 ${item.id === 'premium'?'bg-[#142430] text-white':'bg-[#ffe4ee] text-[#002f5b]'}`}>
                {item.id === 'premium' ? <Moon size={18}/> : <Sun size={18}/>}
                <span className="text-sm font-bold">SOFF {item.id === 'premium' ? 'PREMIUM' : 'BEAUTY'}</span>
              </div>
              <div className="px-5 py-8">
                <div className={`mb-5 rounded-xl px-4 py-8 ${item.id==='premium'?'bg-[#203543] text-[#7ce6ff]':'bg-[#f6dce6] text-[#002f5b]'}`}>
                  <p className="text-xs font-bold uppercase tracking-widest">Productos capilares</p>
                  <p className="mt-1 text-xl font-extrabold">Tu pelo, tu estilo.</p>
                </div>
                <div className="flex gap-3">
                  {[1,2,3].map(n=><span key={n} className={`h-20 flex-1 rounded-xl ${item.id==='premium'?'bg-[#eaf1f5]':'bg-white'}`}/>) }
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-start justify-between gap-3"><div>
              <h2 className="text-lg font-bold text-gray-900">{item.name}</h2><p className="mt-1 text-xs text-gray-600">{item.info}</p>
            </div>{selected === item.id && <CheckCircle2 className="text-cyan-600" aria-label="Seleccionado" />}</div>
            {published === item.id && <span className="mt-3 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">Publicado actualmente</span>}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5">
        <div className="text-sm text-gray-700"><strong>Elegido:</strong> {THEMES.find(t=>t.id===selected)?.name}<br/>
          <span className="text-xs text-gray-500">Actual: {THEMES.find(t=>t.id===published)?.name}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={`/?soff_preview=${selected}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-800"><Eye size={16}/> Previsualizar selección</a>
          <button type="button" onClick={()=>void publish()} disabled={loading || saving || selected===published || Boolean(error && loading)} className="inline-flex items-center gap-2 rounded-lg bg-[#002f5b] px-5 py-2 text-sm font-bold text-white hover:bg-[#004b85] disabled:opacity-40">
            <Save size={16}/>{saving?'Publicando…':'Publicar diseño'}
          </button>
        </div>
      </div>
      {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
    </div>
  )
}
