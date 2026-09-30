'use client'

import React, { useState } from 'react'
import { Sparkles, Sliders, Palette, RefreshCw, SunMedium } from 'lucide-react'
import { ColorFamily, HairColorShade } from './types'
import { HAIR_COLOR_SHADES } from './hair-colors-data'

interface HairColorPaletteProps {
  selectedShade: HairColorShade | null
  onSelectShade: (shade: HairColorShade | null) => void
  intensity: number
  onChangeIntensity: (val: number) => void
  lightnessLift: number
  onChangeLightnessLift: (val: number) => void
  customHex: string
  onChangeCustomHex: (hex: string) => void
}

const FAMILIES: { id: ColorFamily; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'castaños', label: 'Castaños' },
  { id: 'chocolates', label: 'Chocolates' },
  { id: 'rubios', label: 'Rubios' },
  { id: 'cobrizos', label: 'Cobrizos' },
  { id: 'rojos', label: 'Rojos' },
  { id: 'fantasía', label: 'Fantasía' },
]

export default function HairColorPalette({
  selectedShade,
  onSelectShade,
  intensity,
  onChangeIntensity,
  lightnessLift,
  onChangeLightnessLift,
  customHex,
  onChangeCustomHex,
}: HairColorPaletteProps) {
  const [activeFamily, setActiveFamily] = useState<ColorFamily>('todos')

  const filteredShades =
    activeFamily === 'todos'
      ? HAIR_COLOR_SHADES
      : HAIR_COLOR_SHADES.filter((s) => s.family === activeFamily)

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value
    onChangeCustomHex(hex)
    onSelectShade({
      id: 'custom',
      name: 'Tono Personalizado',
      toneCode: 'Custom',
      family: 'fantasía',
      hex: hex,
      description: `Tono seleccionado a medida (${hex.toUpperCase()}).`,
      lightnessAdjustment: 0.35,
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-6">
      {/* Title & Natural hair toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-[#e88baf]" />
          <h2 className="font-bold text-gray-900 text-base">Elegí tu Color de Tintura</h2>
        </div>
        {selectedShade && (
          <button
            onClick={() => onSelectShade(null)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-500 transition px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-red-50 border border-gray-200"
          >
            <RefreshCw className="w-3 h-3" />
            Sin filtro (Original)
          </button>
        )}
      </div>

      {/* Family Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {FAMILIES.map((family) => {
          const isActive = activeFamily === family.id
          return (
            <button
              key={family.id}
              onClick={() => setActiveFamily(family.id)}
              className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {family.label}
            </button>
          )
        })}
      </div>

      {/* Swatches Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {filteredShades.map((shade) => {
          const isSelected = selectedShade?.id === shade.id
          return (
            <button
              key={shade.id}
              onClick={() => onSelectShade(shade)}
              className={`group flex flex-col items-center p-2 rounded-xl transition-all border ${
                isSelected
                  ? 'border-[#e88baf] bg-pink-50/40 shadow-sm ring-2 ring-[#e88baf]/30'
                  : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="relative">
                <span
                  className="w-11 h-11 rounded-full block border-2 border-white shadow-md transition-transform group-hover:scale-105"
                  style={{ backgroundColor: shade.hex }}
                />
                {isSelected && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#e88baf] text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">
                    ✓
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-gray-800 mt-2 text-center line-clamp-1">
                {shade.toneCode}
              </span>
              <span className="text-[10px] text-gray-500 text-center line-clamp-1 leading-tight">
                {shade.name}
              </span>
            </button>
          )
        })}

        {/* Custom Hex Picker Button */}
        <label className="group flex flex-col items-center p-2 rounded-xl transition-all border border-dashed border-gray-300 hover:border-[#e88baf] hover:bg-pink-50/20 cursor-pointer">
          <div className="relative">
            <div
              className="w-11 h-11 rounded-full border-2 border-white shadow-md flex items-center justify-center overflow-hidden"
              style={{
                background:
                  selectedShade?.id === 'custom'
                    ? customHex
                    : 'linear-gradient(135deg, #e88baf, #784ba0, #c04a1f)',
              }}
            >
              <input
                type="color"
                value={customHex}
                onChange={handleCustomColorChange}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
              <Sparkles className="w-5 h-5 text-white drop-shadow" />
            </div>
          </div>
          <span className="text-[11px] font-bold text-gray-800 mt-2 text-center">
            A Medida
          </span>
          <span className="text-[10px] text-gray-500 text-center">
            Elegir tono
          </span>
        </label>
      </div>

      {/* Adjusters: Intensity & Lightness */}
      <div className="pt-4 border-t border-gray-100 space-y-4">
        <div>
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-semibold text-gray-700 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-gray-500" />
              Intensidad del Tinte
            </span>
            <span className="text-gray-500 font-mono font-medium">
              {Math.round(intensity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.05"
            value={intensity}
            onChange={(e) => onChangeIntensity(parseFloat(e.target.value))}
            className="w-full accent-[#e88baf] cursor-pointer h-1.5 bg-gray-200 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>Sutil / Reflejo</span>
            <span>Medio</span>
            <span>Intenso / Cubritivo</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-semibold text-gray-700 flex items-center gap-1.5">
              <SunMedium className="w-3.5 h-3.5 text-amber-500" />
              Simular Aclarado (Base Decolorada / Oxidante)
            </span>
            <span className="text-gray-500 font-mono font-medium">
              {Math.round(lightnessLift * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={lightnessLift}
            onChange={(e) => onChangeLightnessLift(parseFloat(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-gray-200 rounded-lg"
          />
          <span className="text-[10px] text-gray-400 block mt-1">
            Aumentá este control si tu cabello es oscuro y querés visualizar tonos rubios o cobrizos claros.
          </span>
        </div>
      </div>
    </div>
  )
}
