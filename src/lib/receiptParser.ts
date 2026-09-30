import { BUSINESS_BANK_CONFIG, type BusinessBankConfig } from './paymentConfig'

export type ReceiptValidationResult = {
  isValid: boolean
  allowSubmit: boolean
  status: 'valido' | 'en_duda' | 'invalido'
  isReceipt: boolean
  amountMatches: boolean
  recipientMatches?: boolean
  cvuMatches?: boolean
  detectedAmount?: number
  expectedAmount: number
  expectedTitular?: string
  expectedCvu?: string
  referenceNumber?: string
  recipientName?: string
  bankOrApp?: string
  confidence: 'alta' | 'media' | 'baja'
  message: string
  warningMessage?: string
  pageCount?: number
  rawTextPreview?: string
}

function normalize(s: string): string {
  return s
    ? s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
    : ''
}

/**
 * Compara si el destinatario detectado coincide con el titular del negocio de forma dinámica
 */
export function checkRecipientMatch(detectedName?: string, expectedTitular?: string): boolean {
  if (!detectedName || !expectedTitular) return false
  const normDetected = normalize(detectedName)
  const words = normalize(expectedTitular)
    .split(/\s+/)
    .filter(w => w.length > 2)

  if (words.length === 0) return false
  return words.some(w => normDetected.includes(w))
}

/**
 * Compara si el CBU, CVU o Alias del negocio aparecen en el comprobante
 */
export function checkCvuMatch(text: string, expectedCvu?: string, expectedAlias?: string): boolean {
  const normText = normalize(text)
  if (expectedAlias && normText.includes(normalize(expectedAlias))) {
    return true
  }
  if (expectedCvu) {
    const cleanCvu = expectedCvu.replace(/\D/g, '')
    const cleanText = text.replace(/\D/g, '')
    if (cleanCvu.length > 6 && cleanText.includes(cleanCvu)) {
      return true
    }
  }
  return false
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
 * Extrae el nombre del destinatario / titular de la cuenta en el comprobante
 */
export function extractRecipientName(text: string): string | undefined {
  const patterns = [
    /(?:destinatario|titular|beneficiario|a\s+nombre\s+de|cuenta\s+destino)\s*[:\-]?\s*([A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s]{3,60})/i,
    /(?:para)\s*[:\-]?\s*([A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s]{3,60})/i,
    /(?:le\s+transferiste\s+a|transferiste\s+a|enviaste\s+a|pagaste\s+a)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s]{3,60})/i
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const lines = match[1].split(/\n|\r/).map(l => l.trim()).filter(Boolean)
      const firstLine = lines[0] || ''
      const clean = firstLine.split(/\b(?:cuit|cuil|cuenta|por|de|\$|cvu|cbu|alias|monto|banco|motivo|concepto|fecha)\b/i)[0].trim()
      if (clean.length > 2 && !clean.toLowerCase().includes('comprobante') && !clean.toLowerCase().includes('operación')) {
        return clean
      }
    }
  }

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
 * Extrae montos en pesos del comprobante, filtrando números de cuentas bancarias (ej: CA ARS 2446)
 */
export function extractAmounts(text: string): number[] {
  const priorityAmounts: number[] = []
  const otherAmounts: number[] = []

  // Limpiar patrones de cuentas y números no relacionados que suelen confundir al OCR
  // Ej: "CA ARS 2446" (Caja de Ahorro), "CC ARS 1234", CUITs, CBUs y marcas horarias
  const sanitizedText = text
    .replace(/(?:ca|cc|caja\s*de\s*ahorro|cuenta\s*corriente)\s*ars\s*[0-9]+/gi, '')
    .replace(/(?:cbu|cvu|cuit|cuil)\s*[:\s]*[0-9]+/gi, '')
    .replace(/[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?/g, '')

  // 1. PRIORIDAD MÁXIMA: número explícitamente precedido por palabras clave de monto
  const keywordRegex = /(?:monto|importe|total|transferiste|pagaste|enviaste|acreditado)\s*[:\$\s]*\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?|[0-9]{2,8}(?:,[0-9]{2})?)/gi
  let km
  while ((km = keywordRegex.exec(sanitizedText)) !== null) {
    const raw = km[1].replace(/\./g, '').replace(',', '.')
    const val = parseFloat(raw)
    if (!isNaN(val) && val >= 50 && val < 50000000) {
      priorityAmounts.push(Math.round(val))
    }
  }

  // 2. PRIORIDAD SECUNDARIA: número con signo $ o ARS
  const currencyRegex = /(?:\$|ARS)\s*([0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]{2})?|[0-9]{2,8}(?:,[0-9]{2})?)/gi
  let cm
  while ((cm = currencyRegex.exec(sanitizedText)) !== null) {
    const raw = cm[1].replace(/\./g, '').replace(',', '.')
    const val = parseFloat(raw)
    if (!isNaN(val) && val >= 50 && val < 50000000) {
      otherAmounts.push(Math.round(val))
    }
  }

  // 3. Fallback genérico para números con separador de miles tipo 19.500
  const thousandsRegex = /\b([1-9][0-9]{0,2}(?:\.[0-9]{3})+(?:,[0-9]{2})?)\b/g
  let tm
  while ((tm = thousandsRegex.exec(sanitizedText)) !== null) {
    const raw = tm[1].replace(/\./g, '').replace(',', '.')
    const val = parseFloat(raw)
    if (!isNaN(val) && val >= 50 && val < 50000000) {
      otherAmounts.push(Math.round(val))
    }
  }

  return [...new Set([...priorityAmounts, ...otherAmounts])]
}

/**
 * Analizador universal de texto de comprobante (usado en servidor y cliente)
 * Compara monto, titular del negocio y CBU/CVU de forma dinámica.
 */
export function analyzeReceiptText(
  extractedText: string,
  expectedTotal: number,
  pageCount = 1,
  bankConfig: BusinessBankConfig = BUSINESS_BANK_CONFIG
): ReceiptValidationResult {
  const lowerText = extractedText.toLowerCase()

  // Palabras clave no bancarias explícitas
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

  if (isNonReceiptDoc || (extractedText.length > 50 && matchedKeywordsCount === 0)) {
    return {
      isValid: false,
      allowSubmit: false,
      status: 'invalido',
      isReceipt: false,
      amountMatches: false,
      recipientMatches: false,
      cvuMatches: false,
      expectedAmount: expectedTotal,
      expectedTitular: bankConfig.titular,
      expectedCvu: bankConfig.cvu,
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

  // Comparar Destinatario y CVU con las variables del negocio (no harcodeadas)
  const recipientMatches = checkRecipientMatch(recipientName, bankConfig.titular)
  const cvuMatches = checkCvuMatch(extractedText, bankConfig.cvu, bankConfig.alias)

  const observations: string[] = []

  if (!amountMatches && detectedAmount) {
    observations.push(`Monto que dice: $${detectedAmount.toLocaleString('es-AR')} cuando debería ser: $${expectedTotal.toLocaleString('es-AR')}`)
  } else if (!amountMatches) {
    observations.push('No se detectó el monto exacto en el comprobante')
  }

  if (!recipientMatches && recipientName) {
    observations.push(`Destinatario detectado: "${recipientName}" (no coincide con el titular del negocio "${bankConfig.titular}")`)
  }

  if (!cvuMatches && !recipientMatches) {
    observations.push(`Cuenta destino: No se detectó coincidencia con el CVU/Alias del negocio`)
  }

  // Si hay alguna discrepancia (monto diferente o destinatario diferente), pasa a "en_duda"
  const hasDiscrepancy = !amountMatches || !recipientMatches

  if (hasDiscrepancy) {
    const warningMsg = `Comprobante en duda: ${observations.join(' | ')}${referenceNumber ? ` | Op: #${referenceNumber}` : ''}${bankOrApp ? ` | ${bankOrApp}` : ''}`

    let userMsg = ''
    if (!amountMatches && detectedAmount && !recipientMatches && recipientName) {
      userMsg = `El comprobante muestra un monto de $${detectedAmount.toLocaleString('es-AR')} (debería ser $${expectedTotal.toLocaleString('es-AR')}) y el destinatario "${recipientName}" no coincide con el de la tienda (${bankConfig.titular}). Podés finalizar el pedido de todas formas; quedará marcado para revisión manual de Sofia.`
    } else if (!amountMatches && detectedAmount) {
      userMsg = `El comprobante muestra un monto de $${detectedAmount.toLocaleString('es-AR')}, pero el total de tu pedido es de $${expectedTotal.toLocaleString('es-AR')}. Podés finalizar el pedido de todas formas; quedará marcado para revisión manual de Sofia.`
    } else if (!recipientMatches && recipientName) {
      userMsg = `El destinatario en el comprobante ("${recipientName}") no coincide con el titular de la tienda ("${bankConfig.titular}"). Podés finalizar el pedido de todas formas; quedará marcado para revisión manual de Sofia.`
    } else {
      userMsg = `Comprobante recibido con observaciones. Podés finalizar el pedido; quedará registrado para revisión manual antes del despacho.`
    }

    return {
      isValid: true,
      allowSubmit: true,
      status: 'en_duda',
      isReceipt: true,
      amountMatches,
      recipientMatches,
      cvuMatches,
      detectedAmount,
      expectedAmount: expectedTotal,
      expectedTitular: bankConfig.titular,
      expectedCvu: bankConfig.cvu,
      referenceNumber: referenceNumber || 'Detectado',
      recipientName: recipientName || 'No especificado',
      bankOrApp,
      confidence: 'alta',
      pageCount,
      message: userMsg,
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
    recipientMatches: true,
    cvuMatches: true,
    detectedAmount: detectedAmount || expectedTotal,
    expectedAmount: expectedTotal,
    expectedTitular: bankConfig.titular,
    expectedCvu: bankConfig.cvu,
    referenceNumber: referenceNumber || 'OK',
    recipientName: recipientName || bankConfig.titular,
    bankOrApp,
    confidence: 'alta',
    pageCount,
    message: `✓ Comprobante de ${bankOrApp} validado con éxito. Operación #${referenceNumber || 'OK'}`
  }
}
