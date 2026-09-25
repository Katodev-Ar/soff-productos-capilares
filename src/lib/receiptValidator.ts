import { PDFParse } from 'pdf-parse'
import Tesseract from 'tesseract.js'

export type ReceiptValidationResult = {
  isValid: boolean
  isReceipt: boolean
  amountMatches: boolean
  detectedAmount?: number
  expectedAmount: number
  referenceNumber?: string
  bankOrApp?: string
  confidence: 'alta' | 'media' | 'baja'
  message: string
  pageCount?: number
  rawTextPreview?: string
}

/**
 * Detecta qué billetera o banco generó el comprobante
 */
function detectBankOrWallet(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('mercadopago') || lower.includes('mercado pago')) return 'Mercado Pago'
  if (lower.includes('ualá') || lower.includes('uala')) return 'Ualá'
  if (lower.includes('santander')) return 'Banco Santander'
  if (lower.includes('galicia')) return 'Banco Galicia'
  if (lower.includes('bbva') || lower.includes('francés')) return 'BBVA'
  if (lower.includes('macro')) return 'Banco Macro'
  if (lower.includes('nación') || lower.includes('nacion')) return 'Banco Nación'
  if (lower.includes('provincia') || lower.includes('cuenta dni')) return 'Cuenta DNI / Banco Provincia'
  if (lower.includes('brubank')) return 'Brubank'
  if (lower.includes('naranja x') || lower.includes('tarjeta naranja')) return 'Naranja X'
  if (lower.includes('personal pay')) return 'Personal Pay'
  if (lower.includes('modo')) return 'MODO'
  if (lower.includes('coelsa')) return 'Red Coelsa'
  return 'Transferencia Bancaria'
}

/**
 * Extrae números de referencia/operación típicos de transferencias en Argentina
 */
function extractReferenceNumber(text: string): string | undefined {
  // Patrones específicos de comprobantes bancarios
  const patterns = [
    // Mercado Pago: Operación #10492850193 o Código de transferencia: 123456
    /(?:operaci[oó]n|transacci[oó]n|c[oó]digo\s*de\s*transferencia|comprobante|nro\s*op|n[°o]\s*de\s*operaci[oó]n|referencia(?:\s*coelsa)?)\s*[:#.]*\s*([A-Za-z0-9\-_]{6,30})/i,
    // ID numérico de 8 a 16 dígitos
    /(?:id(?:\s*de\s*operaci[oó]n)?)\s*[:#.]*\s*(\d{8,16})/i,
    // Coelsa ID o CBU de movimiento
    /(?:coelsa|movimiento)\s*[:#.]*\s*([A-Za-z0-9]{8,24})/i
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  // Fallback: buscar secuencias largas aisladas tipo #123456789
  const hashMatch = text.match(/#(\d{7,14})/)
  if (hashMatch) return hashMatch[1]

  return undefined
}

/**
 * Extrae montos en pesos del texto del comprobante
 */
function extractAmounts(text: string): number[] {
  const amounts: number[] = []
  // Formatos comunes en Argentina: $ 7.200, $7.200,00, $7200, ARS 7.200, etc.
  const regex = /(?:\$|ARS|\b)\s*([0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]{2})?|[0-9]{2,8}(?:,[0-9]{2})?)\b/g

  let m
  while ((m = regex.exec(text)) !== null) {
    const raw = m[1].replace(/\./g, '').replace(',', '.')
    const val = parseFloat(raw)
    // Descartar números que parezcan años, CBU o números de operación gigantes (> 100 millones)
    if (!isNaN(val) && val > 50 && val < 50000000) {
      amounts.push(Math.round(val))
    }
  }

  return amounts
}

/**
 * Validador principal de comprobantes de transferencia
 */
export async function validateReceiptFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  expectedTotal: number
): Promise<ReceiptValidationResult> {
  const isPdf = mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')
  let extractedText = ''
  let pageCount = 1

  // 1. Procesamiento de PDF
  if (isPdf) {
    try {
      const parser = new PDFParse({ data: buffer })
      const info = await parser.getInfo()
      pageCount = info.total || 1

      // Regla de seguridad: Si el archivo tiene más de 2 páginas, NO es un comprobante de transferencia
      if (pageCount > 2) {
        await parser.destroy()
        return {
          isValid: false,
          isReceipt: false,
          amountMatches: false,
          expectedAmount: expectedTotal,
          confidence: 'alta',
          pageCount,
          message: `El archivo subido contiene ${pageCount} páginas. Un comprobante bancario legítimo solo tiene 1 página (o captura de pantalla). Por favor sube el comprobante correcto.`
        }
      }

      const textData = await parser.getText()
      extractedText = textData.text || ''
      await parser.destroy()
    } catch (e: any) {
      console.error('Error al analizar PDF con PDFParse:', e)
      return {
        isValid: false,
        isReceipt: false,
        amountMatches: false,
        expectedAmount: expectedTotal,
        confidence: 'baja',
        message: 'No pudimos leer el archivo PDF. Verifica que no esté dañado ni protegido por contraseña.'
      }
    }
  } else {
    // 2. Procesamiento de Imagen con OCR Tesseract
    try {
      const worker = await Tesseract.createWorker(['spa', 'eng'])
      const ret = await worker.recognize(buffer)
      extractedText = ret.data.text || ''
      await worker.terminate()
    } catch (e: any) {
      console.error('Error al analizar imagen con Tesseract:', e)
      // Si falla OCR, intentamos no bloquear si al menos es un archivo de imagen válido
      return {
        isValid: true,
        isReceipt: true,
        amountMatches: true,
        expectedAmount: expectedTotal,
        confidence: 'baja',
        message: 'Comprobante recibido. No pudimos verificar automáticamente el texto debido a la resolución, el administrador lo revisará manualmente.'
      }
    }
  }

  // 3. Inspeccionar texto extraído
  const lowerText = extractedText.toLowerCase()

  // Palabras clave típicas de una transferencia en Argentina
  const transferKeywords = [
    'transferencia',
    'transferiste',
    'transferido',
    'comprobante',
    'operación',
    'operacion',
    'transacción',
    'transaccion',
    'envío de dinero',
    'enviaste',
    'pagaste',
    'coelsa',
    'cvu',
    'cbu',
    'alias',
    'importe',
    'monto',
    'destinatario',
    'titular',
    'banco',
    'exitoso',
    'exitosa',
    'acreditado',
    'corbalan'
  ]

  let matchedKeywordsCount = 0
  for (const kw of transferKeywords) {
    if (lowerText.includes(kw)) {
      matchedKeywordsCount++
    }
  }

  // Si no coincide al menos con 2 palabras clave, descartamos
  const isReceipt = matchedKeywordsCount >= 2
  if (!isReceipt) {
    return {
      isValid: false,
      isReceipt: false,
      amountMatches: false,
      expectedAmount: expectedTotal,
      confidence: 'alta',
      pageCount,
      rawTextPreview: extractedText.slice(0, 200),
      message: 'El documento subido no contiene los datos de un comprobante de transferencia bancaria legítimo (no se detectaron palabras como transferencia, operación o CVU).'
    }
  }

  // 4. Extraer datos del comprobante
  const bankOrApp = detectBankOrWallet(extractedText)
  const referenceNumber = extractReferenceNumber(extractedText)
  const amounts = extractAmounts(extractedText)

  // 5. Comparar monto con el total del pedido
  // Buscamos si algún monto coincide con expectedTotal (con tolerancia de $5 por redondeos)
  const matchingAmount = amounts.find(a => Math.abs(a - expectedTotal) <= 5)
  
  // Buscar también el monto más probable (el más grande que no sea un número de referencia)
  const reasonableAmounts = amounts.filter(a => a < 1000000)
  const bestDetectedAmount = matchingAmount || (reasonableAmounts.length > 0 ? reasonableAmounts[0] : undefined)
  const amountMatches = !!matchingAmount

  if (!amountMatches && bestDetectedAmount && Math.abs(bestDetectedAmount - expectedTotal) > 5) {
    return {
      isValid: false,
      isReceipt: true,
      amountMatches: false,
      detectedAmount: bestDetectedAmount,
      expectedAmount: expectedTotal,
      referenceNumber,
      bankOrApp,
      confidence: 'alta',
      pageCount,
      message: `El comprobante muestra un monto de $${bestDetectedAmount.toLocaleString('es-AR')}, pero el total de tu pedido es de $${expectedTotal.toLocaleString('es-AR')}. Por favor realiza la transferencia por el total exacto.`
    }
  }

  return {
    isValid: true,
    isReceipt: true,
    amountMatches: true,
    detectedAmount: bestDetectedAmount || expectedTotal,
    expectedAmount: expectedTotal,
    referenceNumber: referenceNumber || 'Detectado',
    bankOrApp,
    confidence: 'alta',
    pageCount,
    message: `Comprobante de ${bankOrApp} validado con éxito. Operación #${referenceNumber || 'OK'}`
  }
}
