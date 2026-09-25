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

const LOCAL_STORAGE_KEY = 'soff_favorites_v1'

export const FavoritesProvider = ({ children }: { children: React.ReactNode }) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 1. Cargar favoritos iniciales desde localStorage y Supabase
  useEffect(() => {
    async function loadFavorites() {
      try {
        // Carga inicial local para respuesta instantánea
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY)
        let initialFavs: FavoriteItem[] = []
        if (localData) {
          try {
            initialFavs = JSON.parse(localData)
            setFavorites(initialFavs)
          } catch (e) {}
        }

        // Si el usuario está autenticado, sincronizar con Supabase `wishlist`
        const { data: { user } } = await supabase.auth.getUser()
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

            // Combinar con locales si hubiese alguno nuevo
            const merged = [...mapped]
            for (const localItem of initialFavs) {
              if (!merged.some(m => m.productId === localItem.productId)) {
                merged.push(localItem)
                // Subir a base de datos
                await supabase.from('wishlist').insert({
                  user_id: user.id,
                  product_id: localItem.productId,
                  notify_stock: localItem.notifyStock,
                  notify_sale: localItem.notifySale
                })
              }
            }

            setFavorites(merged)
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged))
          } else if (initialFavs.length > 0) {
            // Migrar favoritos locales a la base de datos
            const rowsToInsert = initialFavs.map(f => ({
              user_id: user.id,
              product_id: f.productId,
              notify_stock: f.notifyStock,
              notify_sale: f.notifySale
            }))
            await supabase.from('wishlist').insert(rowsToInsert)
          }
        }
      } catch (err) {
        console.error('Error cargando favoritos:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadFavorites()
  }, [])

  // Guardar en localStorage cada vez que cambien
  const saveLocal = (items: FavoriteItem[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items))
    } catch (e) {}
  }

  const isFavorite = useCallback((productId: string): boolean => {
    return favorites.some(f => f.productId === productId)
  }, [favorites])

  const toggleFavorite = async (productId: string): Promise<boolean> => {
    const exists = isFavorite(productId)
    const { data: { user } } = await supabase.auth.getUser()

    if (exists) {
      // Eliminar
      const updated = favorites.filter(f => f.productId !== productId)
      setFavorites(updated)
      saveLocal(updated)

      if (user) {
        await supabase
          .from('wishlist')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId)
      }
      return false
    } else {
      // Agregar
      const newItem: FavoriteItem = {
        productId,
        notifyStock: true,
        notifySale: true,
        createdAt: new Date().toISOString()
      }
      const updated = [newItem, ...favorites]
      setFavorites(updated)
      saveLocal(updated)

      if (user) {
        await supabase.from('wishlist').insert({
          user_id: user.id,
          product_id: productId,
          notify_stock: true,
          notify_sale: true
        })
      }
      return true
    }
  }

  const removeFromFavorites = async (productId: string) => {
    const updated = favorites.filter(f => f.productId !== productId)
    setFavorites(updated)
    saveLocal(updated)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId)
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
    saveLocal(updated)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('wishlist')
        .update({
          ...(settings.notifyStock !== undefined && { notify_stock: settings.notifyStock }),
          ...(settings.notifySale !== undefined && { notify_sale: settings.notifySale })
        })
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
    throw new Error('useFavorites debe ser usado dentro de un FavoritesProvider')
  }
  return context
}
