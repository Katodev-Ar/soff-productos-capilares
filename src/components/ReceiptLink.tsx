'use client'

import { useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'

type Props = { orderId: string; className?: string; children: ReactNode }

/** Comprobantes privados: consulta temporal autorizada; nunca persiste una URL pública. */
export default function ReceiptLink({ orderId, className, children }: Props) {
  const [busy, setBusy] = useState(false)

  async function openReceipt() {
    if (busy) return
    setBusy(true)
    // Abrir la ventana directamente por el click evita bloqueadores de pop-ups.
    const windowRef = window.open('about:blank', '_blank')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Iniciá sesión para abrir el comprobante.')
      const response = await fetch(`/api/receipts/${encodeURIComponent(orderId)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      })
      const payload = await response.json()
      if (!response.ok || !payload?.url) throw new Error(payload?.error || 'No se pudo abrir el comprobante.')
      if (windowRef) {
        windowRef.location.replace(payload.url)
      } else {
        window.location.assign(payload.url)
      }
    } catch (error) {
      windowRef?.close()
      window.alert(error instanceof Error ? error.message : 'No se pudo abrir el comprobante.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" onClick={openReceipt} disabled={busy} className={className}>
      {busy ? 'Abriendo…' : children}
    </button>
  )
}
