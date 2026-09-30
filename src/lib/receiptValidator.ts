import { getDocumentProxy, extractText } from 'unpdf'
import {
  ReceiptValidationResult,
  analyzeReceiptText,
  detectBankOrWallet,
  extractRecipientName,
  extractReferenceNumber,
  extractAmounts
} from './receiptParser'

export type { ReceiptValidationResult }
export {
  analyzeReceiptText,
  detectBankOrWallet,
  extractRecipientName,
  extractReferenceNumber,
  extractAmounts
}

/**
 * Validador para documentos PDF en el servidor
 */
export async function validateReceiptFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  expectedTotal: number
): Promise<ReceiptValidationResult> {
  const isPdf = mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')

  if (isPdf) {
    try {
      const uint8 = new Uint8Array(buffer)
      const pdf = await getDocumentProxy(uint8)
      const pageCount = pdf.numPages || 1

      if (pageCount > 2) {
        return {
          isValid: false,
          allowSubmit: false,
          status: 'invalido',
          isReceipt: false,
          amountMatches: false,
          expectedAmount: expectedTotal,
          confidence: 'alta',
          pageCount,
          message: `El archivo subido contiene ${pageCount} páginas. Un comprobante bancario legítimo solo tiene 1 página (o captura de pantalla). Por favor sube el comprobante correcto.`
        }
      }

      const { text } = await extractText(uint8, { mergePages: true })
      return analyzeReceiptText(text || '', expectedTotal, pageCount)
    } catch (e: any) {
      console.error('Error al analizar PDF:', e)
      return {
        isValid: true,
        allowSubmit: true,
        status: 'en_duda',
        isReceipt: true,
        amountMatches: false,
        expectedAmount: expectedTotal,
        confidence: 'baja',
        message: 'No pudimos leer el PDF de forma automática. Podés finalizar el pedido y lo revisaremos manualmente.',
        warningMessage: 'Comprobante en duda: No se pudo leer el PDF automáticamente'
      }
    }
  }

  // Para imágenes que lleguen directo al servidor sin texto previo:
  return {
    isValid: true,
    allowSubmit: true,
    status: 'en_duda',
    isReceipt: true,
    amountMatches: false,
    expectedAmount: expectedTotal,
    confidence: 'media',
    message: 'Captura de comprobante recibida. Se verificará manualmente antes del despacho.',
    warningMessage: 'Comprobante recibido: Requiere confirmación de acreditación'
  }
}
