'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BadgePercent, MapPin, MessageCircle, PackageSearch, Sparkles, Droplets, Droplet, Palette, Beaker, ShieldCheck, ChevronRight } from 'lucide-react'
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
  normalizeRole,
  type Product,
  type UserRole,
} from '@/lib/catalog'

const fallbackOffers = [
  {
    title: 'Rutina hidratación intensa',
    category: 'MASCARAS',
    price: 28050,
    oldPrice: 33000,
    href: '/productos?q=hidratacion',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=300&q=80',
  },
  {
    title: 'Nutrición para largos castigados',
    category: 'SKALA POTE',
    price: 43095,
    oldPrice: 50700,
    href: '/productos?categoria=SKALA%20POTE',
    image: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=300&q=80',
  },
  {
    title: 'Color radiante y brillo',
    category: 'TINTURAS FIDELITE',
    price: 30090,
    oldPrice: 35400,
    href: '/productos?q=tintura',
    image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=300&q=80',
  },
  {
    title: 'Shampoo de uso diario',
    category: 'SHAMPOO',
    price: 8250,
    oldPrice: 11000,
    href: '/productos?categoria=SHAMPOO',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=300&q=80',
  },
]

const benefitItems = [
  'Libre de parabenos',
  'Libre de siliconas',
  'Libre de sal',
  'Apto veganos',
  'Eficacia comprobada',
  'Cruelty free',
]

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({})
  const [banners, setBanners] = useState<any[]>([])
  const [combos, setCombos] = useState<any[]>([])
  const [userRole, setUserRole] = useState<UserRole>('minorista')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'novedades' | 'ofertas'>('novedades')
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
        .from('products')
        .select(PRODUCT_SELECT)
        .order('created_at', { ascending: false })
        .limit(150)
        .returns<Product[]>()

      // Fetch one image per category from the entire catalog to avoid missing images
      const { data: catData } = await supabase
        .from('products')
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

      // Fetch combos
      const { data: comboData } = await supabase
        .from('combos')
        .select('*, combo_products(product:products(*))')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (isMounted) {
        if (error) {
          console.error('Error fetching home data:', error)
          setErrorMessage('Error al cargar la página.')
        } else {
          setProducts(data || [])
          setBanners(bannerData || [])
          setCombos(comboData || [])
          
          const catImgMap: Record<string, string> = {}
          if (catData) {
            for (const p of catData) {
              if (p.category && p.image_url && !catImgMap[p.category]) {
                catImgMap[p.category.toUpperCase()] = p.image_url
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
    if (activeTab === 'ofertas') {
      return products.filter((product) => getRolePrice(product, userRole) > 0).slice(0, 6)
    }

    return products.slice(0, 6)
  }, [activeTab, products, userRole])

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

        {/* Dynamic Categories Scroll Row */}
        <section className="mb-12 border-b border-gray-100 pb-8">
          <AutoCarousel speed={5000}>
            {Object.entries(categoryImages).map(([catName, imgUrl]) => {
              return (
                <Link
                  key={catName}
                  href={`/productos?categoria=${encodeURIComponent(catName)}`}
                  className="snap-start shrink-0 flex flex-col items-center gap-2 group w-20 sm:w-24"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-full flex items-center justify-center overflow-hidden border border-gray-100 group-hover:border-brand-primary group-hover:shadow-md transition-all p-2">
                    <img src={imgUrl} alt={catName} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold text-gray-700 text-center leading-tight group-hover:text-brand-primary capitalize">
                    {catName.toLowerCase()}
                  </span>
                </Link>
              )
            })}
          </AutoCarousel>
        </section>

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

        {/* Fravega-style Special Offers Section */}
        <section className="mb-16">
          <div className="bg-[#f2e6ff] rounded-[32px] p-6 md:p-10 w-full overflow-hidden">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-3xl font-bold text-[#2d1b4e]">Ofertas Únicas</h2>
              </div>
              <div className="flex w-fit rounded-full bg-white/50 p-1">
                {[
                  { id: 'novedades', label: 'Novedades' },
                  { id: 'ofertas', label: 'Disponibles' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as 'novedades' | 'ofertas')}
                    className={`rounded-full px-5 py-2 text-sm font-bold transition-colors ${
                      activeTab === tab.id ? 'bg-[#4a2e85] text-white shadow-sm' : 'text-[#4a2e85] hover:bg-white/50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {errorMessage && <div className="mb-6 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>}

            <AutoCarousel speed={3500}>
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
                <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/50 bg-white/30 px-6 py-16 text-center">
                  <PackageSearch size={36} className="mb-3 text-[#4a2e85]/50" />
                  <h3 className="text-lg font-bold text-[#2d1b4e]">Todavía no hay productos cargados</h3>
                  <p className="mt-2 max-w-md text-sm text-[#4a2e85]/70">Cuando cargues productos desde el panel admin, van a aparecer automáticamente acá.</p>
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

                <AutoCarousel speed={4000}>
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
                <Link key={combo.id} href={`/combo/${combo.id}`} className="flex items-center justify-between rounded-lg bg-[#f8f8f8] p-4 transition hover:shadow-md">
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
                    </div>
                  </div>
                  <span className="ml-3 flex h-8 w-8 flex-none items-center justify-center rounded-full border border-gray-300 text-gray-500 transition-colors group-hover:bg-white">
                    <ArrowRight size={16} />
                  </span>
                </Link>
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

        <section className="mb-12 flex flex-wrap gap-3 border-t border-gray-200 pt-10">
          {benefitItems.map((pill) => (
            <div key={pill} className="flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2 text-[13px] font-semibold text-[#002f5b]">
              <ShieldCheckIcon />
              {pill}
            </div>
          ))}
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

function ShieldCheckIcon() {
  return <span className="flex h-4 w-4 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">✓</span>
}

function OfferImage({ src, alt }: { src: string; alt: string }) {
  const [imageFailed, setImageFailed] = useState(false)

  if (imageFailed) {
    return (
      <div className="flex h-full w-full items-center justify-center text-gray-400">
        <PackageSearch size={20} strokeWidth={1.5} />
      </div>
    )
  }

  return <img src={src} className="h-full w-full object-cover" alt={alt} onError={() => setImageFailed(true)} />
}
