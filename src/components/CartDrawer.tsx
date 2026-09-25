'use client'

import { type CartItem, useCart } from '@/context/CartContext'
import { useState } from 'react'
import { PackageSearch, ShoppingBag, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { FREE_SHIPPING_THRESHOLD, formatPrice } from '@/lib/catalog'
import { TePuedeInteresar } from './TePuedeInteresar'

export default function CartDrawer() {
  const { isCartOpen, setIsCartOpen, items, updateQuantity, removeFromCart, cartSubtotal, cartTotal, cartCount, volumeDiscountPercentage, freeShippingThreshold } = useCart()

  if (!isCartOpen) return null

  const threshold = freeShippingThreshold || FREE_SHIPPING_THRESHOLD
  const progressPercentage = Math.min(100, (cartTotal / threshold) * 100)
  const remainingForFreeShipping = threshold - cartTotal

  return (
    <>
      {/* Overlay oscuro */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />
      
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold uppercase tracking-widest text-gray-900 flex items-center">
            <ShoppingBag size={20} className="mr-2" /> Mi Carrito ({cartCount})
          </h2>
          <button type="button" onClick={() => setIsCartOpen(false)} aria-label="Cerrar carrito" className="text-gray-500 hover:text-black">
            <X size={24} />
          </button>
        </div>

        {/* Barra de envío gratis */}
        <div className="p-4 bg-white border-b">
          {remainingForFreeShipping > 0 ? (
            <p className="text-sm text-gray-600 mb-2 font-medium text-center">
              Te faltan <span className="font-bold text-black">{formatPrice(remainingForFreeShipping)}</span> para <span className="font-bold">ENVÍO GRATIS</span>
            </p>
          ) : (
            <p className="text-sm text-green-600 mb-2 font-bold text-center uppercase tracking-widest">
              ¡Felicidades! Tienes envío gratis
            </p>
          )}
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${remainingForFreeShipping > 0 ? 'bg-black' : 'bg-green-500'}`} 
              style={{ width: `${progressPercentage}%` }} 
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <ShoppingBag size={48} className="mb-4 opacity-50" />
              <p>Tu carrito está vacío</p>
              <button 
                type="button"
                onClick={() => setIsCartOpen(false)} 
                className="mt-6 px-6 py-2 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
              >
                Seguir comprando
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map(item => (
                <CartLineItem
                  key={item.id}
                  item={item}
                  onRemove={() => removeFromCart(item.id)}
                  onDecrease={() => updateQuantity(item.id, item.quantity - 1)}
                  onIncrease={() => updateQuantity(item.id, item.quantity + 1)}
                />
              ))}
              
              <TePuedeInteresar />
            </div>
          )}
        </div>

        {/* Footer / Checkout */}
        {items.length > 0 && (
          <div className="p-6 border-t bg-gray-50">
            <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatPrice(cartSubtotal)}</span>
            </div>
            
            {volumeDiscountPercentage > 0 && (
              <div className="flex justify-between items-center mb-2 text-sm text-green-600 font-medium">
                <span>Descuento por volumen ({volumeDiscountPercentage}%)</span>
                <span>-{formatPrice(cartSubtotal * (volumeDiscountPercentage / 100))}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center mb-4 text-lg border-t border-gray-200 pt-3 mt-3">
              <span className="font-medium text-gray-700">Total</span>
              <span className="font-bold text-black">{formatPrice(cartTotal)}</span>
            </div>
            
            <p className="text-[11px] text-gray-500 mb-6 text-center">Impuestos incluidos. Los gastos de envío se calculan en la pantalla de pago.</p>
            <Link 
              href="/checkout"
              onClick={() => setIsCartOpen(false)}
              className="w-full block text-center bg-[#c1272d] text-white py-4 font-bold uppercase tracking-widest text-sm hover:bg-black transition-colors rounded"
            >
              Ir al checkout
            </Link>
          </div>
        )}
      </div>
    </>
  )
}

type CartLineItemProps = {
  item: CartItem
  onRemove: () => void
  onDecrease: () => void
  onIncrease: () => void
}

function CartLineItem({ item, onRemove, onDecrease, onIncrease }: CartLineItemProps) {
  const isAtStockLimit = item.stock != null && item.quantity >= item.stock

  return (
    <div className="flex gap-4">
      <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center p-2 flex-shrink-0">
        <CartProductImage imageUrl={item.image_url} name={item.name} />
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <h4 className="text-sm font-medium text-gray-900 line-clamp-2 pr-4">{item.name}</h4>
          <button type="button" onClick={onRemove} aria-label={`Eliminar ${item.name}`} className="text-gray-400 hover:text-red-500">
            <Trash2 size={16} />
          </button>
        </div>
        <div className="flex justify-between items-end mt-2">
          <div className="flex items-center border border-gray-300 rounded">
            <button type="button" onClick={onDecrease} aria-label={`Restar ${item.name}`} className="px-3 py-1 text-gray-500 hover:text-black hover:bg-gray-50">-</button>
            <span className="px-3 py-1 text-sm font-medium w-8 text-center">{item.quantity}</span>
            <button
              type="button"
              onClick={onIncrease}
              disabled={isAtStockLimit}
              className="px-3 py-1 text-gray-500 hover:bg-gray-50 hover:text-black disabled:cursor-not-allowed disabled:text-gray-300"
              aria-label={isAtStockLimit ? `Stock máximo para ${item.name}` : `Sumar ${item.name}`}
              title={isAtStockLimit ? 'Stock máximo disponible' : undefined}
            >
              +
            </button>
          </div>
          <div className="text-sm font-bold text-black">
            {formatPrice(item.price * item.quantity)}
          </div>
        </div>
        {isAtStockLimit && <p className="mt-1 text-[11px] font-medium text-[#c1272d]">Stock máximo disponible</p>}
      </div>
    </div>
  )
}

function CartProductImage({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  const [imageFailed, setImageFailed] = useState(false)

  if (!imageUrl || imageFailed) {
    return (
      <div className="flex flex-col items-center gap-1 text-gray-400">
        <PackageSearch size={20} strokeWidth={1.5} />
        <span className="text-[10px]">Sin foto</span>
      </div>
    )
  }

  return <img src={imageUrl} alt={name} onError={() => setImageFailed(true)} className="max-h-full object-contain mix-blend-multiply" />
}
