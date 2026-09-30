export interface BusinessBankConfig {
  titular: string
  alias: string
  cvu: string
  cbu?: string
  banco?: string
}

/**
 * Datos bancarios oficiales del negocio para transferencias.
 * Se pueden sobreescribir desde variables de entorno sin modificar código.
 */
export const BUSINESS_BANK_CONFIG: BusinessBankConfig = {
  titular: process.env.NEXT_PUBLIC_TRANSFER_TITULAR || 'Cristian Benjamin Corbalan',
  alias: process.env.NEXT_PUBLIC_TRANSFER_ALIAS || 'corbalan.cristian.b',
  cvu: process.env.NEXT_PUBLIC_TRANSFER_CVU || '0000003100071749630487',
  cbu: process.env.NEXT_PUBLIC_TRANSFER_CBU || '0000003100071749630487',
  banco: 'Mercado Pago / Banco'
}
