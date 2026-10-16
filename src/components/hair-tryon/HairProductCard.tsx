'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, ArrowRight, Package, ShoppingBag, Loader2, AlertCircle } from 'lucide-react'
import type { HairColorShade } from './types'
import { supabase } from '@/lib/supabase/client'
import { PRODUCT_SELECT, formatPrice, getAvailableStock, getRolePrice, normalizeRole, type Product, type UserRole } from '@/lib/catalog'
import { useCart } from '@/context/CartContext'

type Result = {
  productId: string
  status: 'ready' | 'unavailable' | 'error'
  product: Product | null
  role: UserRole
}

export default function HairProductCard({ shade }: { shade: HairColorShade }) {
  const { addToCart, setIsCartOpen } = useCart()
  const [result, setResult] = useState<Result | null>(null)
  const [added, setAdded] = useState(false)
  const productId = shade.matchedProduct?.id

  useEffect(() => {
    let active = true
    // Al cambiar de tono se invalida inmediatamente la ficha anterior.
    const reset = () => { if (active) { setResult(null); setAdded(false) } }
    reset()
    if (!productId) return () => { active = false }

    async function loadLiveProduct() {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        const user = authData.user
        let role: UserRole = 'minorista'
        if (user) {
          const { data: profile, error: roleError } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
          if (roleError) throw roleError
          role = normalizeRole(profile?.role)
        }
        const { data, error } = await supabase.from('soff_catalog_public').select(PRODUCT_SELECT).eq('id', productId!).maybeSingle<Product>()
        if (error) throw error
        if (active) setResult({ productId: productId!, status: data ? 'ready' : 'unavailable', product: data ?? null, role })
      } catch {
        if (active) setResult({ productId: productId!, status: 'error', product: null, role: 'minorista' })
      }
    }
    void loadLiveProduct()
    return () => { active = false }
  }, [productId])

  const current = result?.productId === productId ? result : null
  const product = current?.status === 'ready' ? current.product : null
  const stock = product ? getAvailableStock(product) : 0
  const price = product ? getRolePrice(product, current?.role ?? 'minorista') : 0
  const canBuy = stock > 0 && price > 0

  function handleAddToCart() {
    if (!product || !canBuy) return
    addToCart({ id: product.id, name: product.name, price, quantity: 1, image_url: product.image_url, stock })
    setAdded(true)
    setIsCartOpen(true)
  }

  return (
    <section className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5" aria-live="polite">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
        <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: shade.hex }} />
        <h3 className="font-semibold text-gray-900 text-sm">Tono {shade.toneCode}: {shade.name}</h3>
      </div>
      <p className="text-xs text-gray-600 mb-4">{shade.description}</p>
      {!productId ? (
        <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
          Este color es una simulación. No tiene una tintura específica vinculada al catálogo.
          <Link href="/productos" className="block mt-2 font-semibold underline">Ver todas las tinturas</Link>
        </div>
      ) : !current ? (
        <p className="flex items-center gap-2 text-sm text-gray-600" role="status"><Loader2 className="w-4 h-4 animate-spin"/> Consultando precio y disponibilidad...</p>
      ) : current.status !== 'ready' || !product ? (
        <div className="text-sm text-gray-600 rounded-lg bg-gray-50 p-4" role="status">
          <AlertCircle className="inline w-4 h-4 mr-1" />
          {current.status === 'error'
            ? 'No se pudo consultar el catálogo. Intentá nuevamente más tarde.'
            : 'Esta tintura no está disponible en el catálogo actual.'}
          <Link href="/productos" className="block mt-2 underline font-medium">Consultar otras tinturas</Link>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-3 rounded-xl bg-gray-50 p-3">
          <ProductPhoto key={product.id} src={product.image_url} name={product.name} />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h4 className="text-xs font-medium text-gray-900">{product.name}</h4>
            <p className="text-sm font-bold mt-1 text-gray-900">{price > 0 ? formatPrice(price) : 'Precio no disponible para tu perfil'}</p>
            <p className="text-xs mt-1 text-gray-600">{stock > 0 ? `${stock} unidades disponibles` : 'Sin stock'}</p>
          </div>
          <div className="w-full sm:w-auto flex flex-col gap-2">
            <Link href={`/producto/${product.id}`} className="inline-flex justify-center items-center rounded-lg bg-white border border-gray-200 px-3 py-2 text-xs font-medium">
              Ver ficha <ArrowRight className="ml-1 w-3 h-3" />
            </Link>
            <button type="button" disabled={!canBuy} onClick={handleAddToCart}
              className="inline-flex justify-center items-center rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#c1272d]">
              {added ? <><Check className="mr-1 w-4 h-4" /> Agregado</> : <><ShoppingBag className="mr-1 w-4 h-4" /> Agregar</>}
            </button>
          </div>
        </div>
      )}
      <p className="mt-3 text-[11px] text-gray-500">Precio y stock consultados al seleccionar el tono. Se verifican nuevamente al confirmar el pedido.</p>
    </section>
  )
}

function ProductPhoto({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="h-16 w-16 shrink-0 flex items-center justify-center overflow-hidden rounded-lg bg-white border border-gray-200">
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="w-full h-full object-contain" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : <Package className="w-7 h-7 text-gray-400" aria-label="Producto sin imagen disponible" />}
    </div>
  )
}
