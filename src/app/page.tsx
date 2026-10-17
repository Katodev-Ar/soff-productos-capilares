'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BadgePercent, MapPin, MessageCircle, PackageSearch, Sparkles } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ProductCard from '@/components/ProductCard'
import AutoCarousel from '@/components/AutoCarousel'
import { supabase } from '@/lib/supabase/client'
import {
  PRODUCT_CATEGORIES,
  PRODUCT_SELECT,
  formatPrice,
  getRolePrice,
  getAvailableStock,
  normalizeRole,
  type Product,
  type UserRole,
} from '@/lib/catalog'

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({})
  const [banners, setBanners] = useState<any[]>([])
  const [combos, setCombos] = useState<any[]>([])
  const [userRole, setUserRole] = useState<UserRole>('minorista')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'novedades' | 'disponibles'>('novedades')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadHome() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      let role: UserRole = 'minorista'
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        role = normalizeRole(profile?.role)
      }

      const { data, error } = await supabase
        .from('soff_catalog_public')
        .select(PRODUCT_SELECT)
        .order('created_at', { ascending: false })
        .limit(150)
        .returns<Product[]>()

      // Fetch one image per category from the entire catalog to avoid missing images
      const { data: catData } = await supabase
        .from('soff_catalog_public')
        .select('category, image_url')
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100)
        .returns<{ category: string | null; image_url: string | null }[]>()
      
      // Fetch banners
      const { data: bannerData } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      // Productos de combos por la vista segura, sin JOIN a la tabla privada products.
      const { data: comboData } = await supabase.from('combos')
        .select('*').eq('is_active', true).order('created_at', { ascending: false })
      const comboIds = (comboData ?? []).map(c => c.id)
      const { data: relations } = comboIds.length
        ? await supabase.from('combo_products').select('combo_id,product_id').in('combo_id', comboIds)
        : { data: [] as { combo_id: string; product_id: string }[] }
      const ids = [...new Set((relations ?? []).map(r => r.product_id))]
      const { data: comboProducts } = ids.length
        ? await supabase.from('soff_catalog_public').select(PRODUCT_SELECT).in('id', ids).returns<Product[]>()
        : { data: [] as Product[] }
      const comboProductMap = new Map((comboProducts ?? []).map(p => [p.id, p]))
      const safeCombos = (comboData ?? []).map(combo => ({
        ...combo,
        combo_products: (relations ?? [])
          .filter(r => r.combo_id === combo.id)
          .map(r => ({ product: comboProductMap.get(r.product_id) }))
          .filter(cp => Boolean(cp.product)),
      }))

      if (isMounted) {
        if (error) {
          console.error('Error fetching home data:', error)
          setErrorMessage('Error al cargar la página.')
        } else {
          setProducts(data || [])
          setBanners(bannerData || [])
          setCombos(safeCombos)
          
          const catImgMap: Record<string, string> = {}
          if (catData) {
            for (const p of catData) {
              if (p.category && p.image_url && !catImgMap[p.category.toLocaleUpperCase('es-AR')]) {
                catImgMap[p.category.toLocaleUpperCase('es-AR')] = p.image_url
              }
            }
          }
          setCategoryImages(catImgMap)
        }
        setUserRole(role)
        setLoading(false)
      }
    }

    void loadHome()

    return () => {
      isMounted = false
    }
  }, [])

  const visibleProducts = useMemo(() => {
    if (activeTab === 'disponibles') {
      return products.filter((product) =>
        getAvailableStock(product) > 0 && getRolePrice(product, userRole) > 0
      ).slice(0, 6)
    }

    return products.slice(0, 6)
  }, [activeTab, products, userRole])

  // Mantener navegables las categorías aunque no tengan imágenes cargadas.
  // Preservar el nombre tal como viene del catálogo: el filtro utiliza coincidencia exacta.
  const navigationCategories = useMemo(() => {
    const byName = new Map<string, { name: string; image: string | null }>()
    for (const product of products) {
      const name = product.category?.trim()
      if (!name) continue
      const key = name.toLocaleUpperCase('es-AR')
      const image = categoryImages[key] || product.image_url || null
      const existing = byName.get(key)
      if (!existing || (!existing.image && image)) byName.set(key, { name, image })
    }
    const priority = new Map<string, number>(PRODUCT_CATEGORIES.map((name, i): [string, number] => [name, i]))
    return Array.from(byName.values()).sort((a, b) =>
      (priority.get(a.name.toLocaleUpperCase('es-AR')) ?? 1000) -
      (priority.get(b.name.toLocaleUpperCase('es-AR')) ?? 1000) || a.name.localeCompare(b.name, 'es')
    )
  }, [products, categoryImages])

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900 antialiased">
      <Header />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        {banners.length > 0 ? (
          <section className="relative mb-10 overflow-hidden rounded-lg">
            <AutoCarousel speed={5000}>
              {banners.map((banner) => (
                <div key={banner.id} className="w-full shrink-0 snap-start">
                  {banner.link_url ? (
                    <Link href={banner.link_url} className="block w-full">
                      <img src={banner.image_url} alt={banner.title || 'Banner promocional'} className="w-full h-auto object-cover md:min-h-[470px] min-h-[360px]" />
                    </Link>
                  ) : (
                    <img src={banner.image_url} alt={banner.title || 'Banner promocional'} className="w-full h-auto object-cover md:min-h-[470px] min-h-[360px]" />
                  )}
                </div>
              ))}
            </AutoCarousel>
          </section>
        ) : (
          <section className="relative mb-10 min-h-[360px] overflow-hidden rounded-lg bg-[#eef3f1] md:min-h-[470px]">
            <img
              src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1920&q=80"
              alt="Cabello saludable con rutina profesional"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/76 to-white/8" />
            <div className="relative z-10 flex min-h-[360px] max-w-xl flex-col justify-center px-6 py-10 md:min-h-[470px] md:px-12">
              <p className="mb-4 w-fit border-b-2 border-[#002f5b] pb-2 text-xs font-bold uppercase tracking-[0.24em] text-[#002f5b]">
                Soff Productos Capilares
              </p>
              <h1 className="text-4xl font-extrabold uppercase leading-tight tracking-tight text-[#002f5b] sm:text-5xl">
                Nueva rutina para tu pelo
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-gray-700">
                Productos profesionales para hidratar, reparar y sostener el brillo todos los días.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/productos" className="inline-flex items-center justify-center rounded bg-[#002f5b] px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-white hover:bg-black">
                  Comprar ahora <ArrowRight size={16} className="ml-2" />
                </Link>
                <Link href="/#rutinas" className="inline-flex items-center justify-center rounded border border-[#002f5b] px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-[#002f5b] hover:border-brand-primary hover:text-brand-primary">
                  Ver rutinas
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Acceso a categorías, con imagen opcional y sin inventar categorías vacías. */}
        {(navigationCategories.length > 0 || loading) && (
          <section className="mb-12 border-b border-gray-100 pb-8" aria-label="Explorar categorías">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Explorá por categoría</h2>
            <AutoCarousel speed={5000} label="Categorías de productos">
              {loading ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-24 w-20 shrink-0 animate-pulse rounded-lg bg-gray-100 sm:w-24" />
              )) : navigationCategories.map(({ name, image }) => (
                <Link
                  key={name}
                  href={`/productos?categoria=${encodeURIComponent(name)}`}
                  className="group flex w-20 shrink-0 snap-start flex-col items-center gap-2 sm:w-24"
                >
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-gray-50 p-2 transition-all group-hover:border-brand-primary group-hover:shadow-md sm:h-20 sm:w-20">
                    {image ? (
                      <img loading="lazy" src={image} alt="" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110" />
                    ) : (
                      <PackageSearch size={26} aria-hidden="true" className="text-gray-400" />
                    )}
                  </div>
                  <span className="text-center text-[11px] font-semibold capitalize leading-tight text-gray-700 group-hover:text-brand-primary sm:text-xs">
                    {name.toLocaleLowerCase('es-AR')}
                  </span>
                </Link>
              ))}
            </AutoCarousel>
          </section>
        )}

        {/* Brands Section */}
        <section className="mb-16">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-[#002f5b]">Nuestras marcas principales</h2>
            <p className="text-sm text-gray-500 mt-2">Encontrá los mejores productos de tus marcas favoritas</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 md:gap-8">
            {[
              { name: 'BEKIM', q: 'bekim', img: '/brands/bekim.png' },
              { name: 'BELLISIMA', q: 'bellisima', img: '/brands/bellisima.png' },
              { name: 'Fidelité', q: 'fidelite', img: '/brands/fidelite.png' },
              { name: 'ISSUE', q: 'issue', img: '/brands/issue.png' },
              { name: 'KARSELL', q: 'karsell', img: '/brands/karsell.png' },
              { name: 'OSSONO', q: 'ossono', img: '/brands/ossono.png' },
              { name: 'ROUBAIX', q: 'roubaix', img: '/brands/roubaix.png' },
              { name: 'SKALA', q: 'skala', img: '/brands/skala.png' },
            ].map((brand) => (
              <Link
                key={brand.name}
                href={`/productos?q=${encodeURIComponent(brand.q)}`}
                className="group flex flex-col items-center gap-2 transition-transform hover:scale-105 w-20"
              >
                <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full border border-gray-100 bg-white shadow-sm overflow-hidden p-1">
                  <img src={brand.img} alt={brand.name} className="w-full h-full object-contain rounded-full" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 group-hover:text-black text-center">
                  {brand.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Productos reales del catálogo: no se anuncian descuentos no verificados. */}
        <section className="mb-16">
          <div className="w-full overflow-hidden rounded-[24px] bg-[#fff2f6] p-5 sm:p-6 md:rounded-[32px] md:p-10">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Descubrí productos SOFF</h2>
                <p className="mt-2 text-sm text-gray-600">Novedades y productos que podés comprar ahora.</p>
              </div>
              <div className="flex w-fit rounded-full bg-white/50 p-1">
                {[
                  { id: 'novedades', label: 'Novedades' },
                  { id: 'disponibles', label: 'En stock' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as 'novedades' | 'disponibles')}
                    aria-pressed={activeTab === tab.id}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition-colors sm:px-5 ${
                      activeTab === tab.id ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-700 hover:bg-white/70'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {errorMessage && <div className="mb-6 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>}

            <AutoCarousel speed={3500} label="Productos destacados">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="w-[260px] sm:w-[280px] shrink-0 snap-start">
                    <div className="h-[400px] animate-pulse rounded-2xl bg-white/60" />
                  </div>
                ))
              ) : visibleProducts.length > 0 ? (
                visibleProducts.map((product) => (
                  <div key={product.id} className="w-[260px] sm:w-[280px] shrink-0 snap-start">
                    <ProductCard product={product} userRole={userRole} />
                  </div>
                ))
              ) : (
                <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/70 px-6 py-16 text-center">
                  <PackageSearch size={36} className="mb-3 text-gray-400" />
                  <h3 className="text-lg font-bold text-gray-900">No hay productos para mostrar</h3>
                  <p className="mt-2 max-w-md text-sm text-gray-600">Probá con la pestaña Novedades o visitá el catálogo completo.</p>
                  <Link href="/productos" className="mt-4 rounded-full bg-gray-900 px-5 py-2 text-sm font-bold text-white hover:bg-black">Ver catálogo</Link>
                </div>
              )}
            </AutoCarousel>
          </div>
        </section>

        {/* Products by Category Rows */}
        <section className="mb-16 flex flex-col gap-12">
          {[
            { id: 'MASCARAS', title: 'Máscaras Recomendadas' },
            { id: 'SHAMPOO', title: 'Shampoos Destacados' },
            { id: 'SKALA', title: 'Lo mejor de Skala' },
          ].map((catRow) => {
            const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
            const normalizedRowId = normalize(catRow.id)

            const rowProducts = products
              .filter((p) => p.category && normalize(p.category).includes(normalizedRowId))
              .slice(0, 10) // Show up to 10 products

            if (rowProducts.length === 0 && !loading) return null

            return (
              <div key={catRow.id} className="w-full overflow-hidden">
                <div className="mb-6 flex items-end justify-between border-b border-gray-200 pb-3">
                  <h2 className="text-2xl font-bold text-[#002f5b]">{catRow.title}</h2>
                  <Link
                    href={`/productos?categoria=${encodeURIComponent(catRow.id)}`}
                    className="text-sm font-bold text-brand-primary hover:text-[#002f5b] transition-colors"
                  >
                    Ver todo
                  </Link>
                </div>

                <AutoCarousel speed={4000} label={catRow.title}>
                  {loading
                    ? Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="w-[200px] sm:w-[240px] shrink-0 snap-start h-72 animate-pulse rounded-lg bg-gray-100" />
                      ))
                    : rowProducts.map((product) => (
                        <div key={product.id} className="w-[200px] sm:w-[240px] shrink-0 snap-start">
                          <ProductCard product={product} userRole={userRole} />
                        </div>
                      ))}
                </AutoCarousel>
              </div>
            )
          })}
        </section>

        <section id="oportunidades" className="scroll-mt-40 border-t border-gray-200 py-12">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-brand-primary">
                <BadgePercent size={16} /> Oportunidades
              </p>
              <h2 className="text-2xl font-bold text-[#002f5b]">Combos y rutinas destacadas</h2>
            </div>
            <Link href="/productos" className="hidden text-sm font-bold text-[#002f5b] hover:text-brand-primary sm:inline">
              Ver catálogo
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {combos.map((combo) => {
              const originalPrice = combo.combo_products?.reduce((acc: number, cp: any) => {
                const product = cp.product
                if (!product) return acc
                return acc + Number(getRolePrice(product, userRole))
              }, 0) || 0
              
              const discountedPrice = originalPrice * (1 - combo.discount_percentage / 100)

              return (
                <a
                  key={combo.id}
                  href={`https://wa.me/5493816253929?text=${encodeURIComponent(`Hola Soff, quiero consultar la disponibilidad y el precio final del combo "${combo.name}".`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg bg-[#f8f8f8] p-4 transition hover:shadow-md"
                  aria-label={`Consultar el combo ${combo.name} por WhatsApp`}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded bg-white p-1">
                      {combo.image_url ? (
                        <img src={combo.image_url} alt={combo.name} className="h-full w-full object-contain" />
                      ) : (
                        <PackageSearch size={24} className="text-gray-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                        {combo.combo_products?.length || 0} PRODUCTOS • {combo.discount_percentage}% OFF
                      </p>
                      <h3 className="line-clamp-2 text-[13px] font-semibold text-gray-800">{combo.name}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm font-bold text-[#c1272d]">{formatPrice(discountedPrice)}</span>
                        <span className="text-[11px] text-gray-400 line-through">{formatPrice(originalPrice)}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-600">Precio estimado. Consultar disponibilidad y precio final por WhatsApp.</p>
                    </div>
                  </div>
                  <span className="ml-3 flex h-8 w-8 flex-none items-center justify-center rounded-full border border-gray-300 text-gray-500 transition-colors group-hover:bg-white">
                    <ArrowRight size={16} />
                  </span>
                </a>
              )
            })}
            
            {combos.length === 0 && !loading && (
              <div className="col-span-full py-8 text-center text-gray-500">
                Próximamente combos y rutinas disponibles.
              </div>
            )}
          </div>
        </section>

        <section id="rutinas" className="scroll-mt-40 border-t border-gray-200 py-12">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { title: 'Hidratación', copy: 'Para recuperar suavidad y movimiento.', href: '/productos?q=hidratacion' },
              { title: 'Reparación', copy: 'Para puntas secas o cabello tratado.', href: '/productos?q=reparacion' },
              { title: 'Color y brillo', copy: 'Para sostener tonos y luminosidad.', href: '/productos?q=tintura' },
            ].map((routine) => (
              <Link key={routine.title} href={routine.href} className="rounded-lg border border-gray-200 p-5 transition hover:border-brand-primary">
                <Sparkles size={22} className="mb-4 text-brand-primary" />
                <h3 className="text-lg font-bold text-[#002f5b]">{routine.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{routine.copy}</p>
              </Link>
            ))}
          </div>
        </section>

        <section id="ubicacion" className="scroll-mt-40 border-t border-gray-200 py-16 text-center">
          <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-[#002f5b] mb-3">Nuestra Ubicación</h2>
            <p className="text-gray-500">Visítanos y conoce todo nuestro catálogo</p>
            <div className="w-16 h-1 bg-red-400 mx-auto mt-4 rounded-full"></div>
          </div>

          <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden flex flex-col md:flex-row text-left">
            {/* Left Col - Info */}
            <div className="flex-1 p-10 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-red-50 text-red-400 rounded-full flex items-center justify-center mb-6">
                <MapPin size={32} />
              </div>
              <h3 className="text-2xl font-bold text-[#002f5b] mb-2">Punto de Entrega</h3>
              <p className="text-gray-500 mb-8">Avenida Independencia 2820, San Miguel de Tucumán</p>
              
              <a
                href="https://maps.app.goo.gl/BHEqyxZ16syyHsvo6"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1e293b] px-8 py-3.5 text-sm font-bold text-white hover:bg-black transition-colors"
              >
                <div className="w-5 h-5 border-2 border-white rounded transform rotate-45 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
                Ver en Google Maps
              </a>
            </div>

            {/* Right Col - Map Embed */}
            <div className="flex-1 min-h-[300px] md:min-h-full bg-gray-100 relative">
              <iframe 
                src="https://maps.google.com/maps?q=Av.%20Independencia%202820,%20San%20Miguel%20de%20Tucuman&t=&z=16&ie=UTF8&iwloc=&output=embed" 
                width="100%" 
                height="100%" 
                style={{ border: 0, minHeight: '350px' }} 
                allowFullScreen={false} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 w-full h-full"
              ></iframe>
            </div>
          </div>
        </section>

        <a
          href="https://www.instagram.com/soffproductoscapilares"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Consultar por Instagram"
          className="fixed bottom-5 left-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#002f5b] text-white shadow-lg transition hover:bg-brand-primary hover:text-black"
        >
          <MessageCircle size={22} />
        </a>
      </main>

      <Footer />
    </div>
  )
}
