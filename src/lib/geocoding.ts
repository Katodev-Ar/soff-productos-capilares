export type GeocodingResult = {
  address: string
  street: string
  houseNumber: string
  neighbourhood: string
  city: string
  postalCode: string
  lat: number
  lng: number
  isApproximate?: boolean
}

/**
 * Convierte coordenadas (lat, lng) en dirección legible (calle, número/altura, barrio, ciudad, CP)
 * Utiliza ArcGIS World Geocoding Service (con interpolación de altura exacta) y fallback a OpenStreetMap.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult> {
  const fallbackResult: GeocodingResult = {
    address: `Punto en mapa (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
    street: `Ubicación en mapa`,
    houseNumber: '',
    neighbourhood: '',
    city: 'San Miguel de Tucumán',
    postalCode: '4000',
    lat,
    lng,
    isApproximate: true
  }

  // 1. Intentar con ArcGIS World GeocodeServer (incluye numeración / altura de calle en Argentina)
  try {
    const arcgisUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?f=json&location=${lng},${lat}`
    const arcRes = await fetch(arcgisUrl)
    if (arcRes.ok) {
      const arcData = await arcRes.json()
      const addr = arcData.address || {}
      
      let houseNumber = (addr.AddNum || '').trim()
      let street = (addr.Address || addr.ShortLabel || '').trim()

      if (street) {
        // Limpiar prefijo "Calle "
        if (street.toLowerCase().startsWith('calle ')) {
          street = street.slice(6).trim()
        }
        
        // Si la calle termina con el número de puerta, separarlo
        if (houseNumber && street.endsWith(' ' + houseNumber)) {
          street = street.slice(0, -(houseNumber.length + 1)).trim()
        } else if (!houseNumber) {
          // Si AddNum vino vacío pero la dirección tiene número al final
          const matchNum = street.match(/^(.*?)\s+(\d{1,5}(?:\s*-[a-zA-Z0-9]+)?)$/)
          if (matchNum) {
            street = matchNum[1].trim()
            houseNumber = matchNum[2].trim()
          }
        }

        const neighbourhood = addr.Neighborhood || addr.District || ''
        const city = addr.City || 'San Miguel de Tucumán'
        const postalCode = addr.Postal || '4000'
        const fullAddress = houseNumber ? `${street} ${houseNumber}` : street

        return {
          address: fullAddress,
          street,
          houseNumber,
          neighbourhood,
          city,
          postalCode,
          lat,
          lng,
          isApproximate: !houseNumber
        }
      }
    }
  } catch (e) {
    console.warn('Fallo geocoding con ArcGIS, pasando a OSM Nominatim:', e)
  }

  // 2. Fallback con OpenStreetMap Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`,
      {
        headers: {
          'User-Agent': 'SofiaHairCareECommerce/1.0 (contacto@sofiahaircare.com)'
        }
      }
    )
    if (!res.ok) return fallbackResult

    const data = await res.json()
    if (!data) return fallbackResult

    const addr = data.address || {}
    const road = addr.road || addr.pedestrian || addr.street || addr.footway || addr.path || ''
    const houseNumber = addr.house_number || ''
    const neighbourhood = addr.neighbourhood || addr.quarter || addr.suburb || addr.residential || addr.hamlet || ''
    const city = addr.city || addr.town || addr.municipality || addr.village || 'San Miguel de Tucumán'
    const postalCode = addr.postcode || '4000'

    let streetAddress = ''
    if (road) {
      streetAddress = houseNumber ? `${road} ${houseNumber}` : road
      if (neighbourhood && !streetAddress.toLowerCase().includes(neighbourhood.toLowerCase())) {
        streetAddress += ` (${neighbourhood})`
      }
    } else if (neighbourhood) {
      streetAddress = `Calle s/n, B° ${neighbourhood}`
    } else if (data.name) {
      streetAddress = data.name
    } else {
      streetAddress = `Ubicación en mapa (${lat.toFixed(5)}, ${lng.toFixed(5)})`
    }

    return {
      address: streetAddress,
      street: road || (neighbourhood ? `B° ${neighbourhood}` : 'Calle s/n'),
      houseNumber,
      neighbourhood,
      city,
      postalCode,
      lat,
      lng,
      isApproximate: !road
    }
  } catch (error) {
    console.error('Error en reverse geocoding:', error)
    return fallbackResult
  }
}

/**
 * Convierte una dirección de texto en coordenadas GPS (lat, lng)
 */
export async function forwardGeocode(
  query: string, 
  city: string = 'San Miguel de Tucumán'
): Promise<GeocodingResult | null> {
  // 1. Intentar primero con ArcGIS findAddressCandidates
  try {
    const singleLine = `${query}, ${city}, Tucumán, Argentina`
    const arcUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(singleLine)}&maxLocations=1`
    const arcRes = await fetch(arcUrl)
    if (arcRes.ok) {
      const arcData = await arcRes.json()
      if (arcData.candidates && arcData.candidates.length > 0) {
        const cand = arcData.candidates[0]
        const lat = cand.location.y
        const lng = cand.location.x
        
        // Ejecutar reverse para obtener componentes exactos de calle y número
        return await reverseGeocode(lat, lng)
      }
    }
  } catch (e) {
    console.warn('Fallo forward con ArcGIS, probando OSM:', e)
  }

  // 2. Fallback con OpenStreetMap Nominatim
  try {
    const searchQuery = `${query}, ${city}, Tucumán, Argentina`
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'SofiaHairCareECommerce/1.0 (contacto@sofiahaircare.com)'
        }
      }
    )
    if (!res.ok) return null
    const list = await res.json()
    if (!Array.isArray(list) || list.length === 0) return null

    const first = list[0]
    const addr = first.address || {}
    const road = addr.road || addr.pedestrian || addr.street || ''
    const houseNumber = addr.house_number || ''
    const neighbourhood = addr.neighbourhood || addr.quarter || addr.suburb || ''
    const streetAddress = road ? (houseNumber ? `${road} ${houseNumber}` : road) : query
    const resCity = addr.city || addr.town || city
    const postalCode = addr.postcode || '4000'

    return {
      address: streetAddress,
      street: road || query,
      houseNumber,
      neighbourhood,
      city,
      postalCode,
      lat: parseFloat(first.lat),
      lng: parseFloat(first.lon)
    }
  } catch (error) {
    console.error('Error en forward geocoding:', error)
    return null
  }
}
