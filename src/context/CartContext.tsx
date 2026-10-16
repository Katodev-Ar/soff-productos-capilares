'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { FREE_SHIPPING_THRESHOLD as DEFAULT_THRESHOLD } from '@/lib/catalog'
import { channelOf, couponAllowedFor, volumeDiscountFor, minimumRemaining, type CommercialTerms, type CustomerChannel } from '@/lib/commercialPricingPolicy'

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
  pricingStatus: 'checking' | 'ready' | 'error';
  pricingError: string | null;
  customerChannel: CustomerChannel;
  commercialTerms: CommercialTerms | null;
  minimumMet: boolean;
  remainingMinimum: number;
  refreshPrices: () => Promise<boolean>;
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
  const [pricingStatus, setPricingStatus] = useState<'checking' | 'ready' | 'error'>('checking')
  const [pricingError, setPricingError] = useState<string | null>(null)
  const [customerChannel, setCustomerChannel] = useState<CustomerChannel>('minorista')
  const [commercialTerms, setCommercialTerms] = useState<CommercialTerms | null>(null)
  const [authRevision, setAuthRevision] = useState(0)
  const [refreshRevision, setRefreshRevision] = useState(0)
  const pricingRequest = useRef(0)
  const cartItemsRef = useRef(items)
  const channelRef = useRef<CustomerChannel>('minorista')
  const termsVersionRef = useRef('')
  cartItemsRef.current = items

  
  const [couponCode, setCouponCode] = useState<string | null>(null)
  const [couponDiscountPercentage, setCouponDiscountPercentage] = useState(0)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(DEFAULT_THRESHOLD)

  // P017: las reglas se obtienen únicamente del servidor junto con precios autorizados.
  // Nunca se leen directamente tablas privadas desde el navegador.

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

  // Un rol puede cambiar en otra pestaña o desde P015; verificar al volver a la tienda.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setAuthRevision(v => v + 1)
      }
    })
    const checkAgain = () => setRefreshRevision(v => v + 1)
    const onVisible = () => { if (document.visibilityState === 'visible') checkAgain() }
    window.addEventListener('focus', checkAgain)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      subscription.unsubscribe()
      window.removeEventListener('focus', checkAgain)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const productIds = items.map(item => item.id).sort().join('|')
  const refreshPrices = useCallback(async (): Promise<boolean> => {
    if (!cartLoaded) return false
    const requestId = ++pricingRequest.current
    const current = cartItemsRef.current
    setPricingStatus('checking')
    setPricingError(null)
    setCommercialTerms(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/cart/prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ ids: current.map(item => item.id) }),
        cache: 'no-store',
      })
      const result: unknown = await response.json()
      if (!response.ok) {
        const message = result && typeof result === 'object' && 'error' in result && typeof result.error === 'string'
          ? result.error : 'No se pudieron comprobar los precios del carrito.'
        throw new Error(message)
      }
      if (!result || typeof result !== 'object' || !('items' in result) || !Array.isArray(result.items) || !('role' in result)) {
        throw new Error('Respuesta de precios inválida.')
      }
      const role = channelOf(typeof result.role === 'string' ? result.role : 'minorista')
      const terms = 'terms' in result ? result.terms as CommercialTerms : null
      if (!terms || terms.channel !== role || !Number.isFinite(terms.minimumOrder) ||
          !['inherit','disabled','threshold','always'].includes(terms.shippingMode) ||
          !Number.isFinite(terms.firstDiscount) || !Number.isFinite(terms.secondDiscount) ||
          typeof terms.allowCoupons !== 'boolean' || typeof terms.version !== 'string') {
        throw new Error('No se pudieron verificar las condiciones comerciales.')
      }
      const rows = new Map<string, CartItem>()
      for (const row of result.items as CartItem[]) {
        if (typeof row.id !== 'string' || !Number.isFinite(row.price) || row.price <= 0 ||
            !Number.isFinite(row.stock) || Number(row.stock) < 1 || rows.has(row.id)) {
          throw new Error('El catálogo devolvió datos de precio o stock inválidos.')
        }
        rows.set(row.id, row)
      }
      if (rows.size !== current.length || current.some(item => !rows.has(item.id))) {
        throw new Error('Algunos artículos dejaron de estar disponibles. Revisá el carrito.')
      }
      if (requestId !== pricingRequest.current) return false
      const changed = role !== channelRef.current || (termsVersionRef.current !== '' && termsVersionRef.current !== terms.version) || current.some(item => {
        const updated = rows.get(item.id)!
        return item.price !== updated.price || item.stock !== updated.stock || item.quantity > Number(updated.stock)
      })
      channelRef.current = role
      termsVersionRef.current = terms.version
      setCustomerChannel(role)
      setCommercialTerms(terms)
      setFreeShippingThreshold(terms.freeShippingThreshold ?? DEFAULT_THRESHOLD)
      if (!couponAllowedFor(role,terms)) {
        setCouponCode(null)
        setCouponDiscountPercentage(0)
      }
      setItems(existing => existing.map(item => ({
        ...item, ...rows.get(item.id)!, quantity: Math.min(item.quantity, Number(rows.get(item.id)!.stock)),
      })))
      setPricingStatus('ready')
      return !changed
    } catch (cause) {
      if (requestId === pricingRequest.current) {
        setCommercialTerms(null)
        setPricingStatus('error')
        setPricingError(cause instanceof Error ? cause.message : 'Error de verificación del carrito.')
      }
      return false
    }
  }, [cartLoaded])

  useEffect(() => {
    if (!cartLoaded) return
    void refreshPrices()
  }, [cartLoaded, productIds, authRevision, refreshRevision, refreshPrices])

  const addToCart = (item: CartItem) => {
    setPricingStatus('checking')
    setRefreshRevision(v => v + 1)
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
    setPricingStatus('checking')
    setRefreshRevision(v => v + 1)
    setItems(current => current.filter(i => i.id !== id))
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id)
      return
    }
    setPricingStatus('checking')
    setRefreshRevision(v => v + 1)
    setItems(current => current.map(i => {
      if (i.id !== id) return i

      const stockLimit = i.stock ?? Number.MAX_SAFE_INTEGER
      return { ...i, quantity: Math.min(stockLimit, quantity) }
    }))
  }

  const clearCart = () => { setPricingStatus('checking'); setRefreshRevision(v => v + 1); setItems([]) }

  const cartSubtotal = pricingStatus === 'ready' ? items.reduce((total, item) => total + (item.price * item.quantity), 0) : 0
  const cartCount = items.reduce((count, item) => count + item.quantity, 0)
  
  // Calcular descuentos
  const volumeDiscountPercentage = commercialTerms ? volumeDiscountFor(cartSubtotal, customerChannel, commercialTerms) : 0
  const totalDiscountPercentage = Math.min(100, volumeDiscountPercentage +
    (couponAllowedFor(customerChannel,commercialTerms) ? couponDiscountPercentage : 0))
  const cartTotal = Math.round(cartSubtotal * (1 - totalDiscountPercentage / 100) * 100) / 100
  const remainingMinimum = commercialTerms ? minimumRemaining(cartSubtotal,commercialTerms) : 0
  const minimumMet = commercialTerms !== null && remainingMinimum === 0

  return (
    <CartContext.Provider value={{
      items, pricingStatus, pricingError, customerChannel, commercialTerms, minimumMet, remainingMinimum, refreshPrices,
      addToCart, removeFromCart, updateQuantity, clearCart,
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
