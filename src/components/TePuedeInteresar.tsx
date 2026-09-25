'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useCart } from '@/context/CartContext'
import Link from 'next/link'
import { Plus, PackageSearch } from 'lucide-react'
import { formatPrice } from '@/lib/catalog'

export function TePuedeInteresar() {
  const [recommended, setRecommended] = useState<any[]>([])
  const { items, addToCart } = useCart()
  
  useEffect(() => {
    async function fetchRecommended() {
      // Fetch some random or popular products
      const { data } = await supabase
        .from('products')
        .select('*')
        .limit(10)
        
      if (data) {
        // Filter out items already in cart
        const cartIds = items.map(i => i.id)
        const available = data.filter(p => !cartIds.includes(p.id))
        setRecommended(available.slice(0, 4))
      }
    }
    fetchRecommended()
  }, [items])

  if (recommended.length === 0) return null

  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-widest">Te puede interesar</h3>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
        {recommended.map(product => (
          <div key={product.id} className="min-w-[140px] w-[140px] flex-none snap-start bg-white border border-gray-100 rounded-lg p-3 relative group">
            <div className="aspect-square bg-gray-50 rounded mb-2 overflow-hidden flex items-center justify-center p-2 relative">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" />
              ) : (
                <PackageSearch className="text-gray-300" size={24} />
              )}
              <button 
                onClick={(e) => {
                  e.preventDefault()
                  addToCart({
                    id: product.id,
                    name: product.name,
                    price: Number(product.price_minorista),
                    quantity: 1,
                    image_url: product.image_url,
                    stock: product.stock
                  })
                }}
                className="absolute bottom-2 right-2 bg-white text-black border border-gray-200 w-8 h-8 rounded-full flex items-center justify-center shadow-sm hover:bg-black hover:text-white transition-colors"
                title="Agregar al carrito"
              >
                <Plus size={16} />
              </button>
            </div>
            <Link href={`/producto/${product.id}`}>
              <h4 className="text-xs font-medium text-gray-800 line-clamp-2 mb-1 group-hover:text-brand-primary transition-colors">{product.name}</h4>
              <p className="text-sm font-bold text-black">{formatPrice(Number(product.price_minorista))}</p>
            </Link>
          </div>
        ))}
      </div>
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
