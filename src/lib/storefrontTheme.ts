// P020: valores de apariencia; nunca provienen de datos de precios o usuarios.
export type StorefrontTheme = 'clasico' | 'premium'
export const THEME_SETTING_KEY = 'storefront_theme'
export const DEFAULT_STOREFRONT_THEME: StorefrontTheme = 'clasico'
export function isStorefrontTheme(value: unknown): value is StorefrontTheme {
  return value === 'clasico' || value === 'premium'
}
export function parseStorefrontTheme(value: unknown): StorefrontTheme {
  return isStorefrontTheme(value) ? value : DEFAULT_STOREFRONT_THEME
}
