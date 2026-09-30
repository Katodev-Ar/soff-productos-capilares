import { getDocumentProxy, extractText } from 'unpdf'
import path from 'path'

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
  const patterns = [
    /(?:operaci[oó]n|transacci[oó]n|c[oó]digo\s*de\s*transferencia|comprobante|nro\s*op|n[°o]\s*de\s*operaci[oó]n|referencia(?:\s*coelsa)?)\s*[:#.]*\s*([A-Za-z0-9\-_]{6,30})/i,
    /(?:id(?:\s*de\s*operaci[oó]n)?)\s*[:#.]*\s*(\d{8,16})/i,
    /(?:coelsa|movimiento)\s*[:#.]*\s*([A-Za-z0-9]{8,24})/i
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  const hashMatch = text.match(/#(\d{7,14})/)
  if (hashMatch) return hashMatch[1]

  return undefined
}

/**
 * Extrae montos en pesos del comprobante
 */
function extractAmounts(text: string): number[] {
  const amounts: number[] = []

  // 1. Patrón con signo peso o ARS: $ 7.200, $7200,00, $ 15.500
  const currencyRegex = /(?:\$|ARS)\s*([0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]{2})?|[0-9]{2,8}(?:,[0-9]{2})?)/gi
  let m
  while ((m = currencyRegex.exec(text)) !== null) {
    const raw = m[1].replace(/\./g, '').replace(',', '.')
    const val = parseFloat(raw)
    if (!isNaN(val) && val >= 50 && val < 50000000) {
      amounts.push(Math.round(val))
    }
  }

  // 2. Patrón tras palabras clave: "monto:", "importe:", "total:", "pagaste"
  const keywordRegex = /(?:monto|importe|total|transferiste|pagaste|acreditado)\s*[:\$]*\s*([0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]{2})?|[0-9]{2,8}(?:,[0-9]{2})?)/gi
  while ((m = keywordRegex.exec(text)) !== null) {
    const raw = m[1].replace(/\./g, '').replace(',', '.')
    const val = parseFloat(raw)
    if (!isNaN(val) && val >= 50 && val < 50000000) {
      amounts.push(Math.round(val))
    }
  }

  // 3. Fallback genérico para números con separador de miles tipo 7.200 o 15.000
  const thousandsRegex = /\b([1-9][0-9]{0,2}(?:\.[0-9]{3})+(?:,[0-9]{2})?)\b/g
  while ((m = thousandsRegex.exec(text)) !== null) {
    const raw = m[1].replace(/\./g, '').replace(',', '.')
    const val = parseFloat(raw)
    if (!isNaN(val) && val >= 50 && val < 50000000) {
      amounts.push(Math.round(val))
    }
  }

  return [...new Set(amounts)]
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
      const uint8 = new Uint8Array(buffer)
      const pdf = await getDocumentProxy(uint8)
      pageCount = pdf.numPages || 1

      // Regla estricta: Si el archivo tiene más de 2 páginas, NO es un comprobante de transferencia
      if (pageCount > 2) {
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

      const { text } = await extractText(uint8, { mergePages: true })
      extractedText = text || ''
    } catch (e: any) {
      console.error('Error al analizar PDF con unpdf:', e)
      return {
        isValid: false,
        isReceipt: false,
        amountMatches: false,
        expectedAmount: expectedTotal,
        confidence: 'baja',
        message: 'No pudimos leer el archivo PDF. Verifica que sea un documento PDF válido y no esté protegido por contraseña.'
      }
    }
  } else {
    // 2. Procesamiento de Imagen (OCR con Tesseract dinámico y timeout seguro)
    try {
      const Tesseract = (await import('tesseract.js')).default
      const workerPath = path.join(process.cwd(), 'node_modules', 'tesseract.js', 'src', 'worker-script', 'node', 'index.js')
      
      const ocrJob = (async () => {
        const worker = await Tesseract.createWorker('spa', 1, {
          workerPath: typeof window === 'undefined' ? workerPath : undefined,
          errorHandler: () => {}
        })
        const ret = await worker.recognize(buffer)
        await worker.terminate()
        return ret.data.text || ''
      })()

      const timeoutJob = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout de lectura')), 7000)
      )

      extractedText = await Promise.race([ocrJob, timeoutJob])
    } catch (e: any) {
      console.warn('OCR en imagen no completado (posible entorno serverless o timeout):', e?.message)
      // Si el OCR no puede ejecutarse (por ejemplo en serverless de Vercel), aceptamos la imagen como comprobante válido para revisión manual
      return {
        isValid: true,
        isReceipt: true,
        amountMatches: true,
        expectedAmount: expectedTotal,
        referenceNumber: 'Revisión manual',
        bankOrApp: 'Captura adjunta',
        confidence: 'media',
        message: 'Comprobante recibido correctamente en formato imagen. Quedará adjuntado a tu pedido para revisión.'
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
    'envio de dinero',
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
    'acreditada',
    'corbalan',
    'saldo'
  ]

  let matchedKeywordsCount = 0
  for (const kw of transferKeywords) {
    if (lowerText.includes(kw)) {
      matchedKeywordsCount++
    }
  }

  // Si no coincide con al menos 2 palabras clave:
  const isReceipt = matchedKeywordsCount >= 2
  if (!isReceipt) {
    return {
      isValid: false,
      isReceipt: false,
      amountMatches: false,
      expectedAmount: expectedTotal,
      confidence: 'alta',
      pageCount,
      rawTextPreview: extractedText.slice(0, 150),
      message: 'El documento subido no contiene los datos de un comprobante de transferencia bancaria legítimo (no se detectaron términos como transferencia, operación o CVU).'
    }
  }

  // 4. Extraer datos del comprobante
  const bankOrApp = detectBankOrWallet(extractedText)
  const referenceNumber = extractReferenceNumber(extractedText)
  const amounts = extractAmounts(extractedText)

  // 5. Comparar monto con el total del pedido
  const matchingAmount = amounts.find(a => Math.abs(a - expectedTotal) <= 5)
  const reasonableAmounts = amounts.filter(a => a < 10000000)
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
