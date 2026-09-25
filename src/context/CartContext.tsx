'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { FREE_SHIPPING_THRESHOLD as DEFAULT_THRESHOLD } from '@/lib/catalog'

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
  stock?: number | null;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  cartSubtotal: number;
  cartTotal: number;
  cartCount: number;
  volumeDiscountPercentage: number;
  couponCode: string | null;
  setCouponCode: (code: string | null) => void;
  couponDiscountPercentage: number;
  setCouponDiscountPercentage: (val: number) => void;
  freeShippingThreshold: number;
  setFreeShippingThreshold: (val: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [cartLoaded, setCartLoaded] = useState(false)
  
  const [couponCode, setCouponCode] = useState<string | null>(null)
  const [couponDiscountPercentage, setCouponDiscountPercentage] = useState(0)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(DEFAULT_THRESHOLD)

  // Load free shipping threshold from Supabase store_settings
  useEffect(() => {
    async function loadThreshold() {
      try {
        const { data } = await supabase
          .from('store_settings')
          .select('value')
          .eq('key', 'free_shipping_threshold')
          .single()
        if (data?.value) {
          const val = parseInt(data.value, 10)
          if (!isNaN(val) && val > 0) setFreeShippingThreshold(val)
        }
      } catch (e) {
        console.error('Error cargando monto de envio gratis:', e)
      }
    }
    loadThreshold()
  }, [])

  useEffect(() => {
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled) return

      const saved = window.localStorage.getItem('soff_cart')
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as CartItem[]
          if (Array.isArray(parsed)) setItems(parsed)
        } catch {
          window.localStorage.removeItem('soff_cart')
        }
      }

      setCartLoaded(true)
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!cartLoaded) return
    window.localStorage.setItem('soff_cart', JSON.stringify(items))
  }, [cartLoaded, items])

  const addToCart = (item: CartItem) => {
    setItems(current => {
      const existing = current.find(i => i.id === item.id)
      const stockLimit = item.stock ?? existing?.stock ?? Number.MAX_SAFE_INTEGER
      const requestedQuantity = Math.max(1, item.quantity)

      if (stockLimit <= 0) return current

      if (existing) {
        const nextQuantity = Math.min(stockLimit, existing.quantity + requestedQuantity)
        return current.map(i => i.id === item.id ? { ...i, ...item, quantity: nextQuantity } : i)
      }

      return [...current, { ...item, quantity: Math.min(stockLimit, requestedQuantity) }]
    })
    setIsCartOpen(true)
  }

  const removeFromCart = (id: string) => {
    setItems(current => current.filter(i => i.id !== id))
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id)
      return
    }
    setItems(current => current.map(i => {
      if (i.id !== id) return i

      const stockLimit = i.stock ?? Number.MAX_SAFE_INTEGER
      return { ...i, quantity: Math.min(stockLimit, quantity) }
    }))
  }

  const clearCart = () => setItems([])

  const cartSubtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0)
  const cartCount = items.reduce((count, item) => count + item.quantity, 0)
  
  // Calcular descuentos
  let volumeDiscountPercentage = 0
  if (cartSubtotal >= 70000) {
    volumeDiscountPercentage = 10
  } else if (cartSubtotal >= 45000) {
    volumeDiscountPercentage = 5
  }

  const totalDiscountPercentage = Math.min(100, volumeDiscountPercentage + couponDiscountPercentage)
  const cartTotal = cartSubtotal * (1 - totalDiscountPercentage / 100)

  return (
    <CartContext.Provider value={{
      items, addToCart, removeFromCart, updateQuantity, clearCart,
      isCartOpen, setIsCartOpen, 
      cartSubtotal, cartTotal, cartCount,
      volumeDiscountPercentage,
      couponCode, setCouponCode,
      couponDiscountPercentage, setCouponDiscountPercentage,
      freeShippingThreshold, setFreeShippingThreshold
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) throw new Error('useCart must be used within a CartProvider')
  return context
}
