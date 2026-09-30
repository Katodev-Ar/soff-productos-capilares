'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface FavoriteItem {
  productId: string
  notifyStock: boolean
  notifySale: boolean
  createdAt?: string
}

interface FavoritesContextType {
  favorites: FavoriteItem[]
  favoriteCount: number
  isFavorite: (productId: string) => boolean
  toggleFavorite: (productId: string) => Promise<boolean>
  updateNotificationSettings: (productId: string, settings: { notifyStock?: boolean; notifySale?: boolean }) => Promise<void>
  removeFromFavorites: (productId: string) => Promise<void>
  isLoading: boolean
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

const getStorageKey = (userId?: string | null) => 
  userId ? `soff_favorites_${userId}` : 'soff_favorites_guest'

export const FavoritesProvider = ({ children }: { children: React.ReactNode }) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 1. Sincronizar favoritos aislados por usuario y escuchar cambios de sesión
  useEffect(() => {
    let currentUserId: string | null = null

    async function syncFavorites(user: any) {
      setIsLoading(true)
      try {
        const key = getStorageKey(user?.id)
        const localData = typeof window !== 'undefined' ? localStorage.getItem(key) : null
        let initialFavs: FavoriteItem[] = []
        if (localData) {
          try {
            initialFavs = JSON.parse(localData)
          } catch (e) {}
        }

        if (user) {
          const { data: dbWishlist } = await supabase
            .from('wishlist')
            .select('product_id, notify_stock, notify_sale, created_at')
            .eq('user_id', user.id)

          if (dbWishlist && dbWishlist.length > 0) {
            const mapped: FavoriteItem[] = dbWishlist.map(w => ({
              productId: w.product_id,
              notifyStock: w.notify_stock ?? true,
              notifySale: w.notify_sale ?? true,
              createdAt: w.created_at
            }))

            setFavorites(mapped)
            if (typeof window !== 'undefined') {
              localStorage.setItem(key, JSON.stringify(mapped))
            }
          } else {
            setFavorites([])
            if (typeof window !== 'undefined') {
              localStorage.removeItem(key)
            }
          }
        } else {
          // Usuario no autenticado (invitado)
          setFavorites(initialFavs)
        }
      } catch (err) {
        console.error('Error sincronizando favoritos:', err)
      } finally {
        setIsLoading(false)
      }
    }

    // Inicializar con usuario actual
    supabase.auth.getUser().then(({ data: { user } }) => {
      currentUserId = user?.id || null
      syncFavorites(user)
    })

    // Escuchar cambios de autenticación (login, logout, cambio de cuenta)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user?.id || null
      if (newUserId !== currentUserId || event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        currentUserId = newUserId
        syncFavorites(session?.user || null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Guardar en localStorage aislado por usuario
  const saveLocal = async (items: FavoriteItem[]) => {
    try {
      if (typeof window === 'undefined') return
      const { data: { user } } = await supabase.auth.getUser()
      const key = getStorageKey(user?.id)
      localStorage.setItem(key, JSON.stringify(items))
    } catch (e) {}
  }

  const isFavorite = useCallback((productId: string): boolean => {
    return favorites.some(f => f.productId === productId)
  }, [favorites])

  const toggleFavorite = async (productId: string): Promise<boolean> => {
    const existing = favorites.find(f => f.productId === productId)
    const { data: { user } } = await supabase.auth.getUser()

    if (existing) {
      // Eliminar de favoritos
      const updated = favorites.filter(f => f.productId !== productId)
      setFavorites(updated)
      await saveLocal(updated)

      if (user) {
        await supabase
          .from('wishlist')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId)
      }
      return false
    } else {
      // Agregar a favoritos
      const newItem: FavoriteItem = {
        productId,
        notifyStock: true,
        notifySale: true,
        createdAt: new Date().toISOString()
      }
      const updated = [newItem, ...favorites]
      setFavorites(updated)
      await saveLocal(updated)

      if (user) {
        await supabase
          .from('wishlist')
          .upsert({
            user_id: user.id,
            product_id: productId,
            notify_stock: true,
            notify_sale: true
          }, { onConflict: 'user_id,product_id' })
      }
      return true
    }
  }

  const updateNotificationSettings = async (
    productId: string,
    settings: { notifyStock?: boolean; notifySale?: boolean }
  ) => {
    const updated = favorites.map(f => {
      if (f.productId === productId) {
        return {
          ...f,
          notifyStock: settings.notifyStock !== undefined ? settings.notifyStock : f.notifyStock,
          notifySale: settings.notifySale !== undefined ? settings.notifySale : f.notifySale
        }
      }
      return f
    })

    setFavorites(updated)
    await saveLocal(updated)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('wishlist')
        .update({
          notify_stock: settings.notifyStock,
          notify_sale: settings.notifySale
        })
        .eq('user_id', user.id)
        .eq('product_id', productId)
    }
  }

  const removeFromFavorites = async (productId: string) => {
    const updated = favorites.filter(f => f.productId !== productId)
    setFavorites(updated)
    await saveLocal(updated)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId)
    }
  }

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        favoriteCount: favorites.length,
        isFavorite,
        toggleFavorite,
        updateNotificationSettings,
        removeFromFavorites,
        isLoading
      }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export const useFavorites = () => {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}
