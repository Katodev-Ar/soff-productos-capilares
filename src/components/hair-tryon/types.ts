export type ColorFamily =
  | 'todos'
  | 'castaños'
  | 'chocolates'
  | 'rubios'
  | 'cobrizos'
  | 'rojos'
  | 'fantasía'

export interface HairColorShade {
  id: string
  name: string
  toneCode: string
  family: ColorFamily
  hex: string
  description: string
  lightnessAdjustment: number // 0.0 to 1.0 (for lifting dark hair)
  // Identificador del producto: NUNCA guardar precios, stock o imagenes aqui.
  matchedProduct?: { id: string }
}

export type InputMode = 'camera' | 'upload' | 'sample'
