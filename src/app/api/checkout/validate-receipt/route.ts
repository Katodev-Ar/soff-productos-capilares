import { NextRequest, NextResponse } from 'next/server'
import { validateReceiptFile } from '@/lib/receiptValidator'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('receipt') as File
    const expectedTotal = formData.get('expectedTotal') as string

    if (!file) {
      return NextResponse.json(
        { isValid: false, message: 'No se envió ningún archivo para validar.' },
        { status: 400 }
      )
    }

    const totalNumber = Number(expectedTotal) || 0
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const result = await validateReceiptFile(
      buffer,
      file.type || '',
      file.name || 'comprobante',
      totalNumber
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error en validate-receipt API:', error)
    return NextResponse.json(
      {
        isValid: false,
        isReceipt: false,
        amountMatches: false,
        expectedAmount: 0,
        message: 'Ocurrió un error al procesar el archivo: ' + (error?.message || 'Error desconocido')
      },
      { status: 500 }
    )
  }
}
