'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, PackageSearch, ShieldCheck, ShoppingBag, Star, Truck, Heart } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ProductCard from '@/components/ProductCard'
import { useCart } from '@/context/CartContext'
import { useFavorites } from '@/context/FavoritesContext'
import { supabase } from '@/lib/supabase/client'
import {
  FREE_SHIPPING_THRESHOLD,
  PRODUCT_SELECT,
  formatPrice,
  getAvailableStock,
  getRolePrice,
  hasSellablePrice,
  normalizeRole,
  productCategoryHref,
  type Product,
  type UserRole,
} from '@/lib/catalog'

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [imageFailed, setImageFailed] = useState(false)
  const [userRole, setUserRole] = useState<UserRole>('minorista')
  const [quantity, setQuantity] = useState(1)
  const [openSection, setOpenSection] = useState<string | null>('desc')
  const { addToCart } = useCart()

  useEffect(() => {
    let isMounted = true

    async function loadProduct() {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      let currentRole: UserRole = 'minorista'
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        currentRole = normalizeRole(profile?.role)
      }

      const { data } = await supabase.from('products').select(PRODUCT_SELECT).eq('id', resolvedParams.id).maybeSingle<Product>()
      let related: Product[] = []

      if (data?.category) {
        const { data: relatedData } = await supabase
          .from('products')
          .select(PRODUCT_SELECT)
          .eq('category', data.category)
          .neq('id', data.id)
          .limit(4)
          .returns<Product[]>()

        related = relatedData ?? []
      }

      if (!isMounted) return

      setUserRole(currentRole)
      setProduct(data ?? null)
      setRelatedProducts(related)
      setQuantity(1)
      setImageFailed(false)
      setLoading(false)
    }

    void loadProduct()

    return () => {
      isMounted = false
    }
  }, [resolvedParams.id])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-white text-gray-900">Cargando producto...</div>
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col bg-white text-gray-900">
        <Header />
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <PackageSearch size={42} className="mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold text-[#002f5b]">Producto no encontrado</h1>
          <p className="mt-3 text-sm text-gray-500">Puede haber sido eliminado o estar temporalmente fuera del catálogo.</p>
          <Link href="/productos" className="mt-6 rounded bg-black px-5 py-3 text-sm font-bold text-white hover:bg-[#002f5b]">
            Volver al catálogo
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  const price = getRolePrice(product, userRole)
  const stock = getAvailableStock(product)
  const hasPrice = hasSellablePrice(product, userRole)
  const canAddToCart = stock > 0 && hasPrice
  const { isFavorite, toggleFavorite } = useFavorites()
  const fav = product ? isFavorite(product.id) : false

  const handleAddToCart = () => {
    if (!canAddToCart) return

    addToCart({
      id: product.id,
      name: product.name,
      price,
      quantity,
      image_url: product.image_url,
      stock,
    })
  }

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section)
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900 antialiased">
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <nav className="mb-8 text-xs uppercase tracking-wider text-gray-400">
          <Link href="/" className="hover:text-brand-primary">Inicio</Link>
          <span className="mx-1">&gt;</span>
          <Link href={productCategoryHref(product.category)} className="hover:text-brand-primary">{product.category || 'Tienda'}</Link>
          <span className="mx-1">&gt;</span>
          <span className="text-gray-800">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:gap-20">
          <div className="flex flex-col space-y-4">
            <div className="group relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
              {product.image_url && !imageFailed ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  onError={() => setImageFailed(true)}
                  className="h-full w-full object-contain object-center p-8 mix-blend-multiply transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
                  <PackageSearch size={42} />
                  <span className="text-sm">Sin imagen cargada</span>
                </div>
              )}
              <div className="absolute left-4 top-4 bg-black px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                {canAddToCart ? 'Disponible' : 'Sin stock'}
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary">{product.category || 'Producto'}</p>
            <h1 className="mb-2 text-3xl font-bold text-gray-900 md:text-4xl">{product.name}</h1>

            <div className="mb-6 flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} size={14} className="fill-brand-primary text-brand-primary" />
              ))}
              <span className="ml-2 text-xs text-gray-500">Calidad profesional</span>
            </div>

            <p className="mb-2 text-3xl font-bold text-gray-900">{hasPrice ? formatPrice(price) : 'Consultar precio'}</p>
            <p className={`mb-6 text-sm font-semibold ${canAddToCart ? 'text-green-700' : 'text-[#c1272d]'}`}>
              {stock > 0 ? `${stock} unidades disponibles` : 'Sin stock disponible'}
            </p>

            <div className="mb-8 space-y-4 border-y border-gray-200 py-6">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium uppercase tracking-widest text-gray-600">Cantidad</span>
                <div className="flex items-center rounded-sm border border-gray-300">
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 py-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-black">-</button>
                  <span className="w-12 px-4 py-2 text-center text-sm font-medium">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                    disabled={!canAddToCart || quantity >= stock}
                    className="px-4 py-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-black disabled:cursor-not-allowed disabled:text-gray-300"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!canAddToCart}
                  className="flex flex-1 items-center justify-center bg-[#111] py-4 text-sm font-bold uppercase tracking-widest text-white shadow-md transition-colors hover:bg-[#002f5b] disabled:cursor-not-allowed disabled:bg-gray-300 rounded-lg"
                >
                  <ShoppingBag size={18} className="mr-2" />
                  {canAddToCart ? 'Agregar al carrito' : stock > 0 ? 'Consultar precio' : 'Sin stock'}
                </button>

                <button
                  type="button"
                  onClick={() => toggleFavorite(product.id)}
                  aria-label={fav ? "Quitar de favoritos" : "Guardar en favoritos"}
                  className={`flex items-center justify-center px-5 py-4 border rounded-lg transition-all shadow-sm ${
                    fav 
                      ? 'border-red-300 bg-red-50 text-red-600 scale-105' 
                      : 'border-gray-200 bg-white text-gray-500 hover:text-red-500 hover:border-red-200'
                  }`}
                  title={fav ? "Quitar de favoritos" : "Guardar en favoritos"}
                >
                  <Heart size={20} fill={fav ? "currentColor" : "none"} strokeWidth={fav ? 2.5 : 2} />
                </button>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <Truck size={20} className="text-gray-400" />
                <span>Envío gratis desde {formatPrice(FREE_SHIPPING_THRESHOLD)}</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <ShieldCheck size={20} className="text-gray-400" />
                <span>Compra protegida</span>
              </div>
            </div>

            <div className="space-y-4">
              <AccordionSection id="desc" title="Descripción" openSection={openSection} onToggle={toggleSection}>
                {product.description || 'Fórmula pensada para acompañar tu rutina capilar diaria con acabado profesional.'}
              </AccordionSection>
              <AccordionSection id="uso" title="Modo de uso" openSection={openSection} onToggle={toggleSection}>
                Aplicar sobre el cabello húmedo, masajear suavemente y enjuagar. Repetir si es necesario.
              </AccordionSection>
              <AccordionSection id="envios" title="Envíos y retiro" openSection={openSection} onToggle={toggleSection}>
                Podés coordinar retiro en Av. Independencia 2820 o consultar alternativas de envío desde el checkout.
              </AccordionSection>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-24 border-t border-gray-200 pt-12">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#002f5b]">Completá tu rutina</h2>
              <Link href={productCategoryHref(product.category)} className="text-sm font-bold text-[#002f5b] hover:text-brand-primary">
                Ver más
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} userRole={userRole} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}

type AccordionSectionProps = {
  id: string
  title: string
  children: React.ReactNode
  openSection: string | null
  onToggle: (id: string) => void
}

function AccordionSection({ id, title, children, openSection, onToggle }: AccordionSectionProps) {
  const isOpen = openSection === id

  return (
    <div className="border-b border-gray-200 pb-2">
      <button type="button" onClick={() => onToggle(id)} className="flex w-full items-center justify-between py-2 text-left outline-none">
        <span className="text-sm font-bold uppercase tracking-wider text-gray-900">{title}</span>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {isOpen && <div className="pb-4 pt-2 text-sm leading-relaxed text-gray-600">{children}</div>}
    </div>
  )
}
