'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingBag, Check, Sparkles, ArrowRight, Package } from 'lucide-react'
import { HairColorShade } from './types'
import { formatPrice } from '@/lib/catalog'
import { useCart } from '@/context/CartContext'

interface HairProductCardProps {
  shade: HairColorShade
}

export default function HairProductCard({ shade }: HairProductCardProps) {
  const { addToCart, setIsCartOpen } = useCart()
  const [added, setAdded] = useState(false)

  const product = shade.matchedProduct

  const handleAddToCart = () => {
    if (!product) return

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image_url: product.image_url,
      stock: 10,
    })

    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
    setIsCartOpen(true)
  }

  return (
    <div className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden p-5 transition-all hover:shadow-md">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
        <div className="flex items-center gap-2">
          <span
            className="w-4 h-4 rounded-full border border-black/10 shadow-inner"
            style={{ backgroundColor: shade.hex }}
          />
          <h3 className="font-semibold text-gray-900 text-sm">
            Tono Seleccionado: <span className="text-[#e88baf] font-bold">{shade.name}</span>
          </h3>
        </div>
        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-pink-50 text-[#e88baf] border border-pink-200">
          Tono {shade.toneCode}
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-4">{shade.description}</p>

      {product ? (
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-gray-50/70 rounded-xl p-3.5 border border-gray-100">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white border border-gray-200 flex-shrink-0 flex items-center justify-center">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                unoptimized
                className="object-contain p-1"
                sizes="64px"
              />
            ) : (
              <Package className="w-8 h-8 text-gray-300" />
            )}
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-pink-600">
              {product.brand}
            </span>
            <h4 className="text-xs font-medium text-gray-900 line-clamp-2 leading-snug">
              {product.name}
            </h4>
            <div className="text-sm font-bold text-gray-900 mt-1">
              {formatPrice(product.price)}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Link
              href={`/producto/${product.id}`}
              className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition"
              title="Ver producto completo"
            >
              Ver <ArrowRight className="w-3 h-3 ml-1" />
            </Link>

            <button
              onClick={handleAddToCart}
              className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm transition ${
                added
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-black hover:bg-[#e88baf] hover:text-black'
              }`}
            >
              {added ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1" /> ¡Agregado!
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5 mr-1.5" /> Agregar al Carrito
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-pink-50/50 rounded-xl p-3 border border-pink-100 text-center text-xs text-gray-600">
          <Sparkles className="w-4 h-4 text-[#e88baf] mx-auto mb-1" />
          <span>
            Tono de fantasía experimental. Podés consultar a nuestro equipo por WhatsApp para formular este matiz personalizado en tintura semi-permanente.
          </span>
        </div>
      )}
    </div>
  )
}
