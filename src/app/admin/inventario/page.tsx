'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { ArrowLeft, History, AlertTriangle } from 'lucide-react'

type Movement = {
  id: string
  product_id: string
  order_id: string | null
  quantity_delta: number
  stock_after: number
  reason: 'order_reserved' | 'order_cancelled' | 'manual_adjustment'
  created_at: string
  products: { name: string } | null
}

const descriptions: Record<Movement['reason'], string> = {
  order_reserved: 'Reserva por pedido',
  order_cancelled: 'Reintegro por cancelación',
  manual_adjustment: 'Ajuste manual'
}

export default function AdminInventarioPage() {
  const [rows, setRows] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!active) return
      if (!user) { setError('Iniciá sesión como administrador.'); setLoading(false); return }
      const { data: role } = await supabase.from('profiles').select('role').eq('id',user.id).single()
      if (!active) return
      if (role?.role !== 'admin') { setError('Acceso restringido a administradores.'); setLoading(false); return }
      const { data, error: dbError } = await supabase.from('inventory_movements')
        .select('id,product_id,order_id,quantity_delta,stock_after,reason,created_at,products(name)')
        .order('created_at',{ascending:false}).limit(200)
      if (!active) return
      if (dbError) setError('No se pudieron cargar los movimientos. Verificá si se aplicó la migración SQL P004.')
      else setRows((data || []) as unknown as Movement[])
      setLoading(false)
    }
    load()
    return () => {active=false}
  }, [])
  return <div className="max-w-6xl mx-auto p-5 space-y-6">
    <Link href="/admin" className="inline-flex gap-2 items-center text-sm text-gray-600"><ArrowLeft className="w-4 h-4"/> Volver al panel</Link>
    <div className="space-y-1"><h1 className="text-2xl font-bold flex items-center gap-2"><History className="w-6 h-6"/> Movimientos de stock</h1>
      <p className="text-sm text-gray-500">Últimos 200 movimientos registrados. Las reservas de pedidos pendientes reducen el stock disponible.</p></div>
    {loading && <p>Consultando inventario…</p>}
    {error && <div className="bg-amber-50 text-amber-900 p-4 rounded-lg flex items-start gap-2"><AlertTriangle className="w-5 h-5 shrink-0"/>{error}</div>}
    {!loading && !error && <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white"><table className="w-full text-sm text-left">
      <thead className="bg-gray-50"><tr>{['Fecha','Producto','Movimiento','Unidades','Stock posterior','Pedido'].map(t=><th key={t} className="p-3">{t}</th>)}</tr></thead>
      <tbody>{rows.map(row=><tr key={row.id} className="border-t border-gray-100">
        <td className="p-3 whitespace-nowrap">{new Date(row.created_at).toLocaleString('es-AR')}</td>
        <td className="p-3">{row.products?.name || row.product_id}</td>
        <td className="p-3">{descriptions[row.reason] || row.reason}</td>
        <td className={`p-3 font-semibold ${row.quantity_delta < 0?'text-red-700':'text-green-700'}`}>{row.quantity_delta>0?'+':''}{row.quantity_delta}</td>
        <td className="p-3">{row.stock_after}</td>
        <td className="p-3 font-mono text-xs">{row.order_id?.slice(0,8) || '—'}</td>
      </tr>)}</tbody>
    </table>{rows.length===0 && <div className="p-5 text-center text-gray-500">Todavía no hay movimientos registrados.</div>}</div>}
  </div>
}
