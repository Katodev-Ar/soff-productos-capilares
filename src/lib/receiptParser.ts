export type ReceiptValidationResult = {
  isValid: boolean
  allowSubmit: boolean
  status: 'valido' | 'en_duda' | 'invalido'
  isReceipt: boolean
  amountMatches: boolean
  detectedAmount?: number
  expectedAmount: number
  referenceNumber?: string
  recipientName?: string
  bankOrApp?: string
  confidence: 'alta' | 'media' | 'baja'
  message: string
  warningMessage?: string
  pageCount?: number
  rawTextPreview?: string
}

/**
 * Detecta qué billetera o banco generó el comprobante
 */
export function detectBankOrWallet(text: string): string {
  const lower = text.toLowerCase()
  const found: string[] = []

  if (lower.includes('bna') || lower.includes('banco nacion') || lower.includes('banco nación') || lower.includes('nación') || lower.includes('nacion')) {
    found.push('BNA+ (Banco Nación)')
  }
  if (lower.includes('macro')) found.push('Banco Macro')
  if (lower.includes('mercadopago') || lower.includes('mercado pago')) found.push('Mercado Pago')
  if (lower.includes('santander') || lower.includes('santander río') || lower.includes('santander rio')) found.push('Banco Santander')
  if (lower.includes('galicia')) found.push('Banco Galicia')
  if (lower.includes('bbva') || lower.includes('francés') || lower.includes('frances')) found.push('BBVA')
  if (lower.includes('cuenta dni') || lower.includes('bapro') || lower.includes('banco provincia') || lower.includes('provincia')) found.push('Cuenta DNI')
  if (lower.includes('ualá') || lower.includes('uala')) found.push('Ualá')
  if (lower.includes('naranja x') || lower.includes('tarjeta naranja') || lower.includes('naranja')) found.push('Naranja X')
  if (lower.includes('personal pay')) found.push('Personal Pay')
  if (lower.includes('brubank')) found.push('Brubank')
  if (lower.includes('icbc')) found.push('ICBC')
  if (lower.includes('hsbc')) found.push('HSBC')
  if (lower.includes('supervielle')) found.push('Banco Supervielle')
  if (lower.includes('patagonia')) found.push('Banco Patagonia')
  if (lower.includes('ciudad') || lower.includes('banco ciudad')) found.push('Banco Ciudad')
  if (lower.includes('hipotecario')) found.push('Banco Hipotecario')
  if (lower.includes('comafi')) found.push('Banco Comafi')
  if (lower.includes('modo')) found.push('MODO')
  if (lower.includes('coelsa')) found.push('Red Coelsa')

  if (found.length > 0) {
    return Array.from(new Set(found)).join(' / ')
  }
  return 'Transferencia Bancaria'
}

/**
 * Extrae el nombre del destinatario / titular de la cuenta
 */
export function extractRecipientName(text: string): string | undefined {
  const patterns = [
    /(?:destinatario|titular|beneficiario|a\s+nombre\s+de|cuenta\s+destino)\s*[:\-]?\s*([A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s]{3,60})/i,
    /(?:le\s+transferiste\s+a|transferiste\s+a|enviaste\s+a|pagaste\s+a)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s]{3,60})/i,
    /(?:para)\s*[:\-]?\s*([A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s]{3,60})/i
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const lines = match[1].split(/\n|\r/).map(l => l.trim()).filter(Boolean)
      const firstLine = lines[0] || ''
      const clean = firstLine.split(/\b(?:cuit|cuil|por|de|\$|cvu|cbu|alias|monto|banco|motivo|fecha)\b/i)[0].trim()
      if (clean.length > 2 && !clean.toLowerCase().includes('comprobante') && !clean.toLowerCase().includes('operación')) {
        return clean
      }
    }
  }

  // Si figura Corbalan o Sofia (titulares del negocio)
  if (/corbalan/i.test(text)) return 'Cristian Benjamin Corbalan'
  if (/sofia/i.test(text)) return 'Sofia Productos Capilares'

  return undefined
}

/**
 * Extrae números de referencia/operación típicos de transferencias en Argentina
 */
export function extractReferenceNumber(text: string): string | undefined {
  const patterns = [
    /(?:n[uú]mero\s*de\s*(?:transacci[oó]n|operaci[oó]n)|nro\s*de\s*(?:transacci[oó]n|operaci[oó]n)|operaci[oó]n|transacci[oó]n|c[oó]digo\s*de\s*transferencia|comprobante|nro\s*op|n[°o]\s*de\s*operaci[oó]n|referencia(?:\s*coelsa)?)\s*[:#.]*\s*([A-Za-z0-9\-_]{5,30})/i,
    /(?:id(?:\s*de\s*operaci[oó]n)?)\s*[:#.]*\s*(\d{8,16})/i,
    /(?:coelsa|movimiento)\s*[:#.]*\s*([A-Za-z0-9]{8,24})/i,
    /#(\d{6,16})/
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const clean = match[1].trim()
      if (clean.length >= 4) return clean
    }
  }

  return undefined
}

/**
 * Extrae montos en pesos del comprobante
 */
export function extractAmounts(text: string): number[] {
  const amounts: number[] = []

  // 1. Patrón con signo peso o ARS: $ 7.200, $7200,00, $ 80.500,00
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

  // 3. Fallback genérico para números con separador de miles tipo 7.200 o 80.500
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
 * Analizador universal de texto de comprobante (usado en servidor y cliente)
 */
export function analyzeReceiptText(extractedText: string, expectedTotal: number, pageCount = 1): ReceiptValidationResult {
  const lowerText = extractedText.toLowerCase()

  // Palabras clave no bancarias explícitas (seguros vehiculares, pólizas sin datos de transferencia)
  const nonReceiptTerms = [
    'póliza',
    'poliza',
    'chasis',
    'patente',
    'endoso',
    'tarjeta de circulación',
    'tarjeta de circulacion',
    'seguro obligatorio',
    'asegurado',
    'motomel',
    'automotor'
  ]
  const isNonReceiptDoc = nonReceiptTerms.some(term => lowerText.includes(term))

  // Palabras clave bancarias
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
    'saldo',
    'bna',
    'macro',
    'santander',
    'galicia',
    'bbva',
    'mercadopago',
    'mercado pago',
    'uala',
    'ualá',
    'cuenta dni',
    'naranja'
  ]

  let matchedKeywordsCount = 0
  for (const kw of transferKeywords) {
    if (lowerText.includes(kw)) {
      matchedKeywordsCount++
    }
  }

  // Si es un documento explícitamente no bancario o sin ninguna coincidencia:
  if (isNonReceiptDoc || (extractedText.length > 50 && matchedKeywordsCount === 0)) {
    return {
      isValid: false,
      allowSubmit: false,
      status: 'invalido',
      isReceipt: false,
      amountMatches: false,
      expectedAmount: expectedTotal,
      confidence: 'alta',
      pageCount,
      rawTextPreview: extractedText.slice(0, 150),
      message: isNonReceiptDoc
        ? 'El archivo subido parece ser una póliza o tarjeta vehicular de seguro, no un comprobante bancario. Por favor sube la captura de la transferencia.'
        : 'El documento subido no contiene los datos de un comprobante de transferencia bancaria legítimo (no se detectaron términos como transferencia, destinatario o número de operación).'
    }
  }

  // Extraer datos clave
  const bankOrApp = detectBankOrWallet(extractedText)
  const referenceNumber = extractReferenceNumber(extractedText)
  const recipientName = extractRecipientName(extractedText)
  const amounts = extractAmounts(extractedText)

  // Comparar monto
  const matchingAmount = amounts.find(a => Math.abs(a - expectedTotal) <= 5)
  const reasonableAmounts = amounts.filter(a => a < 10000000)
  const detectedAmount = matchingAmount || (reasonableAmounts.length > 0 ? reasonableAmounts[0] : undefined)
  const amountMatches = !!matchingAmount

  // Si el monto no coincide, permitir enviar con advertencia de revisión manual
  if (!amountMatches && detectedAmount) {
    const warningMsg = `Comprobante en duda: Monto que dice: $${detectedAmount.toLocaleString('es-AR')} cuando debería ser: $${expectedTotal.toLocaleString('es-AR')}${referenceNumber ? ` | Op: #${referenceNumber}` : ''}${bankOrApp ? ` | ${bankOrApp}` : ''}${recipientName ? ` | ${recipientName}` : ''}`
    
    return {
      isValid: true,
      allowSubmit: true,
      status: 'en_duda',
      isReceipt: true,
      amountMatches: false,
      detectedAmount,
      expectedAmount: expectedTotal,
      referenceNumber: referenceNumber || 'Detectado',
      recipientName: recipientName || 'No especificado',
      bankOrApp,
      confidence: 'alta',
      pageCount,
      message: `El comprobante muestra un monto de $${detectedAmount.toLocaleString('es-AR')}, pero el total de tu pedido es de $${expectedTotal.toLocaleString('es-AR')}. Podés finalizar el pedido de todas formas; quedará marcado para revisión manual de Sofia.`,
      warningMessage: warningMsg
    }
  }

  // Si no se detectó monto pero tiene datos bancarios válidos
  if (!detectedAmount) {
    const warningMsg = `Comprobante en duda: No se pudo leer el monto automáticamente${referenceNumber ? ` | Op: #${referenceNumber}` : ''}${bankOrApp ? ` | ${bankOrApp}` : ''}`

    return {
      isValid: true,
      allowSubmit: true,
      status: 'en_duda',
      isReceipt: true,
      amountMatches: false,
      expectedAmount: expectedTotal,
      referenceNumber: referenceNumber || 'Detectado',
      recipientName: recipientName || 'No especificado',
      bankOrApp,
      confidence: 'media',
      pageCount,
      message: 'Comprobante recibido. No pudimos leer el monto exacto con total claridad, pero podés finalizar el pedido. Se revisará manualmente antes de despachar.',
      warningMessage: warningMsg
    }
  }

  // Si todo coincide perfectamente
  return {
    isValid: true,
    allowSubmit: true,
    status: 'valido',
    isReceipt: true,
    amountMatches: true,
    detectedAmount: detectedAmount || expectedTotal,
    expectedAmount: expectedTotal,
    referenceNumber: referenceNumber || 'OK',
    recipientName: recipientName || 'Sofia / Cristian Corbalan',
    bankOrApp,
    confidence: 'alta',
    pageCount,
    message: `✓ Comprobante de ${bankOrApp} validado con éxito. Operación #${referenceNumber || 'OK'}`
  }
}
