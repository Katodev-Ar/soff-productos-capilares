'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import HairColorPalette from '@/components/hair-tryon/HairColorPalette'
import HairProductCard from '@/components/hair-tryon/HairProductCard'
import { HAIR_COLOR_SHADES } from '@/components/hair-tryon/hair-colors-data'
import { HairColorShade } from '@/components/hair-tryon/types'
import { Sparkles, ShieldCheck, HelpCircle, Lightbulb, Zap, Loader2 } from 'lucide-react'

const HairTryOnCanvas = dynamic(
  () => import('@/components/hair-tryon/HairTryOnCanvas'),
  {
    ssr: false,
    loading: () => (
      <div className="bg-neutral-900 rounded-3xl min-h-[420px] sm:min-h-[520px] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 text-[#e88baf] animate-spin mb-3" />
        <span className="text-xs text-white/70">Iniciando visor interactivo...</span>
      </div>
    ),
  }
)

export default function ProbadorColorPage() {
  // Default to 7.44 Cobrizo or 6.7 Chocolate
  const [selectedShade, setSelectedShade] = useState<HairColorShade | null>(
    HAIR_COLOR_SHADES.find((s) => s.id === '7-44-cobre-intenso') || HAIR_COLOR_SHADES[0]
  )
  const [intensity, setIntensity] = useState(0.85)
  const [lightnessLift, setLightnessLift] = useState(0.35)
  const [customHex, setCustomHex] = useState('#c04a1f')

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/60">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100/70 text-[#e88baf] text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            Prototipo Interactivo · Laboratorio Soff
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
            Probá tu Color de Cabello en{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e88baf] to-pink-600">
              Tiempo Real
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            Descubrí cómo te queda cada tintura de nuestro catálogo antes de comprarla.
            Usá tu cámara web, subí tu propia foto o probá con nuestros modelos de muestra.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-1 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              100% Privado en tu Navegador
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Zap className="w-4 h-4 text-amber-500" />
              Segmentación AI MediaPipe
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Sparkles className="w-4 h-4 text-[#e88baf]" />
              Conserva Brillo y Reflejos
            </span>
          </div>
        </div>

        {/* Workspace: Canvas Viewport + Controls & Product Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Visualizer (Left Column on Desktop) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            <HairTryOnCanvas
              selectedShade={selectedShade}
              intensity={intensity}
              lightnessLift={lightnessLift}
            />

            {/* Tip card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3 text-xs text-gray-600 shadow-xs">
              <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-gray-900 font-semibold block mb-0.5">
                  Consejo para el mejor resultado:
                </strong>
                Ubicá tu rostro con buena luz frontal y el cabello suelto. Si tu base es naturalmente oscura y querés visualizar tonos rubios o cobrizos claros, utilizá el control de <em>Simular Aclarado</em>.
              </div>
            </div>
          </div>

          {/* Right Column: Palette & Store Matching Product */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            {/* Color Palette */}
            <HairColorPalette
              selectedShade={selectedShade}
              onSelectShade={setSelectedShade}
              intensity={intensity}
              onChangeIntensity={setIntensity}
              lightnessLift={lightnessLift}
              onChangeLightnessLift={setLightnessLift}
              customHex={customHex}
              onChangeCustomHex={setCustomHex}
            />

            {/* Matched Product Card from Soff */}
            {selectedShade && <HairProductCard shade={selectedShade} />}
          </div>
        </div>

        {/* How It Works Explainer Section */}
        <div className="mt-16 bg-white rounded-3xl border border-gray-100 p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100">
            <HelpCircle className="w-6 h-6 text-[#e88baf]" />
            <h3 className="font-bold text-gray-900 text-lg">
              ¿Cómo funciona este probador de tinturas?
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-xl bg-pink-50 text-[#e88baf] font-bold flex items-center justify-center text-sm">
                1
              </div>
              <h4 className="font-semibold text-gray-900">Visión Artificial en tu Dispositivo</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Utilizamos el modelo especializado MediaPipe Hair Segmenter de Google (~760 KB) que corre directamente en el chip gráfico de tu celular o computadora mediante WebAssembly. Ninguna imagen o video viaja a servidores.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded-xl bg-pink-50 text-[#e88baf] font-bold flex items-center justify-center text-sm">
                2
              </div>
              <h4 className="font-semibold text-gray-900">Fusión HSL que Conserva Brillos</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                A diferencia de un filtro plano que parece una máscara pintada, nuestra tecnología de fusión mantiene el 100% de los reflejos, sombras y volumen de cada mechón de tu pelo real, cambiando únicamente el matiz del pigmento.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded-xl bg-pink-50 text-[#e88baf] font-bold flex items-center justify-center text-sm">
                3
              </div>
              <h4 className="font-semibold text-gray-900">Conexión con el Catálogo Real</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Cada tono está vinculado a las líneas profesionales que comercializamos en Soff (Fidelité Color Master, Luxury Iyosei, NOV, etc.). Si te gusta cómo te queda, podés añadir la tintura exacta directo al carrito de compras.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
