'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ProductCard from '@/components/ProductCard'
import { supabase } from '@/lib/supabase/client'
import {
  PRODUCT_SELECT,
  getAvailableStock,
  getRolePrice,
  normalizeRole,
  type Product,
  type UserRole,
} from '@/lib/catalog'

type ProductCatalogClientProps = {
  initialCategory: string
  initialQuery: string
  initialSort: string
}

type CategoryCount = {
  name: string
  count: number
}

const PAGE_SIZE = 32

export default function ProductCatalogClient({ initialCategory, initialQuery, initialSort }: ProductCatalogClientProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [userRole, setUserRole] = useState<UserRole>('minorista')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState(initialCategory.trim())
  const [query, setQuery] = useState(initialQuery.trim())
  const [sortBy, setSortBy] = useState(normalizeSort(initialSort))
  const [page, setPage] = useState(1)
  const router = useRouter()
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isMounted = true

    async function loadCatalog() {
      setLoading(true)

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
        .order('category', { ascending: true })
        .order('name', { ascending: true })
        .returns<Product[]>()

      if (!isMounted) return

      setUserRole(role)
      setProducts(data ?? [])
      setErrorMessage(error ? 'No pudimos cargar el catálogo. Probá de nuevo en unos minutos.' : null)
      setLoading(false)
    }

    void loadCatalog()

    return () => {
      isMounted = false
    }
  }, [])

  const categoryCounts = useMemo<CategoryCount[]>(() => {
    const counts = new Map<string, number>()

    for (const product of products) {
      const category = product.category?.trim() || 'SIN CATEGORIA'
      counts.set(category, (counts.get(category) ?? 0) + 1)
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'))
  }, [products])

  const filteredProducts = useMemo(() => {
    const searchTerm = normalizeText(query)

    return products.filter((product) => {
      const category = product.category?.trim() || 'SIN CATEGORIA'
      const matchesCategory = !selectedCategory || category === selectedCategory

      if (!matchesCategory) return false
      if (!searchTerm) return true

      return [product.name, product.category, product.internal_code, product.barcode].some((value) =>
        normalizeText(value).includes(searchTerm)
      )
    })
  }, [products, query, selectedCategory])

  const sortedProducts = useMemo(() => {
    const copy = [...filteredProducts]

    copy.sort((a, b) => {
      const priceA = getRolePrice(a, userRole)
      const priceB = getRolePrice(b, userRole)
      const stockA = getAvailableStock(a)
      const stockB = getAvailableStock(b)

      if (sortBy === 'name') return a.name.localeCompare(b.name, 'es')
      if (sortBy === 'price_asc') return sortablePrice(priceA) - sortablePrice(priceB)
      if (sortBy === 'price_desc') return priceB - priceA
      if (sortBy === 'stock_desc') return stockB - stockA || a.name.localeCompare(b.name, 'es')

      const availability = Number(stockB > 0 && priceB > 0) - Number(stockA > 0 && priceA > 0)
      if (availability !== 0) return availability

      return (b.created_at ?? '').localeCompare(a.created_at ?? '') || a.name.localeCompare(b.name, 'es')
    })

    return copy
  }, [filteredProducts, sortBy, userRole])

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleProducts = sortedProducts.slice(0, currentPage * PAGE_SIZE)
  const activeCategoryCount = selectedCategory
    ? categoryCounts.find((category) => category.name === selectedCategory)?.count ?? 0
    : products.length

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && currentPage < totalPages) {
          setPage((p) => p + 1)
        }
      },
      { rootMargin: '100px' }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [currentPage, totalPages])

  const pushCatalogRoute = (category: string, search: string) => {
    const params = new URLSearchParams()
    if (category) params.set('categoria', category)
    if (search.trim()) params.set('q', search.trim())
    router.push(`/productos${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setPage(1)
    pushCatalogRoute(category, query)
  }

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
    pushCatalogRoute(selectedCategory, query)
  }

  const clearFilters = () => {
    setSelectedCategory('')
    setQuery('')
    setPage(1)
    router.push('/productos')
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <Header />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <section className="mb-8 border-b border-gray-200 pb-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-brand-primary">Tienda online</p>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight text-[#002f5b] sm:text-4xl">
                {selectedCategory || 'Todos los productos'}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
                {loading ? 'Cargando catálogo...' : `${activeCategoryCount} productos cargados en esta vista.`}
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 lg:max-w-2xl">
              <form onSubmit={handleSearch} className="flex overflow-hidden rounded-full border border-gray-200 bg-[#f8f8f8]">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por nombre, código o barra"
                  className="min-w-0 flex-1 bg-transparent px-5 py-3 text-sm outline-none"
                />
                <button type="submit" className="flex w-12 items-center justify-center text-[#002f5b] hover:text-brand-primary" aria-label="Buscar">
                  <Search size={18} />
                </button>
              </form>

              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(event) => {
                    setSortBy(event.target.value)
                    setPage(1)
                  }}
                  aria-label="Ordenar productos"
                  className="w-full rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 outline-none focus:border-[#002f5b]"
                >
                  <option value="available">Disponibles primero</option>
                  <option value="name">Nombre A-Z</option>
                  <option value="price_asc">Menor precio</option>
                  <option value="price_desc">Mayor precio</option>
                  <option value="stock_desc">Mayor stock</option>
                </select>
                {(selectedCategory || query) && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-[#002f5b] hover:text-[#002f5b]"
                    aria-label="Limpiar filtros"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-gray-700 lg:hidden">
          <SlidersHorizontal size={18} />
          <span>Categorías</span>
        </div>
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2 lg:hidden">
          <CategoryButton active={!selectedCategory} label="Todas" count={products.length} onClick={() => handleCategoryChange('')} />
          {categoryCounts.map((category) => (
            <CategoryButton
              key={category.name}
              active={selectedCategory === category.name}
              label={category.name}
              count={category.count}
              onClick={() => handleCategoryChange(category.name)}
            />
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-40 rounded-lg border border-gray-200 bg-[#fbfbfb] p-4">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[#002f5b]">
                <SlidersHorizontal size={18} />
                <span>Categorías</span>
              </div>
              <div className="max-h-[560px] space-y-1 overflow-y-auto pr-1">
                <CategoryButton active={!selectedCategory} label="Todas" count={products.length} onClick={() => handleCategoryChange('')} full />
                {categoryCounts.map((category) => (
                  <CategoryButton
                    key={category.name}
                    active={selectedCategory === category.name}
                    label={category.name}
                    count={category.count}
                    onClick={() => handleCategoryChange(category.name)}
                    full
                  />
                ))}
              </div>
            </div>
          </aside>

          <section>
            {errorMessage && <div className="mb-6 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>}

            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                {loading
                  ? 'Buscando productos...'
                  : sortedProducts.length > 0
                    ? `Mostrando ${visibleProducts.length} de ${sortedProducts.length}`
                    : 'Sin resultados para estos filtros'}
              </p>
              {(selectedCategory || query) && (
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#002f5b]">
                  {[selectedCategory, query && `Busqueda: ${query}`].filter(Boolean).join(' / ')}
                </p>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="h-80 animate-pulse rounded-lg bg-gray-100" />
                ))}
              </div>
            ) : visibleProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {visibleProducts.map((product) => (
                    <ProductCard key={product.id} product={product} userRole={userRole} showCode />
                  ))}
                </div>

                <div ref={observerTarget} className="mt-8 flex h-10 w-full items-center justify-center">
                  {currentPage < totalPages && (
                    <span className="text-sm font-semibold text-gray-400 animate-pulse">
                      Cargando más productos...
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
                <h2 className="text-lg font-bold text-gray-900">No encontramos productos</h2>
                <p className="mt-2 text-sm text-gray-500">Probá otra búsqueda o limpiá los filtros para volver al catálogo completo.</p>
                <button type="button" onClick={clearFilters} className="mt-5 rounded bg-black px-5 py-3 text-sm font-bold text-white hover:bg-[#002f5b]">
                  Limpiar filtros
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function CategoryButton({ active, label, count, onClick, full = false }: {
  active: boolean
  label: string
  count: number
  onClick: () => void
  full?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-none items-center justify-between gap-3 rounded-full px-4 py-2 text-left text-sm font-bold transition-colors ${
        full ? 'w-full' : ''
      } ${active ? 'bg-[#002f5b] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
    >
      <span className="truncate">{label}</span>
      <span className={`text-[11px] ${active ? 'text-white/80' : 'text-gray-400'}`}>{count}</span>
    </button>
  )
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

function sortablePrice(price: number): number {
  return price > 0 ? price : Number.MAX_SAFE_INTEGER
}

function normalizeSort(sort: string): string {
  if (sort === 'name' || sort === 'price_asc' || sort === 'price_desc' || sort === 'stock_desc') return sort
  if (sort === 'stock') return 'stock_desc'
  return 'available'
}
