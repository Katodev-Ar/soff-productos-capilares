import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Probador virtual de tinturas | SOFF',
  description: 'Simulá tonos de cabello y consultá disponibilidad y precios actualizados de las tinturas disponibles en SOFF. Resultado ilustrativo.',
}

export default function ProbadorLayout({ children }: { children: React.ReactNode }) { return children }
