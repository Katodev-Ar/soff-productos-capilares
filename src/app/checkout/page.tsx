'use client'

import { useState, useEffect } from 'react'
import { useCart } from '@/context/CartContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { 
  AlertCircle, 
  ArrowLeft, 
  CreditCard, 
  PackageSearch, 
  ShieldCheck, 
  Wallet, 
  Check, 
  Tag, 
  MapPin, 
  Search, 
  Truck, 
  Store, 
  Bike, 
  MessageCircle, 
  Clock, 
  ExternalLink, 
  Info,
  CheckCircle2,
  FileCheck
} from 'lucide-react'
import { FREE_SHIPPING_THRESHOLD, formatPrice } from '@/lib/catalog'
import { TePuedeInteresar } from '@/components/TePuedeInteresar'
import { MapSelector } from '@/components/MapSelectorDynamic'
import { 
  estimateShippingCost, 
  SHIPPING_RATES, 
  STORE_COORDINATES,
  type DeliveryMethod 
} from '@/lib/shipping'
import { reverseGeocode, forwardGeocode } from '@/lib/geocoding'

const WHATSAPP_PHONE = '5493816253929'

export default function CheckoutPage() {
  const { 
    items, 
    cartSubtotal, 
    cartTotal, 
    volumeDiscountPercentage,
    couponCode, setCouponCode,
    couponDiscountPercentage, setCouponDiscountPercentage,
    freeShippingThreshold
  } = useCart()
  
  const [step, setStep] = useState(1)
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('delivery')
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null)
  const [showTransfer, setShowTransfer] = useState(true)
  const [showMap, setShowMap] = useState(false)
  const [mapCoordinates, setMapCoordinates] = useState<{lat: number, lng: number} | null>(null)
  
  const [formData, setFormData] = useState({
    email: '', 
    name: '', 
    lastName: '', 
    address: '', 
    houseNumber: '',
    city: 'San Miguel de Tucumán', 
    cp: '4000', 
    phone: '',
    notes: ''
  })

  const [isGeocoding, setIsGeocoding] = useState(false)
  const [geocodingNotice, setGeocodingNotice] = useState<string | null>(null)
  
  const [couponInput, setCouponInput] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')

  const router = useRouter()
  
  // Dynamic Shipping Calculation
  const threshold = freeShippingThreshold || FREE_SHIPPING_THRESHOLD
  const isFreeShipping = cartTotal >= threshold
  const shippingEstimate = (deliveryMethod === 'delivery' && mapCoordinates)
    ? estimateShippingCost(mapCoordinates.lat, mapCoordinates.lng, isFreeShipping)
    : null

  let shippingCost = 0
  if (deliveryMethod === 'delivery') {
    shippingCost = isFreeShipping 
      ? 0 
      : (shippingEstimate ? shippingEstimate.totalShipping : SHIPPING_RATES.DEFAULT_FLAT_RATE)
  } else {
    shippingCost = 0 // pickup, uber_moto y whatsapp no cobran costo de envío en el checkout
  }

  const finalTotal = cartTotal + shippingCost
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isValidatingReceipt, setIsValidatingReceipt] = useState(false)
  const [receiptValidation, setReceiptValidation] = useState<{
    isValid: boolean
    isReceipt: boolean
    amountMatches: boolean
    detectedAmount?: number
    expectedAmount?: number
    referenceNumber?: string
    bankOrApp?: string
    message: string
  } | null>(null)

  const handleFileChange = async (file: File | null) => {
    setReceiptFile(file)
    setReceiptValidation(null)
    setPaymentNotice(null)
    if (!file) return

    setIsValidatingReceipt(true)
    try {
      const data = new FormData()
      data.append('receipt', file)
      data.append('expectedTotal', String(Math.round(finalTotal)))

      const res = await fetch('/api/checkout/validate-receipt', {
        method: 'POST',
        body: data
      })
      const result = await res.json()
      setReceiptValidation(result)
      if (!result.isValid) {
        setPaymentNotice(result.message)
      }
    } catch (e: any) {
      setReceiptValidation({
        isValid: false,
        isReceipt: false,
        amountMatches: false,
        message: 'No se pudo conectar con el detector de transferencias.'
      })
    } finally {
      setIsValidatingReceipt(false)
    }
  }

  // 1. Autofill user data from profile
  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setFormData(prev => ({ ...prev, email: user.email || '' }))
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (profile) {
          setFormData(prev => ({
            ...prev,
            name: profile.first_name || '',
            lastName: profile.last_name || '',
            address: profile.address || '',
            city: profile.city || 'San Miguel de Tucumán',
            cp: profile.postal_code || '4000',
            phone: profile.phone || ''
          }))
        }
      }
    }
    loadUserData()
  }, [])

  // Reciprocal Geocoding: Click on map -> auto-fill address
  const handleMapLocationSelect = async (lat: number, lng: number) => {
    setMapCoordinates({ lat, lng })
    setIsGeocoding(true)
    setGeocodingNotice('Detectando dirección en el mapa...')
    
    const result = await reverseGeocode(lat, lng)
    const detectedStreet = result.street || result.address || `Ubicación en mapa (${lat.toFixed(5)}, ${lng.toFixed(5)})`
    
    setFormData(prev => ({
      ...prev,
      address: detectedStreet,
      houseNumber: result.houseNumber || prev.houseNumber || '',
      city: result.city || prev.city || 'San Miguel de Tucumán',
      cp: result.postalCode || prev.cp || '4000'
    }))
    
    const label = result.houseNumber 
      ? `${detectedStreet} ${result.houseNumber}` 
      : detectedStreet

    setGeocodingNotice(`Punto marcado: ${label}`)
    setIsGeocoding(false)
    setTimeout(() => setGeocodingNotice(null), 3500)
  }

  // Reciprocal Geocoding: Type address -> pin on map
  const handleLocateAddressOnMap = async () => {
    if (!formData.address.trim()) {
      setGeocodingNotice('Ingresa primero una calle o dirección para buscar.')
      setTimeout(() => setGeocodingNotice(null), 3000)
      return
    }

    setIsGeocoding(true)
    setGeocodingNotice('Buscando dirección en el mapa...')
    
    const fullQuery = formData.houseNumber 
      ? `${formData.address} ${formData.houseNumber}` 
      : formData.address

    const result = await forwardGeocode(fullQuery, formData.city)
    if (result) {
      setMapCoordinates({ lat: result.lat, lng: result.lng })
      setFormData(prev => ({
        ...prev,
        city: result.city || prev.city,
        cp: result.postalCode || prev.cp
      }))
      setShowMap(true)
      setGeocodingNotice(`Punto ubicado en el mapa: ${result.address}`)
    } else {
      setGeocodingNotice('No pudimos ubicar la altura exacta. Puedes marcarla manualmente en el mapa.')
      setShowMap(true)
    }
    setIsGeocoding(false)
    setTimeout(() => setGeocodingNotice(null), 4000)
  }

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    setStep(2)
  }

  const applyCoupon = async () => {
    if (!couponInput.trim()) return
    setCouponLoading(true)
    setCouponError('')
    
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponInput.toUpperCase())
      .eq('is_active', true)
      .single()
      
    if (error || !coupon) {
      setCouponError('Cupón inválido o inactivo')
      setCouponLoading(false)
      return
    }
    
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      setCouponError('El cupón ha alcanzado su límite de usos')
      setCouponLoading(false)
      return
    }
    
    setCouponCode(coupon.code)
    setCouponDiscountPercentage(coupon.discount_percentage)
    setCouponInput('')
    setCouponLoading(false)
  }

  const removeCoupon = () => {
    setCouponCode(null)
    setCouponDiscountPercentage(0)
  }

  const handleTransferCheckout = async () => {
    if (!receiptFile) return
    setIsProcessing(true)
    
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) {
        setPaymentNotice('Necesitás iniciar sesión para finalizar el pedido.')
        setIsProcessing(false)
        return
      }

      const body = new FormData()
      body.append('receipt', receiptFile)
      body.append('userId', userData.user.id)
      body.append('total', String(Math.round(finalTotal)))
      
      let fullAddress = ''
      const streetWithNumber = formData.houseNumber 
        ? `${formData.address} ${formData.houseNumber}` 
        : formData.address

      if (deliveryMethod === 'delivery') {
        fullAddress = `Envío a domicilio: ${streetWithNumber}, ${formData.city}, CP: ${formData.cp}`
        if (mapCoordinates) {
          const distInfo = shippingEstimate ? ` [${shippingEstimate.distanceKm} km]` : ''
          fullAddress += `${distInfo} | Maps: https://www.google.com/maps?q=${mapCoordinates.lat},${mapCoordinates.lng}`
        }
      } else if (deliveryMethod === 'pickup') {
        fullAddress = `Retiro en el local (Av. Independencia 2820)`
      } else if (deliveryMethod === 'uber_moto') {
        fullAddress = `Envío: El cliente manda Uber Moto a retirar (a coordinar por WhatsApp)`
      } else if (deliveryMethod === 'whatsapp') {
        fullAddress = `Envío a coordinar con el vendedor por WhatsApp | Tel: ${formData.phone}`
      }

      if (formData.notes) {
        fullAddress += ` | Nota: ${formData.notes}`
      }
      
      body.append('shippingAddress', fullAddress)
      body.append('items', JSON.stringify(items))
      if (receiptValidation?.referenceNumber) {
        body.append('transferReference', receiptValidation.referenceNumber)
      }

      const res = await fetch('/api/checkout/transfer', { method: 'POST', body })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar')
      }
      
      // Update coupon uses if applied
      if (couponCode) {
        const { data: couponData } = await supabase.from('coupons').select('current_uses').eq('code', couponCode).single()
        if (couponData) {
          await supabase.from('coupons').update({ current_uses: couponData.current_uses + 1 }).eq('code', couponCode)
        }
      }

      router.push('/checkout/exito')
    } catch (error: any) {
      console.error('Error al subir comprobante:', error)
      setPaymentNotice('Hubo un error al procesar el comprobante. Por favor intentá enviarlo por WhatsApp.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Pre-configured WhatsApp messages
  const getWhatsAppMessage = (type: 'uber_moto' | 'whatsapp') => {
    if (type === 'uber_moto') {
      return encodeURIComponent(
        `¡Hola Soff! Acabo de hacer una compra a nombre de ${formData.name || 'Cliente'} y quiero coordinar para enviar un Uber Moto a retirar. ¿Me confirman cuándo estará preparado el paquete?`
      )
    }
    return encodeURIComponent(
      `¡Hola Soff! Estoy realizando una compra a nombre de ${formData.name || 'Cliente'} y quisiera coordinar el envío directamente con ustedes.`
    )
  }

  if (items.length === 0 && step === 1) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-900">
        <h2 className="text-2xl font-bold mb-4">Tu carrito está vacío</h2>
        <button type="button" onClick={() => router.push('/productos')} className="rounded bg-black px-6 py-3 text-white hover:bg-gray-800">
          Volver a la tienda
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row text-gray-900 font-sans">
      
      {/* Left Column - Forms */}
      <div className="w-full md:w-3/5 p-6 md:p-12 border-r border-gray-200 bg-white min-h-screen">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold font-serif uppercase tracking-widest text-brand-primary">
            Soff
          </Link>
          <Link href="/productos" className="text-sm text-gray-500 hover:text-black flex items-center">
            <ArrowLeft size={16} className="mr-1" /> Volver a la tienda
          </Link>
        </div>

        {/* Interactive Animated Stepper Timeline */}
        <div className="max-w-xl mx-auto md:ml-auto md:mr-10 mb-8 mt-2">
          <div className="flex items-center justify-between relative px-4">
            {/* Background line */}
            <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-gray-200 -z-10 rounded-full"></div>
            {/* Animated progress fill */}
            <div 
              className="absolute left-8 top-1/2 -translate-y-1/2 h-1 bg-[#002f5b] -z-10 rounded-full transition-all duration-500 ease-out" 
              style={{ width: step === 1 ? '40%' : '80%' }}
            ></div>
            
            {/* Step 1: Carrito (Interactive) */}
            <button
              type="button"
              onClick={() => router.push('/productos')}
              className="flex flex-col items-center gap-2 bg-white px-2 group cursor-pointer focus:outline-none"
              title="Volver al catálogo"
            >
              <div className="w-8 h-8 rounded-full bg-[#002f5b] text-white flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm">
                <Check size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[11px] font-bold text-gray-900 uppercase tracking-wider group-hover:text-[#002f5b] transition-colors">
                Carrito
              </span>
            </button>

            {/* Step 2: Entrega (Interactive) */}
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex flex-col items-center gap-2 bg-white px-2 group cursor-pointer focus:outline-none"
              title="Ir al paso de entrega"
            >
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                step === 1 
                  ? 'border-[#002f5b] bg-white text-[#002f5b] ring-4 ring-blue-100 shadow-md scale-105' 
                  : 'border-[#002f5b] bg-[#002f5b] text-white'
              }`}>
                {step === 2 ? (
                  <Check size={16} strokeWidth={2.5} />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#002f5b] animate-pulse"></span>
                )}
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${
                step === 1 ? 'text-[#002f5b]' : 'text-gray-700'
              }`}>
                Entrega
              </span>
            </button>

            {/* Step 3: Pago (Interactive) */}
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex flex-col items-center gap-2 bg-white px-2 group cursor-pointer focus:outline-none"
              title="Ir al paso de pago"
            >
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                step === 2 
                  ? 'border-[#002f5b] bg-white text-[#002f5b] ring-4 ring-blue-100 shadow-md scale-105' 
                  : 'border-gray-300 bg-gray-50 text-gray-400 group-hover:border-gray-400 group-hover:text-gray-600'
              }`}>
                {step === 2 ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#002f5b] animate-pulse"></span>
                ) : (
                  <span className="text-xs font-bold">3</span>
                )}
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${
                step === 2 ? 'text-[#002f5b]' : 'text-gray-400'
              }`}>
                Pago
              </span>
            </button>
          </div>
        </div>

        {step === 1 ? (
          <form onSubmit={handleNext} className="max-w-xl mx-auto md:ml-auto md:mr-10">
            <h2 className="text-xl font-bold mb-5">1. Datos de Contacto</h2>
            
            <div className="space-y-3 mb-8">
              <input 
                required 
                type="email" 
                placeholder="Correo electrónico" 
                className="w-full border p-3 rounded-lg bg-white focus:ring-1 focus:ring-black outline-none text-sm" 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
              />
              
              <div className="grid grid-cols-2 gap-3">
                <input 
                  required 
                  type="text" 
                  placeholder="Nombre" 
                  className="w-full border p-3 rounded-lg bg-white focus:ring-1 focus:ring-black outline-none text-sm" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
                <input 
                  required 
                  type="text" 
                  placeholder="Apellido" 
                  className="w-full border p-3 rounded-lg bg-white focus:ring-1 focus:ring-black outline-none text-sm" 
                  value={formData.lastName} 
                  onChange={e => setFormData({...formData, lastName: e.target.value})} 
                />
              </div>

              <input 
                required 
                type="tel" 
                placeholder="Teléfono / WhatsApp de contacto" 
                className="w-full border p-3 rounded-lg bg-white focus:ring-1 focus:ring-black outline-none text-sm" 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
              />
            </div>

            {/* Delivery Methods Selection */}
            <h2 className="text-xl font-bold mb-4">2. Método de Entrega</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {/* Option 1: Delivery */}
              <button
                type="button"
                onClick={() => setDeliveryMethod('delivery')}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  deliveryMethod === 'delivery'
                    ? 'border-[#002f5b] bg-blue-50/60 ring-2 ring-[#002f5b]/20 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Truck className={`h-5 w-5 ${deliveryMethod === 'delivery' ? 'text-[#002f5b]' : 'text-gray-500'}`} />
                    <span className="text-xs font-bold text-gray-900">
                      {shippingCost === 0 ? 'Gratis' : (shippingEstimate ? formatPrice(shippingCost) : 'Por distancia')}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">Envío a Domicilio</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-snug">
                    Calculado por distancia en San Miguel de Tucumán.
                  </p>
                </div>
              </button>

              {/* Option 2: Pickup */}
              <button
                type="button"
                onClick={() => setDeliveryMethod('pickup')}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  deliveryMethod === 'pickup'
                    ? 'border-[#002f5b] bg-blue-50/60 ring-2 ring-[#002f5b]/20 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Store className={`h-5 w-5 ${deliveryMethod === 'pickup' ? 'text-[#002f5b]' : 'text-gray-500'}`} />
                    <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Gratis</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">Retiro por el Local</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-snug">
                    Av. Independencia 2820.
                  </p>
                </div>
              </button>

              {/* Option 3: Customer Uber Moto */}
              <button
                type="button"
                onClick={() => setDeliveryMethod('uber_moto')}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  deliveryMethod === 'uber_moto'
                    ? 'border-[#002f5b] bg-blue-50/60 ring-2 ring-[#002f5b]/20 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Bike className={`h-5 w-5 ${deliveryMethod === 'uber_moto' ? 'text-[#002f5b]' : 'text-gray-500'}`} />
                    <span className="text-xs font-semibold text-gray-500">A tu cargo</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">Mando un Uber Moto</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-snug">
                    Pides tu propio cadete o moto a retirar.
                  </p>
                </div>
              </button>

              {/* Option 4: Coordinate with seller */}
              <button
                type="button"
                onClick={() => setDeliveryMethod('whatsapp')}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  deliveryMethod === 'whatsapp'
                    ? 'border-[#002f5b] bg-blue-50/60 ring-2 ring-[#002f5b]/20 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <MessageCircle className={`h-5 w-5 ${deliveryMethod === 'whatsapp' ? 'text-[#002f5b]' : 'text-gray-500'}`} />
                    <span className="text-xs font-semibold text-gray-500">A coordinar</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">Coordinar con Vendedor</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-snug">
                    Acordamos por WhatsApp.
                  </p>
                </div>
              </button>
            </div>

            {/* Delivery Method Details / Content */}
            {deliveryMethod === 'delivery' && (
              <div className="rounded-2xl border border-gray-200 p-5 bg-gray-50/50 mb-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <MapPin size={18} className="text-[#002f5b]" />
                    Dirección de Entrega
                  </h3>
                  <span className="text-[11px] text-gray-500">
                    Escribe tus datos o marca en el mapa
                  </span>
                </div>

                {/* Reciprocal Actions: Search on map OR open map */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-[2]">
                      <input 
                        required 
                        type="text" 
                        placeholder="Calle o avenida (ej: 9 de Julio de 1816)" 
                        className="w-full border p-3 rounded-lg bg-white focus:ring-1 focus:ring-black outline-none text-sm" 
                        value={formData.address} 
                        onChange={e => setFormData({...formData, address: e.target.value})} 
                      />
                    </div>
                    <div className="flex flex-1 gap-2">
                      <input 
                        type="text" 
                        placeholder="N° / Altura (ej: 1250)" 
                        className="w-full border p-3 rounded-lg bg-white focus:ring-1 focus:ring-black outline-none text-sm font-semibold text-gray-900" 
                        value={formData.houseNumber} 
                        onChange={e => setFormData({...formData, houseNumber: e.target.value})} 
                      />
                      <button
                        type="button"
                        onClick={handleLocateAddressOnMap}
                        disabled={isGeocoding}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3.5 py-3 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 flex-none"
                        title="Ubicar esta dirección en el mapa"
                      >
                        <Search size={15} />
                        <span className="hidden sm:inline">Ubicar</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      required 
                      type="text" 
                      placeholder="Ciudad" 
                      className="w-full border p-3 rounded-lg bg-white focus:ring-1 focus:ring-black outline-none text-sm" 
                      value={formData.city} 
                      onChange={e => setFormData({...formData, city: e.target.value})} 
                    />
                    <input 
                      required 
                      type="text" 
                      placeholder="Código Postal" 
                      className="w-full border p-3 rounded-lg bg-white focus:ring-1 focus:ring-black outline-none text-sm" 
                      value={formData.cp} 
                      onChange={e => setFormData({...formData, cp: e.target.value})} 
                    />
                  </div>

                  {/* Toggle Map View */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowMap(!showMap)}
                      className={`w-full flex items-center justify-center gap-2 border p-3 rounded-xl text-xs font-bold transition-all ${
                        showMap || mapCoordinates 
                          ? 'border-[#002f5b] bg-blue-50 text-[#002f5b]' 
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <MapPin size={16} className={mapCoordinates ? 'text-green-600' : 'text-gray-500'} />
                      {mapCoordinates 
                        ? '📍 Ubicación seleccionada en el mapa (Clic para ajustar punto exacto)' 
                        : '🗺️ Abrir mapa interactivo para marcar mi casa exacta'}
                    </button>
                  </div>

                  {/* Dynamic interactive map */}
                  {showMap && (
                    <div className="mt-3">
                      <MapSelector 
                        onLocationSelect={handleMapLocationSelect} 
                        selectedCoords={mapCoordinates}
                      />
                    </div>
                  )}

                  {/* Notification badge */}
                  {geocodingNotice && (
                    <div className="text-xs text-blue-900 bg-blue-50 border border-blue-200 p-2.5 rounded-lg flex items-center gap-2 animate-fadeIn">
                      <Info size={14} className="flex-none text-blue-600" />
                      <span>{geocodingNotice}</span>
                    </div>
                  )}

                  {/* Dynamic shipping rate summary */}
                  {shippingEstimate && (
                    <div className="rounded-xl bg-white border border-blue-200 p-4 text-xs space-y-2 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900 flex items-center gap-1.5 text-sm">
                          🛵 Costo de envío a domicilio:
                        </span>
                        <span className="font-extrabold text-base text-[#002f5b]">
                          {shippingCost === 0 ? <span className="text-green-600">¡GRATIS!</span> : formatPrice(shippingCost)}
                        </span>
                      </div>
                      
                      <div className="text-gray-600 space-y-1 pt-1 border-t border-gray-100">
                        <div className="flex justify-between">
                          <span>Recorrido estimado desde el local:</span>
                          <span className="font-semibold text-gray-800">
                            {shippingEstimate.distanceKm} km (~{shippingEstimate.estimatedMinutes} min)
                          </span>
                        </div>
                      </div>

                      <p className="text-[10px] text-gray-400 pt-1 border-t border-gray-100">
                        Tarifa calculada en base a la distancia desde nuestra sucursal (Av. Independencia 2820).
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {deliveryMethod === 'pickup' && (
              <div className="rounded-2xl border border-green-200 bg-green-50/50 p-5 mb-6 space-y-3">
                <div className="flex items-start gap-3">
                  <Store className="h-6 w-6 text-green-700 mt-0.5 flex-none" />
                  <div>
                    <h3 className="text-sm font-bold text-green-950">Retiro en nuestro local comercial</h3>
                    <p className="text-xs text-green-800 font-medium mt-1">
                      {STORE_COORDINATES.address}
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      🕒 Horarios de atención: Lunes a Sábados de 9:00 a 13:00 y de 17:00 a 21:00 hs.
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-green-800 font-semibold bg-white px-3 py-1.5 rounded-lg border border-green-200">
                      <Clock size={14} /> Te enviaremos un WhatsApp cuando tu pedido esté empaquetado para retirar.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {deliveryMethod === 'uber_moto' && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/60 p-5 mb-6 space-y-3">
                <div className="flex items-start gap-3">
                  <Bike className="h-6 w-6 text-amber-700 mt-0.5 flex-none" />
                  <div>
                    <h3 className="text-sm font-bold text-amber-950">Mandar un Uber Moto / Cadete propio</h3>
                    <div className="mt-2 p-3 bg-white rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
                      <p className="font-bold text-amber-900 flex items-center gap-1.5">
                        ⚠️ ATENCIÓN PREVIA AL ENVÍO DE LA MOTO:
                      </p>
                      <p className="leading-relaxed">
                        Los pedidos tienen un <strong>tiempo de preparación y armado</strong>. Por favor, <strong>NO envíes la moto antes de consultar</strong>. Debes avisar primero por WhatsApp para verificar que el paquete esté listo para entregar.
                      </p>
                    </div>

                    <a
                      href={`https://wa.me/${WHATSAPP_PHONE}?text=${getWhatsAppMessage('uber_moto')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3.5 inline-flex items-center justify-center gap-2 bg-[#25D366] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-[#20bd5a] transition-colors shadow-sm"
                    >
                      <MessageCircle size={15} /> Avisar al WhatsApp del local antes de pedir la moto
                    </a>
                  </div>
                </div>
              </div>
            )}

            {deliveryMethod === 'whatsapp' && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 mb-6 space-y-3">
                <div className="flex items-start gap-3">
                  <MessageCircle className="h-6 w-6 text-[#002f5b] mt-0.5 flex-none" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Coordinar envío con el vendedor</h3>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      ¿Tienes dudas sobre tu zona, envíos al interior o prefieres acordar la entrega directamente? Puedes continuar con la compra y coordinar los detalles por WhatsApp.
                    </p>

                    <a
                      href={`https://wa.me/${WHATSAPP_PHONE}?text=${getWhatsAppMessage('whatsapp')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3.5 inline-flex items-center justify-center gap-2 bg-[#002f5b] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-black transition-colors shadow-sm"
                    >
                      <ExternalLink size={14} /> Abrir chat de WhatsApp para coordinar
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Optional Order Notes */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Notas adicionales para el pedido (Opcional)
              </label>
              <textarea
                placeholder="Aclaraciones sobre el timbre, piso, horarios o referencias de entrega..."
                rows={2}
                className="w-full border p-3 rounded-lg bg-white focus:ring-1 focus:ring-black outline-none text-sm resize-none"
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-black text-white py-4 font-bold uppercase tracking-widest text-sm hover:bg-gray-800 rounded-xl transition-all shadow-md"
            >
              Continuar al Pago
            </button>
          </form>
        ) : (
          <div className="max-w-xl mx-auto md:ml-auto md:mr-10">
            {/* Botón de volver al paso anterior */}
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-black mb-4 transition-colors group cursor-pointer"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Volver a Entrega y Dirección
            </button>

            <h2 className="text-xl font-bold mb-6">Método de Pago</h2>
            
            <div className="border rounded-2xl overflow-hidden mb-6 shadow-sm">
              <div className="p-4 border-b flex justify-between bg-gray-50 text-sm">
                <span className="text-gray-500">Contacto</span>
                <span className="font-medium">{formData.email}</span>
                <button type="button" onClick={() => setStep(1)} className="text-blue-600 hover:underline">Cambiar</button>
              </div>
              <div className="p-4 flex justify-between bg-gray-50 text-sm">
                <span className="text-gray-500">Entrega</span>
                <span className="font-medium text-right max-w-xs truncate">
                  {deliveryMethod === 'delivery' && `${formData.address}${formData.houseNumber ? ' ' + formData.houseNumber : ''}, ${formData.city}`}
                  {deliveryMethod === 'pickup' && 'Retiro en el local (Av. Independencia 2820)'}
                  {deliveryMethod === 'uber_moto' && 'Mando Uber Moto (a cargo del cliente)'}
                  {deliveryMethod === 'whatsapp' && 'A coordinar por WhatsApp'}
                </span>
                <button type="button" onClick={() => setStep(1)} className="text-blue-600 hover:underline">Cambiar</button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex w-full items-center justify-between rounded-xl border border-green-500 bg-green-50 p-4 transition-colors shadow-sm">
                <div className="flex items-center text-gray-900 font-bold">
                  <Wallet className="mr-3 text-green-700" /> Transferencia Bancaria (Activo)
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-green-700 bg-green-200/60 px-2.5 py-1 rounded-full">
                  Recomendado
                </span>
              </div>

              {showTransfer && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-5 space-y-4 animate-fadeIn">
                  <p className="text-sm text-green-900 font-medium">
                    Realizá la transferencia por el monto indicado y subí el comprobante para confirmar tu pedido.
                  </p>
                  
                  <div className="bg-white rounded-xl p-4 space-y-3 border border-green-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Titular</span>
                      <span className="font-semibold text-gray-900">Cristian Benjamin Corbalan</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Alias</span>
                      <span className="font-mono font-semibold text-gray-900">corbalan.cristian.b</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">CVU</span>
                      <span className="font-mono text-xs font-semibold text-gray-900">0000003100071749630487</span>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl p-4 border border-green-100">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Subtotal productos</span>
                      <span className={volumeDiscountPercentage > 0 || couponDiscountPercentage > 0 ? "text-gray-400 line-through" : "text-gray-800 font-medium"}>
                        ${cartSubtotal.toLocaleString('es-AR')}
                      </span>
                    </div>
                    {volumeDiscountPercentage > 0 && (
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-green-700 font-medium">Descuento por volumen ({volumeDiscountPercentage}%)</span>
                        <span className="text-green-700 font-medium">-${Math.round(cartSubtotal * (volumeDiscountPercentage/100)).toLocaleString('es-AR')}</span>
                      </div>
                    )}
                    {couponDiscountPercentage > 0 && (
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-green-700 font-medium">Cupón {couponCode} ({couponDiscountPercentage}%)</span>
                        <span className="text-green-700 font-medium">-${Math.round(cartSubtotal * (couponDiscountPercentage/100)).toLocaleString('es-AR')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">
                        {deliveryMethod === 'delivery' ? 'Envío a domicilio' : 'Envío'}
                      </span>
                      <span className="font-medium text-gray-900">
                        {shippingCost === 0 ? <span className="text-green-700 font-bold uppercase tracking-wider text-[11px]">Gratis</span> : `$${shippingCost.toLocaleString('es-AR')}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-green-100 pt-2 mt-2">
                      <span className="text-gray-900">Total a transferir</span>
                      <span className="text-green-700">${Math.round(finalTotal).toLocaleString('es-AR')}</span>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                        <FileCheck className="h-4 w-4 text-green-700" /> Subí el comprobante de transferencia:
                      </p>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                        Captura o PDF (1 pág.)
                      </span>
                    </div>

                    <input 
                      type="file" 
                      accept="image/*,.pdf" 
                      onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-100 file:text-green-800 hover:file:bg-green-200 cursor-pointer"
                    />

                    {/* Detector en progreso */}
                    {isValidatingReceipt && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2.5 animate-pulse">
                        <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-medium">Analizando comprobante con detector inteligente de transferencias...</span>
                      </div>
                    )}

                    {/* Resultado del Detector */}
                    {!isValidatingReceipt && receiptValidation && (
                      <div className={`mt-3 p-3.5 rounded-xl text-xs border transition-all ${
                        receiptValidation.isValid 
                          ? 'bg-green-50 border-green-300 text-green-950' 
                          : 'bg-red-50 border-red-300 text-red-900'
                      }`}>
                        <div className="flex items-start gap-2.5">
                          {receiptValidation.isValid ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-none" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-none" />
                          )}
                          <div className="space-y-1.5 flex-1">
                            <p className="font-bold text-sm">
                              {receiptValidation.isValid ? 'Comprobante Verificado con Éxito' : 'Comprobante no válido'}
                            </p>
                            <p className="leading-relaxed">{receiptValidation.message}</p>
                            {receiptValidation.isValid && (
                              <div className="pt-1 flex flex-wrap gap-2 text-[11px] font-semibold">
                                {receiptValidation.bankOrApp && (
                                  <span className="bg-green-200/70 text-green-900 px-2 py-0.5 rounded-md">
                                    🏦 {receiptValidation.bankOrApp}
                                  </span>
                                )}
                                {receiptValidation.referenceNumber && (
                                  <span className="bg-green-200/70 text-green-900 px-2 py-0.5 rounded-md">
                                    N° Op: #{receiptValidation.referenceNumber}
                                  </span>
                                )}
                                {receiptValidation.detectedAmount && (
                                  <span className="bg-green-200/70 text-green-900 px-2 py-0.5 rounded-md">
                                    Monto: ${receiptValidation.detectedAmount.toLocaleString('es-AR')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleTransferCheckout}
                    disabled={!receiptFile || isValidatingReceipt || !receiptValidation?.isValid || isProcessing}
                    className="flex w-full items-center justify-center gap-2 bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-colors mt-4 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md"
                  >
                    {isProcessing ? 'Procesando...' : 'Finalizar Pedido'}
                  </button>
                </div>
              )}
            </div>

            {paymentNotice && (
              <div className="mt-6 flex gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm leading-6 text-yellow-900">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-none" />
                <p>{paymentNotice}</p>
              </div>
            )}
            
            <div className="mt-8 flex items-center justify-center text-gray-500 text-sm">
              <ShieldCheck size={18} className="mr-2 text-green-600" /> Tus datos se mantienen protegidos
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Cart Summary */}
      <div className="w-full md:w-2/5 bg-gray-50 p-6 md:p-12 border-l border-gray-200 min-h-screen relative">
        <div className="max-w-md mx-auto md:ml-10 sticky top-12">
          <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-2">
            {items.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center">
                  <div className="relative">
                    <div className="w-14 h-14 bg-white border rounded-lg flex items-center justify-center p-1">
                      <CheckoutProductImage imageUrl={item.image_url} name={item.name} />
                    </div>
                    <span className="absolute -top-2 -right-2 bg-gray-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">
                      {item.quantity}
                    </span>
                  </div>
                  <span className="ml-3.5 text-xs font-semibold line-clamp-2 max-w-[150px] text-gray-800">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          
          {/* Cupones Input */}
          <div className="mb-6 pt-5 border-t border-gray-200">
             {!couponCode ? (
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   value={couponInput}
                   onChange={e => setCouponInput(e.target.value.toUpperCase())}
                   placeholder="Cupón de descuento"
                   className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black uppercase font-medium bg-white"
                 />
                 <button 
                   onClick={applyCoupon}
                   disabled={couponLoading || !couponInput.trim()}
                   className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-300 transition-colors disabled:opacity-50"
                 >
                   Aplicar
                 </button>
               </div>
             ) : (
               <div className="flex justify-between items-center bg-green-50 border border-green-200 px-4 py-3 rounded-xl">
                 <div className="flex items-center gap-2 text-green-700">
                   <Tag size={16} />
                   <span className="font-bold">{couponCode}</span>
                 </div>
                 <button onClick={removeCoupon} className="text-sm text-gray-500 hover:text-black hover:underline">
                   Quitar
                 </button>
               </div>
             )}
             {couponError && <p className="text-red-500 text-xs mt-2 font-medium">{couponError}</p>}
          </div>

          <div className="border-t border-gray-200 py-4 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-gray-900">{formatPrice(cartSubtotal)}</span>
            </div>
            
            {/* Discount Lines */}
            {volumeDiscountPercentage > 0 && (
              <div className="flex justify-between text-sm text-green-600 font-medium bg-green-50 p-2 rounded-lg">
                <span>Descuento por volumen ({volumeDiscountPercentage}%)</span>
                <span>-{formatPrice(cartSubtotal * (volumeDiscountPercentage/100))}</span>
              </div>
            )}
            {couponDiscountPercentage > 0 && (
              <div className="flex justify-between text-sm text-green-600 font-medium bg-green-50 p-2 rounded-lg">
                <span>Cupón de descuento ({couponDiscountPercentage}%)</span>
                <span>-{formatPrice(cartSubtotal * (couponDiscountPercentage/100))}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center text-sm pt-1">
              <div className="flex flex-col">
                <span className="text-gray-600 font-medium">
                  {deliveryMethod === 'delivery' && 'Envío a domicilio'}
                  {deliveryMethod === 'pickup' && 'Retiro en el local'}
                  {deliveryMethod === 'uber_moto' && 'Mando Uber Moto'}
                  {deliveryMethod === 'whatsapp' && 'Coordinar envío'}
                </span>
                {deliveryMethod === 'delivery' && shippingEstimate && (
                  <span className="text-[11px] text-gray-400">
                    📍 {shippingEstimate.distanceKm} km desde el local
                  </span>
                )}
                {deliveryMethod === 'uber_moto' && (
                  <span className="text-[11px] text-amber-600 font-semibold">
                    A cargo del cliente
                  </span>
                )}
              </div>
              <span className="font-bold">
                {shippingCost === 0 ? (
                  <span className="text-green-600 uppercase tracking-widest text-[11px]">
                    {deliveryMethod === 'delivery' ? 'Gratis' : 'Sin costo'}
                  </span>
                ) : (
                  formatPrice(shippingCost)
                )}
              </span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 flex justify-between items-end">
            <span className="text-base text-gray-700 font-semibold">Total a pagar</span>
            <span className="text-2xl font-black text-black">{formatPrice(finalTotal)}</span>
          </div>
          
          <TePuedeInteresar />
        </div>
      </div>

    </div>
  )
}

function CheckoutProductImage({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  const [imageFailed, setImageFailed] = useState(false)

  if (!imageUrl || imageFailed) {
    return (
      <div className="flex flex-col items-center gap-1 text-gray-400">
        <PackageSearch size={18} strokeWidth={1.5} />
        <span className="text-[10px]">Sin foto</span>
      </div>
    )
  }

  return <img src={imageUrl} alt={name} onError={() => setImageFailed(true)} className="max-h-full object-contain mix-blend-multiply" />
}
