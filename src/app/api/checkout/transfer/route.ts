import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateReceiptFile } from '@/lib/receiptValidator'
import { BANK_CONFIG_READY } from '@/lib/paymentConfig'
import { randomUUID } from 'crypto'
import { calculateQuote, parseCoordinates, CheckoutValidationError } from '@/lib/serverCheckout'

export async function POST(request: NextRequest) {
  try {
    // P001: Fail closed. Las credenciales del receptor deben estar definidas
    // en Vercel/.env.local. Esto NO reemplaza las validaciones del pedido
    // ni la acreditación bancaria (abordadas en P003-P005).
    if (!BANK_CONFIG_READY) {
      return NextResponse.json(
        { error: 'Transferencias temporalmente no disponibles: cuenta receptora sin configurar.' },
        { status: 503 }
      )
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({error:'Checkout temporalmente no disponible: configuración incompleta.'},{status:503})
    }
    const supabase = createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
    // P002: autenticar en servidor; no confiar en el userId enviado por el navegador.
    const bearer = request.headers.get('authorization') || ''
    const matchToken = bearer.match(/^Bearer\s+(\S+)$/i)
    if (!matchToken || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Necesitás iniciar sesión.' }, { status: 401 })
    }
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
    const { data: { user }, error: authError } = await authClient.auth.getUser(matchToken[1])
    if (authError || !user) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('receipt')
    const requestKey = formData.get('requestKey')
    if (typeof requestKey !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(requestKey)) {
      return NextResponse.json({ error: 'Identificador del pedido inválido. Actualizá la página.' }, { status: 400 })
    }
    const userId = user.id
    // Ante reintento tras un COMMIT exitoso, responder antes de revisar stock.
    // Si todavía no existe la columna SQL, se continúa y la RPC bloqueará
    // expresamente la venta hasta aplicar la migración P004.
    const { data: priorOrder } = await supabase.from('orders')
      .select('id,user_id').eq('soff_request_key', requestKey).maybeSingle()
    if (priorOrder) {
      if (priorOrder.user_id !== userId) return NextResponse.json({ error: 'Pedido no disponible.' }, { status: 403 })
      return NextResponse.json({ success: true, orderId: priorOrder.id, replayed: true })
    }
    const displayedTotal = Number(formData.get('total'))
    const shippingAddress = formData.get('shippingAddress') as string
    let transferReference = (formData.get('transferReference') as string) || ''
    const couponCode = formData.get('couponCode')
    const deliveryMethod = formData.get('deliveryMethod')
    const mapLat = formData.get('mapLat')
    const mapLng = formData.get('mapLng')
    let items: unknown
    try { items = JSON.parse(String(formData.get('items') || '[]')) }
    catch { return NextResponse.json({ error: 'Carrito inválido.' }, { status: 400 }) }
    let quote
    try {
      const coords = mapLat === null && mapLng === null ? null
        : mapLat === null || mapLng === null
          ? parseCoordinates(NaN, NaN)
          : parseCoordinates(Number(mapLat), Number(mapLng))
      quote = await calculateQuote(supabase, userId, {
        items, deliveryMethod, coordinates: coords, couponCode: couponCode || null
      })
    } catch (cause) {
      const status = cause instanceof CheckoutValidationError ? cause.status : 500
      const message = cause instanceof CheckoutValidationError ? cause.message : 'Error al calcular el pedido.'
      return NextResponse.json({ error: message }, { status })
    }
    // El importe mostrado sirve para advertir diferencias, nunca para fijar el precio.
    if (!Number.isFinite(displayedTotal) || Math.abs(displayedTotal - Math.round(quote.total)) > 0.01) {
      return NextResponse.json({ error: 'El importe cambió. Actualizá el carrito antes de confirmar.', totalActual: quote.total }, { status: 409 })
    }
    if (typeof shippingAddress !== 'string' || shippingAddress.length > 500 || !shippingAddress.trim()) {
      return NextResponse.json({ error: 'Domicilio de entrega inválido.' }, { status: 400 })
    }
    transferReference = transferReference.slice(0, 100)

    if (!(file instanceof File) || !shippingAddress || !file.size || file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Comprobante faltante, vacío o mayor de 5 MB.' }, { status: 400 })
    }
    const formats: Record<string, string> = {
      'image/jpeg': 'jpg', 'image/png': 'png',
      'image/webp': 'webp', 'application/pdf': 'pdf'
    }
    const extension = formats[file.type]
    if (!extension) return NextResponse.json({ error: 'Solo se aceptan JPG, PNG, WEBP o PDF.' }, { status: 400 })

    const totalNumber = Math.round(quote.total)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const validSignature =
      (file.type === 'application/pdf' && buffer.subarray(0, 5).toString('ascii') === '%PDF-') ||
      (file.type === 'image/jpeg' && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
      (file.type === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) ||
      (file.type === 'image/webp' && buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP')
    if (!validSignature) return NextResponse.json({ error: 'El contenido no coincide con el tipo de archivo declarado.' }, { status: 400 })

    // Validar comprobante con detector inteligente
    const validation = await validateReceiptFile(
      buffer,
      file.type || '',
      file.name || 'comprobante',
      totalNumber
    )

    // Solo rechazar si explícitamente NO es un comprobante (ej: póliza vehicular sin datos bancarios o PDF multipágina)
    if (validation.allowSubmit === false) {
      return NextResponse.json(
        { error: validation.message || 'El comprobante subido no es válido.' },
        { status: 400 }
      )
    }

    if (!transferReference && validation.referenceNumber && validation.referenceNumber !== 'Detectado' && validation.referenceNumber !== 'OK') {
      transferReference = validation.referenceNumber
    }

    // 1. Upload receipt to Supabase Storage
    // Guardar en carpeta del dueño con nombre no predecible. El bucket es PRIVADO.
    const fileName = `${userId}/${randomUUID()}.${extension}`

    const { error: uploadError } = await supabase
      .storage
      .from('receipts')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Error al subir archivo: ' + uploadError.message }, { status: 500 })
    }

    const receiptReference = `receipts/${fileName}`

    // El texto recibido del navegador no puede certificar el comprobante.
    const finalWarning = validation.warningMessage ||
      (validation.status === 'en_duda' ? 'Comprobante en duda: Revisión manual antes de despachar' : null)

    // P004: una sola transacción SQL bloquea productos en orden estable,
    // revalida rol y precios, reserva existencias, crea pedido e ítems,
    // consume cupón y registra movimientos. Sin migración NO hacemos fallback.
    const { data: result, error: atomicError } = await supabase.rpc('soff_create_transfer_order_atomic', {
      p_request_key: requestKey,
      p_user_id: userId,
      p_items: quote.items.map(({ id, quantity, price }) => ({ id, quantity, price })),
      p_total: quote.total,
      p_shipping_address: shippingAddress,
      p_receipt_reference: receiptReference,
      p_transfer_reference: transferReference || 'Sin Nro Detectado',
      p_receipt_warning: finalWarning,
      p_coupon_id: quote.coupon?.id ?? null,
      p_coupon_expected_uses: quote.coupon?.currentUses ?? null
    })
    if (atomicError || !result || typeof result !== 'object' || typeof result.order_id !== 'string') {
      console.error('P004: error al reservar stock y crear el pedido:', atomicError)
      // Si la comunicación falla después del COMMIT, el intento es idempotente:
      // el navegador reutiliza requestKey. Se evita presentar un falso éxito.
      // Una pérdida de respuesta después del COMMIT puede parecer error de red:
      // consultar la clave estable antes de borrar el comprobante.
      const { data: committedOrder } = await supabase.from('orders')
        .select('id,user_id,mp_payment_id').eq('soff_request_key', requestKey).maybeSingle()
      if (committedOrder && committedOrder.user_id === userId) {
        if (committedOrder.mp_payment_id !== receiptReference) {
          await supabase.storage.from('receipts').remove([fileName])
        }
        return NextResponse.json({ success: true, orderId: committedOrder.id, replayed: true })
      }
      await supabase.storage.from('receipts').remove([fileName])
      const missingMigration = atomicError?.code === 'PGRST202' || atomicError?.code === '42883'
      return NextResponse.json({
        error: missingMigration
          ? 'Ventas temporalmente deshabilitadas: falta aplicar la migración P004 de inventario.'
          : 'No se pudo reservar el stock. Reintentá con el mismo carrito; no se confirmó otra compra.'
      }, { status: missingMigration ? 503 : 409 })
    }
    if (result.replayed === true) {
      // El pedido se confirmó en un intento anterior; el nuevo comprobante sobra.
      await supabase.storage.from('receipts').remove([fileName])
    }

    return NextResponse.json({
      success: true,
      orderId: result.order_id,
      transferReference: transferReference || null,
      receiptWarning: finalWarning
    })
  } catch (error) {
    console.error('Checkout transfer error:', error)
    return NextResponse.json({ error: 'No pudimos procesar el pedido. Intentá nuevamente.' }, { status: 500 })
  }
}
