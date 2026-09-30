import { NextRequest, NextResponse } from 'next/server'
import { validateReceiptFile, analyzeReceiptText } from '@/lib/receiptValidator'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('receipt') as File | null
    const expectedTotal = formData.get('expectedTotal') as string
    const clientExtractedText = formData.get('extractedText') as string | null

    const totalNumber = Number(expectedTotal) || 0

    // Si el cliente ya extrajo el texto con OCR en el navegador:
    if (clientExtractedText && clientExtractedText.trim().length > 0) {
      const result = analyzeReceiptText(clientExtractedText, totalNumber, 1)
      return NextResponse.json(result)
    }

    if (!file) {
      return NextResponse.json(
        { isValid: false, allowSubmit: false, status: 'invalido', message: 'No se envió ningún archivo para validar.' },
        { status: 400 }
      )
    }

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
        isValid: true,
        allowSubmit: true,
        status: 'en_duda',
        isReceipt: true,
        amountMatches: false,
        expectedAmount: 0,
        message: 'No pudimos validar automáticamente todos los datos, pero puedes enviar el pedido para revisión manual.',
        warningMessage: 'Comprobante en duda: Atención de revisar manualmente por Sofia'
      },
      { status: 200 }
    )
  }
}
