'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PackageSearch, ShoppingBag, Heart } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useFavorites } from '@/context/FavoritesContext'
import {
  formatPrice,
  getAvailableStock,
  getRolePrice,
  hasSellablePrice,
  productCategoryHref,
  type Product,
  type UserRole,
} from '@/lib/catalog'

type ProductCardProps = {
  product: Product
  userRole: UserRole
  showCode?: boolean
}

export default function ProductCardPremium({ product, userRole, showCode = false }: ProductCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const { addToCart } = useCart()
  const { isFavorite, toggleFavorite } = useFavorites()
  const fav = isFavorite(product.id)

  const price = getRolePrice(product, userRole)
  const stock = getAvailableStock(product)
  const hasPrice = hasSellablePrice(product, userRole)
  const isAvailable = stock > 0 && hasPrice

  const handleAddToCart = () => {
    if (!isAvailable) return

    addToCart({
      id: product.id,
      name: product.name,
      price,
      quantity: 1,
      image_url: product.image_url,
      stock,
    })
  }

  return (
    <article className="soff-product-card group flex h-full min-w-0 flex-col rounded-2xl border border-[#324b5a] bg-[#1d2d39] p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition hover:-translate-y-1 hover:border-[#35c9ec] hover:shadow-[0_14px_34px_rgba(0,0,0,0.30)]">
      <div className="relative mb-3">
        <Link
          href={`/producto/${product.id}`}
          className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[#e9f0f3] p-3"
        >
          {product.image_url && !imageFailed ? (
            <img
              loading="lazy"
              decoding="async"
              src={product.image_url}
              alt={product.name}
              onError={() => setImageFailed(true)}
              className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center text-[#a2b7c3]">
              <PackageSearch size={28} strokeWidth={1.5} />
              <span className="text-xs">Sin imagen</span>
            </div>
          )}
        </Link>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            toggleFavorite(product.id)
          }}
          aria-label={fav ? "Quitar de favoritos" : "Añadir a favoritos"}
          className={`absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200 z-10 ${
            fav 
              ? 'bg-red-50 text-red-500 shadow-sm scale-105' 
              : 'bg-white/80 backdrop-blur-xs text-[#a2b7c3] hover:text-red-500 hover:bg-white'
          }`}
          title={fav ? "Quitar de favoritos" : "Guardar en favoritos"}
        >
          <Heart size={16} fill={fav ? "currentColor" : "none"} strokeWidth={fav ? 2.5 : 2} />
        </button>
      </div>

      <div className="flex flex-1 flex-col px-1 pb-1">
        <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
          <Link
            href={productCategoryHref(product.category)}
            className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b1c4cf] hover:text-[#5cdafa]"
          >
            {product.category || 'Productos'}
          </Link>
          {showCode && product.internal_code && <span className="flex-none text-[10px] text-[#a2b7c3]">#{product.internal_code}</span>}
        </div>

        <Link href={`/producto/${product.id}`} className="mt-1">
          <h3 className="line-clamp-3 min-h-[48px] text-[13px] font-semibold leading-snug text-[#ecf6fa] transition-colors hover:text-[#6bdef8]">
            {product.name}
          </h3>
        </Link>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-[#f2f9fb]">{hasPrice ? formatPrice(price) : 'Consultar precio'}</p>
            
            {/* Precio mayorista para incentivar (solo si es minorista) */}
            {userRole === 'minorista' && product.price_mayorista && Number(product.price_mayorista) > 0 && (
              <p className="text-[10px] text-[#a2b7c3] font-medium leading-tight mt-0.5" title="Precio para mayoristas">
                Por mayor: {formatPrice(Number(product.price_mayorista))}
              </p>
            )}
            
            <p className="text-[11px] text-[#b1c4cf] mt-0.5">
              {stock > 0 ? `${stock} disponibles` : 'Sin stock'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!isAvailable}
            aria-label={isAvailable ? `Agregar ${product.name} al carrito` : `${product.name} no disponible`}
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#25c4e8] text-[#071620] transition-colors hover:bg-[#7cdef5] hover:text-[#071620] disabled:cursor-not-allowed disabled:bg-[#334550] disabled:text-[#9aadb8]"
          >
            <ShoppingBag size={16} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </article>
  )
}
