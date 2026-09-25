import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateReceiptFile } from '@/lib/receiptValidator'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('receipt') as File
    const userId = formData.get('userId') as string
    const total = formData.get('total') as string
    const shippingAddress = formData.get('shippingAddress') as string
    let transferReference = (formData.get('transferReference') as string) || ''

    if (!file || !userId) {
      return NextResponse.json({ error: 'Faltan datos obligatorios para procesar el pedido.' }, { status: 400 })
    }

    const totalNumber = Number(total) || 0
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Validar comprobante con detector inteligente
    const validation = await validateReceiptFile(
      buffer,
      file.type || '',
      file.name || 'comprobante',
      totalNumber
    )

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.message || 'El comprobante subido no es válido.' },
        { status: 400 }
      )
    }

    if (!transferReference && validation.referenceNumber) {
      transferReference = validation.referenceNumber
    }

    // 1. Upload receipt to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase
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

    const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(fileName)
    const receiptUrl = publicUrlData.publicUrl

    const itemsStr = formData.get('items') as string
    let parsedItems = []
    try {
      parsedItems = itemsStr ? JSON.parse(itemsStr) : []
    } catch(e) {}

    // 2. Create order in database with transfer reference
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        total: totalNumber,
        status: 'pendiente',
        mp_payment_id: receiptUrl,
        transfer_reference: transferReference || 'Sin Nro Detectado',
        shipping_address: shippingAddress
      })
      .select()
      .single()

    if (orderError) {
      console.error('Order error:', orderError)
      return NextResponse.json({ error: 'Error al crear pedido: ' + orderError.message }, { status: 500 })
    }

    if (parsedItems.length > 0) {
      const orderItemsToInsert = parsedItems.map((item: any) => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }))
      await supabase.from('order_items').insert(orderItemsToInsert)
    }

    return NextResponse.json({
      success: true,
      orderId: order?.id,
      receiptUrl,
      transferReference: transferReference || null
    })
  } catch (error: any) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 })
  }
}
