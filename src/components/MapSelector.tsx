'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { STORE_COORDINATES } from '@/lib/shipping'

// Fix for default marker icon in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom Store Pin with Soff Logo
const createStoreIcon = () => {
  return L.divIcon({
    className: 'custom-store-pin',
    html: `
      <div style="position: relative; width: 48px; height: 56px; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
        <div style="
          width: 44px; 
          height: 44px; 
          border-radius: 50%; 
          background: #ffffff; 
          border: 3px solid #f28599; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.25); 
          display: flex; 
          align-items: center; 
          justify-content: center;
          overflow: hidden;
        ">
          <img src="/logo.png" alt="Soff" style="width: 36px; height: 36px; object-fit: contain; border-radius: 50%;" />
        </div>
        <div style="
          width: 0; 
          height: 0; 
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-top: 9px solid #f28599;
          margin-top: -2px;
        "></div>
      </div>
    `,
    iconSize: [48, 56],
    iconAnchor: [24, 54],
    popupAnchor: [0, -50]
  })
}

// Custom Destination Pin
const createCustomerIcon = () => {
  return L.divIcon({
    className: 'custom-customer-pin',
    html: `
      <div style="position: relative; width: 42px; height: 52px; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));">
        <div style="
          width: 38px; 
          height: 38px; 
          border-radius: 50%; 
          background: linear-gradient(135deg, #002f5b 0%, #1e4976 100%); 
          border: 2.5px solid #ffffff; 
          box-shadow: 0 4px 10px rgba(0,0,0,0.3); 
          display: flex; 
          align-items: center; 
          justify-content: center;
          color: white;
          font-size: 19px;
        ">
          🏠
        </div>
        <div style="
          width: 0; 
          height: 0; 
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid #002f5b;
          margin-top: -2px;
        "></div>
      </div>
    `,
    iconSize: [42, 52],
    iconAnchor: [21, 50],
    popupAnchor: [0, -46]
  })
}

type MapSelectorProps = {
  onLocationSelect: (lat: number, lng: number) => void
  defaultCenter?: [number, number]
  selectedCoords?: { lat: number; lng: number } | null
}

function MapController({ selectedCoords }: { selectedCoords?: { lat: number; lng: number } | null }) {
  const map = useMap()

  useEffect(() => {
    if (selectedCoords) {
      map.flyTo([selectedCoords.lat, selectedCoords.lng], 16, { duration: 1.2 })
    }
  }, [selectedCoords, map])

  return null
}

function LocationMarker({ 
  onLocationSelect, 
  selectedCoords 
}: { 
  onLocationSelect: (lat: number, lng: number) => void
  selectedCoords?: { lat: number; lng: number } | null
}) {
  const [position, setPosition] = useState<[number, number] | null>(
    selectedCoords ? [selectedCoords.lat, selectedCoords.lng] : null
  )

  useEffect(() => {
    if (selectedCoords) {
      setPosition([selectedCoords.lat, selectedCoords.lng])
    }
  }, [selectedCoords])
  
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng])
      onLocationSelect(e.latlng.lat, e.latlng.lng)
    }
  })

  return position === null ? null : (
    <Marker position={position} icon={createCustomerIcon()}>
      <Popup>
        <div className="font-sans text-center text-xs font-semibold py-1">
          📍 Domicilio de entrega fijado
        </div>
      </Popup>
    </Marker>
  )
}

export default function MapSelector({ 
  onLocationSelect, 
  defaultCenter = [STORE_COORDINATES.lat, STORE_COORDINATES.lng],
  selectedCoords
}: MapSelectorProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [mapMode, setMapMode] = useState<'streets' | 'satellite'>('streets')

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className="h-[360px] w-full bg-gray-100 animate-pulse rounded-2xl flex items-center justify-center text-gray-400">
        Cargando mapa interactivo...
      </div>
    )
  }

  return (
    <div className="h-[360px] w-full rounded-2xl overflow-hidden border border-gray-200 relative z-0 shadow-sm bg-gray-50">
      {/* 3D / Satellite Mode Switcher */}
      <div className="absolute top-3 right-3 z-[1000] flex bg-white/95 backdrop-blur p-1 rounded-xl shadow-md border border-gray-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMapMode('streets')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            mapMode === 'streets' 
              ? 'bg-[#002f5b] text-white shadow-sm' 
              : 'text-gray-600 hover:text-black hover:bg-gray-100'
          }`}
        >
          🗺️ Calles
        </button>
        <button
          type="button"
          onClick={() => setMapMode('satellite')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            mapMode === 'satellite' 
              ? 'bg-[#002f5b] text-white shadow-sm' 
              : 'text-gray-600 hover:text-black hover:bg-gray-100'
          }`}
        >
          🛰️ Satélite 3D
        </button>
      </div>

      <MapContainer 
        center={selectedCoords ? [selectedCoords.lat, selectedCoords.lng] : defaultCenter} 
        zoom={15} 
        style={{ height: '100%', width: '100%' }}
      >
        {mapMode === 'streets' ? (
          /* Esri World Street Map (Clean, beautiful vectors with no watermarks) */
          <TileLayer
            key="streets"
            attribution='Tiles &copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
            maxZoom={18}
          />
        ) : (
          /* Esri World Imagery (High-Res Photorealistic 3D Aerial) + Hybrid Reference Labels */
          <>
            <TileLayer
              key="satellite-base"
              attribution='Tiles &copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
            />
            <TileLayer
              key="satellite-labels"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
            />
          </>
        )}

        <MapController selectedCoords={selectedCoords} />

        {/* Store marker with Soff Logo */}
        <Marker 
          position={[STORE_COORDINATES.lat, STORE_COORDINATES.lng]} 
          icon={createStoreIcon()}
        >
          <Popup>
            <div className="text-center font-sans p-1">
              <span className="font-bold text-xs uppercase tracking-wider block text-brand-primary">
                Soff Productos Capilares
              </span>
              <span className="text-[11px] text-gray-600 block mt-0.5">
                Av. Independencia 2820
              </span>
              <span className="inline-block mt-1 text-[10px] bg-pink-50 text-pink-700 font-bold px-2 py-0.5 rounded-full">
                Punto de Despacho
              </span>
            </div>
          </Popup>
        </Marker>

        {/* Customer destination marker */}
        <LocationMarker onLocationSelect={onLocationSelect} selectedCoords={selectedCoords} />
      </MapContainer>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur px-4 py-1.5 rounded-full text-xs font-semibold shadow-md z-[1000] pointer-events-none text-gray-800 border border-gray-100 flex items-center gap-1.5">
        <span>📍</span>
        <span>Haz clic en tu casa o esquina en el mapa</span>
      </div>
    </div>
  )
}
