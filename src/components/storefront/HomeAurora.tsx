'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BadgePercent, MapPin, MessageCircle, PackageSearch, Sparkles, ShoppingBag } from 'lucide-react'
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

export default function HomeAurora() {
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
    <div className="soff-premium-beauty soff-aurora-studio flex min-h-screen flex-col bg-[#071629] text-[#eefaff] antialiased">
      <Header />

      <main className="soff-aurora-main mx-auto w-full max-w-[1400px] flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="soff-aurora-masthead mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-[#41607c] pb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9db9c9] sm:text-xs">
          <span>SOFF / Aurora Studio</span>
          <span>Belleza con energía propia</span>
        </div>
        {banners.length > 0 && (
          <section className="premium-editorial soff-aurora-spotlight mb-6 flex flex-col items-start justify-between gap-5 rounded-[26px] bg-[#111d27] px-7 py-8 text-white sm:flex-row sm:items-center sm:px-10" aria-label="Presentación SOFF Premium Beauty">
            <div>
              <p className="premium-eyebrow !text-[#74def8]">EL ESTILO SOFF</p>
              <h1 className="premium-display mt-2 text-3xl sm:text-4xl">Tu pelo merece brillar a su manera.</h1>
            </div>
            <Link href="/productos" className="premium-button-gold inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest">
              Ver catálogo <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </section>
        )}

        {banners.length > 0 ? (
          <section className="premium-banner soff-aurora-banner relative mb-8 overflow-hidden rounded-[26px]" aria-label="Novedades de SOFF">
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
          <section className="premium-hero soff-aurora-banner relative mb-8 min-h-[380px] overflow-hidden rounded-[26px] bg-[#111d27] md:min-h-[510px]">
            <img
              src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1920&q=80"
              alt="Cabello saludable con rutina profesional"
              className="absolute inset-0 h-full w-full object-cover object-center opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#09131b]/95 via-[#10202b]/80 to-[#09131b]/5" />
            <div className="relative z-10 flex min-h-[380px] max-w-xl flex-col justify-center px-7 py-14 md:min-h-[510px] md:px-16">
              <p className="mb-5 w-fit border-b border-[#25c1e7] pb-3 text-xs font-semibold uppercase tracking-[0.27em] text-[#77e3ff]">
                Soff Productos Capilares
              </p>
              <h1 className="premium-display text-5xl font-medium leading-[1.04] tracking-tight text-white sm:text-6xl">
                La belleza tiene su propia energía
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-[#cfdee7]">
                Productos profesionales para hidratar, reparar y sostener el brillo todos los días.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/productos" className="premium-button-gold inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-xs font-bold uppercase tracking-[0.14em]">
                  Comprar ahora <ArrowRight size={16} className="ml-2" />
                </Link>
                <Link href="/#rutinas" className="inline-flex items-center justify-center rounded-full border border-[#71cde6] px-7 py-3.5 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#3c6172]/30">
                  Ver rutinas
                </Link>
              </div>
            </div>
          </section>
        )}

        <section aria-label="Beneficios de SOFF" className="premium-services soff-aurora-services mb-12 grid grid-cols-1 gap-2 overflow-hidden rounded-2xl border border-[#2e414d] bg-[#17242e] p-4 sm:grid-cols-3 sm:gap-4 sm:p-5">
          <div className="flex items-center gap-3 px-2 py-2">
            <Sparkles aria-hidden="true" size={22} className="shrink-0 text-[#54d4f4]" />
            <div><p className="text-sm font-semibold">Tu rutina ideal</p><p className="text-xs text-[#b1c2cb]">Cuidado y belleza capilar</p></div>
          </div>
          <div className="flex items-center gap-3 px-2 py-2">
            <ShoppingBag aria-hidden="true" size={22} className="shrink-0 text-[#54d4f4]" />
            <div><p className="text-sm font-semibold">Comprá online</p><p className="text-xs text-[#b1c2cb]">Explorá nuestro catálogo</p></div>
          </div>
          <div className="flex items-center gap-3 px-2 py-2">
            <MapPin aria-hidden="true" size={22} className="shrink-0 text-[#54d4f4]" />
            <div><p className="text-sm font-semibold">Estamos en Tucumán</p><p className="text-xs text-[#b1c2cb]">Retiro en nuestro local</p></div>
          </div>
        </section>

        {/* Acceso a categorías, con imagen opcional y sin inventar categorías vacías. */}
        {(navigationCategories.length > 0 || loading) && (
          <section className="mb-14 border-b border-[#2e414d] pb-10" aria-label="Explorar categorías">
            <p className="premium-eyebrow mb-2">EL UNIVERSO SOFF</p>
            <h2 className="premium-display mb-5 text-3xl sm:text-4xl">Encontrá lo que tu pelo necesita</h2>
            <AutoCarousel speed={5000} label="Categorías de productos">
              {loading ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-24 w-20 shrink-0 animate-pulse rounded-lg bg-[#253642] sm:w-24" />
              )) : navigationCategories.map(({ name, image }) => (
                <Link
                  key={name}
                  href={`/productos?categoria=${encodeURIComponent(name)}`}
                  className="group flex w-20 shrink-0 snap-start flex-col items-center gap-2 sm:w-24"
                >
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[#395563] bg-[#1c2d38] p-2 transition-all group-hover:border-[#25c1e7] group-hover:shadow-md sm:h-20 sm:w-20">
                    {image ? (
                      <img loading="lazy" src={image} alt="" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110" />
                    ) : (
                      <PackageSearch size={26} aria-hidden="true" className="text-[#8fa8b5]" />
                    )}
                  </div>
                  <span className="text-center text-[11px] font-semibold capitalize leading-tight text-[#d1e2e9] group-hover:text-[#5cdbf8] sm:text-xs">
                    {name.toLocaleLowerCase('es-AR')}
                  </span>
                </Link>
              ))}
            </AutoCarousel>
          </section>
        )}

        <section className="premium-editorial soff-aurora-spotlight mb-16 overflow-hidden rounded-[26px] bg-[#111d27] px-7 py-12 text-white sm:px-10 md:px-14 md:py-16" aria-label="Belleza SOFF">
          <div className="flex flex-col items-start justify-between gap-9 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="premium-eyebrow !text-[#74def8]">EL ARTE DE CUIDARTE</p>
              <h2 className="premium-display mt-4 text-4xl leading-tight sm:text-5xl md:text-6xl">Color, cuidado y actitud.<br /><span className="text-[#73dff9]">Vos ponés el estilo.</span></h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-[#b8cbd4] sm:text-base">Desde tu rutina de todos los días hasta el cuidado profesional. Encontrá productos y marcas para cada momento de tu pelo.</p>
            </div>
            <Link href="/productos" className="premium-button-gold inline-flex shrink-0 items-center gap-3 rounded-full px-7 py-3.5 text-xs font-bold uppercase tracking-[0.13em]">
              Explorar catálogo <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Brands Section */}
        <section className="mb-16">
          <div className="mb-9 text-center">
            <p className="premium-eyebrow mb-2">MARCAS QUE NOS ENCANTAN</p>
            <h2 className="premium-display text-3xl sm:text-4xl">Tus marcas favoritas, en un solo lugar</h2>
            <p className="mt-2 text-sm text-[#a4b9c6]">Elegí entre las marcas de nuestro catálogo</p>
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
                className="group flex w-20 flex-col items-center gap-2 transition-transform hover:-translate-y-1"
              >
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[#75a8bc] bg-[#eaf1f5] p-2 shadow-sm transition-all group-hover:border-[#2ac5e8] group-hover:shadow-[0_0_0_3px_rgba(42,197,232,0.18)] sm:h-20 sm:w-20">
                  <img src={brand.img} alt={brand.name} className="w-full h-full object-contain" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#b5c6cf] group-hover:text-[#69ddfa] text-center">
                  {brand.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Productos reales del catálogo: no se anuncian descuentos no verificados. */}
        <section className="mb-16">
          <div className="soff-aurora-catalog w-full overflow-hidden rounded-[26px] border border-[#354e5c] bg-[#142430] p-5 sm:p-7 md:rounded-[32px] md:p-10">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="premium-eyebrow mb-2">LA SELECCIÓN SOFF</p>
                <h2 className="premium-display text-3xl sm:text-4xl">Descubrí productos SOFF</h2>
                <p className="mt-2 text-sm text-[#b1c4cf]">Novedades y productos que podés comprar ahora.</p>
              </div>
              <div className="flex w-fit rounded-full bg-[#253844] p-1">
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
                      activeTab === tab.id ? 'bg-[#2bd0f2] text-[#07151d] shadow-sm' : 'text-[#ccdee7] hover:bg-[#314654]'
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
                    <div className="h-[400px] animate-pulse rounded-2xl bg-[#2c414d]" />
                  </div>
                ))
              ) : visibleProducts.length > 0 ? (
                visibleProducts.map((product) => (
                  <div key={product.id} className="w-[260px] sm:w-[280px] shrink-0 snap-start">
                    <ProductCard product={product} userRole={userRole} />
                  </div>
                ))
              ) : (
                <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#46606c] bg-[#21323e] px-6 py-16 text-center">
                  <PackageSearch size={36} className="mb-3 text-[#8fa8b5]" />
                  <h3 className="text-lg font-bold text-[#eef7fb]">No hay productos para mostrar</h3>
                  <p className="mt-2 max-w-md text-sm text-[#b5c6cf]">Probá con la pestaña Novedades o visitá el catálogo completo.</p>
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
                <div className="mb-6 flex items-end justify-between border-b border-[#314652] pb-3">
                  <h2 className="premium-display text-3xl text-[#ecf5fa]">{catRow.title}</h2>
                  <Link
                    href={`/productos?categoria=${encodeURIComponent(catRow.id)}`}
                    className="text-sm font-bold text-[#61d8f5] transition-colors hover:text-[#ecf5fa]"
                  >
                    Ver todo
                  </Link>
                </div>

                <AutoCarousel speed={4000} label={catRow.title}>
                  {loading
                    ? Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="w-[200px] sm:w-[240px] shrink-0 snap-start h-72 animate-pulse rounded-lg bg-[#253642]" />
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

        <section id="oportunidades" className="scroll-mt-40 border-t border-[#314652] py-12">
          <div className="mb-7 flex items-center justify-between gap-4">
            <div>
              <p className="premium-eyebrow mb-2 flex items-center gap-2">
                <BadgePercent size={16} /> Oportunidades
              </p>
              <h2 className="premium-display text-3xl sm:text-4xl">Combos y rutinas destacadas</h2>
            </div>
            <Link href="/productos" className="hidden text-sm font-bold text-[#61d8f5] hover:text-[#ecf5fa] sm:inline">
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
                  className="group flex items-center justify-between rounded-2xl border border-[#324b58] bg-[#1b2b36] p-4 text-[#ecf5fa] transition hover:border-[#25c1e7] hover:shadow-md"
                  aria-label={`Consultar el combo ${combo.name} por WhatsApp`}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded bg-[#20313c] p-1">
                      {combo.image_url ? (
                        <img src={combo.image_url} alt={combo.name} className="h-full w-full object-contain" />
                      ) : (
                        <PackageSearch size={24} className="text-gray-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a8bbc5]">
                        {combo.combo_products?.length || 0} PRODUCTOS • {combo.discount_percentage}% OFF
                      </p>
                      <h3 className="line-clamp-2 text-[13px] font-semibold text-[#edf7fa]">{combo.name}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm font-bold text-[#6bddf4]">{formatPrice(discountedPrice)}</span>
                        <span className="text-[11px] text-[#8fa8b5] line-through">{formatPrice(originalPrice)}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#b5c6cf]">Precio estimado. Consultar disponibilidad y precio final por WhatsApp.</p>
                    </div>
                  </div>
                  <span className="ml-3 flex h-8 w-8 flex-none items-center justify-center rounded-full border border-[#46606c] text-[#a8bbc5] transition-colors group-hover:bg-[#263e4a]">
                    <ArrowRight size={16} />
                  </span>
                </a>
              )
            })}
            
            {combos.length === 0 && !loading && (
              <div className="col-span-full py-8 text-center text-[#a8bbc5]">
                Próximamente combos y rutinas disponibles.
              </div>
            )}
          </div>
        </section>

        <section id="rutinas" className="scroll-mt-40 border-t border-[#314652] py-12">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { title: 'Hidratación', copy: 'Para recuperar suavidad y movimiento.', href: '/productos?q=hidratacion' },
              { title: 'Reparación', copy: 'Para puntas secas o cabello tratado.', href: '/productos?q=reparacion' },
              { title: 'Color y brillo', copy: 'Para sostener tonos y luminosidad.', href: '/productos?q=tintura' },
            ].map((routine) => (
              <Link key={routine.title} href={routine.href} className="rounded-2xl border border-[#324b58] bg-[#1b2b36] p-7 text-[#ecf5fa] transition hover:-translate-y-1 hover:border-[#25c1e7] hover:shadow-lg">
                <Sparkles size={22} className="mb-4 text-[#5ad6f3]" />
                <h3 className="premium-display text-2xl">{routine.title}</h3>
                <p className="mt-2 text-sm text-[#b5c6cf]">{routine.copy}</p>
              </Link>
            ))}
          </div>
        </section>

        <section id="ubicacion" className="scroll-mt-40 border-t border-[#314652] py-16 text-center">
          <div className="mb-10">
            <p className="premium-eyebrow mb-2">VENÍ A CONOCERNOS</p>
            <h2 className="premium-display mb-3 text-4xl">Nuestra ubicación</h2>
            <p className="text-[#a8bbc5]">Visítanos y conoce todo nuestro catálogo</p>
            <div className="mx-auto mt-5 h-px w-20 bg-[#22c4ea]"></div>
          </div>

          <div className="mx-auto flex max-w-5xl flex-col overflow-hidden rounded-[26px] border border-[#324b58] bg-[#1b2b36] text-left text-[#ecf5fa] shadow-sm md:flex-row">
            {/* Left Col - Info */}
            <div className="flex-1 p-10 flex flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#1b3341] text-[#63d9f4]">
                <MapPin size={32} />
              </div>
              <h3 className="premium-display mb-2 text-3xl">Punto de entrega</h3>
              <p className="text-[#a8bbc5] mb-8">Avenida Independencia 2820, San Miguel de Tucumán</p>
              
              <a
                href="https://maps.app.goo.gl/BHEqyxZ16syyHsvo6"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#111d27] px-8 py-3.5 text-sm font-bold text-white transition hover:bg-[#1a7795]"
              >
                <div className="w-5 h-5 border-2 border-white rounded transform rotate-45 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-[#dce9ef] rounded-full"></div>
                </div>
                Ver en Google Maps
              </a>
            </div>

            {/* Right Col - Map Embed */}
            <div className="flex-1 min-h-[300px] md:min-h-full bg-[#253642] relative">
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
          className="fixed bottom-5 left-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#111d27] text-[#70e2fb] shadow-lg transition hover:bg-[#22c4ea] hover:text-[#09131a]"
        >
          <MessageCircle size={22} />
        </a>
      </main>

      <Footer />
    </div>
  )
}
