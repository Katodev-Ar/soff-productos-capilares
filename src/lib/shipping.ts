// Coordenadas oficiales de SOFF PRODUCTOS CAPILARES en Google Maps
// Ubicación: Av. Independencia 2820, San Miguel de Tucumán
export const STORE_COORDINATES = {
  lat: -26.8419704,
  lng: -65.2455987,
  address: 'Av. Independencia 2820, San Miguel de Tucumán',
  phone: '+5493816253929'
}

/**
 * Parámetros de tarifación calibrados según Uber Flash Moto (+15% de margen en tarifa base)
 */
export const UBER_MOTO_RATES = {
  BASE_FARE: 690,         // Tarifa base Uber Moto ($600 + 15%)
  PER_KM: 350,            // Costo por kilómetro recorrido en moto
  PER_MINUTE: 60,         // Costo por minuto estimado en moto
  BOOKING_FEE: 150,       // Cuota fija de solicitud / plataforma
  MINIMUM_FARE: 1600,     // Tarifa mínima de Uber Moto
  SAFETY_MARGIN: 1500,    // Margen de seguridad ante fluctuaciones dinámicas ($1.500)
  PEAK_SURGE: 1.20,       // Multiplicador en hora pico (1.2x)
  DEFAULT_FLAT_RATE: 3500 // Tarifa fija cuando el usuario no define ubicación en el mapa
}

export type DeliveryMethod = 'delivery' | 'pickup' | 'uber_moto' | 'whatsapp'

/**
 * Calcula la distancia en kilómetros entre dos coordenadas usando la fórmula de Haversine
 * con factor de recorrido urbano (las calles no son línea recta).
 */
export function calculateDistanceKm(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371 // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
      
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const straightDistance = R * c

  // Factor de curvatura de calles en zona urbana (aprox. +30% respecto a línea recta)
  const urbanFactor = 1.3
  return Math.round(straightDistance * urbanFactor * 10) / 10
}

/**
 * Estima el tiempo de viaje en moto (en minutos) según la distancia urbana
 */
export function estimateTripMinutes(distanceKm: number): number {
  // En ciudad la moto promedia ~22 km/h más tiempo de semáforos/maniobra
  const baseMinutes = 4
  const minutesPerKm = 2.5
  return Math.max(5, Math.round(baseMinutes + (distanceKm * minutesPerKm)))
}

/**
 * Evalúa si el horario actual corresponde a hora pico en Argentina (Tucumán)
 * - Hora pico tarde: 18:00 a 20:30 (1.20x)
 * - Hora pico mañana: 08:00 a 09:30 (1.15x)
 */
export function getSurgeMultiplier(date: Date = new Date()): { multiplier: number; isPeak: boolean; reason?: string } {
  // Obtener hora y minutos en huso horario argentino (UTC-3)
  const formatter = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Tucuman',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  })
  
  const parts = formatter.formatToParts(date)
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '12', 10)
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10)
  const timeInMinutes = hour * 60 + minute

  // Hora pico tarde: 18:00 a 20:30 (1080 a 1230 minutos)
  if (timeInMinutes >= 18 * 60 && timeInMinutes <= 20 * 60 + 30) {
    return { multiplier: UBER_MOTO_RATES.PEAK_SURGE, isPeak: true, reason: 'Hora pico tarde (18:00 - 20:30)' }
  }

  // Hora pico mañana: 08:00 a 09:30 (480 a 570 minutos)
  if (timeInMinutes >= 8 * 60 && timeInMinutes <= 9 * 60 + 30) {
    return { multiplier: 1.15, isPeak: true, reason: 'Hora pico mañana (08:00 - 09:30)' }
  }

  return { multiplier: 1.0, isPeak: false }
}

export type ShippingEstimate = {
  distanceKm: number
  estimatedMinutes: number
  isPeakHour: boolean
  surgeMultiplier: number
  peakReason?: string
  uberBaseEstimate: number
  safetyMargin: number
  totalShipping: number
}

/**
 * Calcula el costo total de envío estimado aplicando el algoritmo de Uber Flash Moto
 * Fórmula: Max(TarifaMínima, [Base + (CostoKm * d) + (CostoMinuto * t)] * Surge + CuotaReserva) + MargenSeguridad
 */
export function estimateShippingCost(
  destLat: number, 
  destLng: number,
  isFreeShipping: boolean = false
): ShippingEstimate {
  const distanceKm = calculateDistanceKm(
    STORE_COORDINATES.lat, 
    STORE_COORDINATES.lng, 
    destLat, 
    destLng
  )

  const estimatedMinutes = estimateTripMinutes(distanceKm)
  const { multiplier: surgeMultiplier, isPeak: isPeakHour, reason: peakReason } = getSurgeMultiplier()

  if (isFreeShipping) {
    return {
      distanceKm,
      estimatedMinutes,
      isPeakHour,
      surgeMultiplier: 1.0,
      peakReason,
      uberBaseEstimate: 0,
      safetyMargin: 0,
      totalShipping: 0
    }
  }

  // Componentes de Uber Flash Moto
  const distanceCost = distanceKm * UBER_MOTO_RATES.PER_KM
  const timeCost = estimatedMinutes * UBER_MOTO_RATES.PER_MINUTE
  const subtotalBeforeSurge = UBER_MOTO_RATES.BASE_FARE + distanceCost + timeCost
  const subtotalWithSurge = subtotalBeforeSurge * surgeMultiplier
  const grossUberCost = subtotalWithSurge + UBER_MOTO_RATES.BOOKING_FEE

  // Aplicar piso de tarifa mínima de Uber Moto
  const uberBaseEstimate = Math.max(UBER_MOTO_RATES.MINIMUM_FARE, Math.round(grossUberCost))

  // Sumar el margen de seguridad de +$1.000 solicitado
  const rawTotal = uberBaseEstimate + UBER_MOTO_RATES.SAFETY_MARGIN

  // Redondear a múltiplo de 50 para precios limpios
  const totalShipping = Math.ceil(rawTotal / 50) * 50

  return {
    distanceKm,
    estimatedMinutes,
    isPeakHour,
    surgeMultiplier,
    peakReason,
    uberBaseEstimate,
    safetyMargin: UBER_MOTO_RATES.SAFETY_MARGIN,
    totalShipping
  }
}

// Mantener compatibilidad con referencias anteriores
export const SHIPPING_RATES = {
  ...UBER_MOTO_RATES,
  BASE_FEE: UBER_MOTO_RATES.BASE_FARE
}
