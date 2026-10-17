// P022: seis apariencias para la misma tienda, sin modificar compras ni datos de usuario.
export type StorefrontTheme = 'clasico' | 'premium' | 'perla' | 'aurora' | 'salvia' | 'malva'
export const THEME_SETTING_KEY = 'storefront_theme'
export const DEFAULT_STOREFRONT_THEME: StorefrontTheme = 'clasico'
export function isStorefrontTheme(value: unknown): value is StorefrontTheme {
  return value === 'clasico' || value === 'premium' || value === 'perla' || value === 'aurora' || value === 'salvia' || value === 'malva'
}
export function parseStorefrontTheme(value: unknown): StorefrontTheme {
  return isStorefrontTheme(value) ? value : DEFAULT_STOREFRONT_THEME
}
