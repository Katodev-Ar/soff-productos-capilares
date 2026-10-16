export interface BusinessBankConfig {
  titular: string
  alias: string
  cvu: string
  cbu?: string
  banco?: string
}

/**
 * Cuenta bancaria configurada exclusivamente por variables de entorno.
 * Los datos de una cuenta receptora son públicos en el checkout;
 * las credenciales secretas NO deben tener prefijo NEXT_PUBLIC_.
 *
 * NO establecer datos bancarios fijos como valores predeterminados:
 * una cuenta distinta a la del titular ocasionaría transferencias erróneas.
 */
export const BUSINESS_BANK_CONFIG: BusinessBankConfig = {
  titular: process.env.NEXT_PUBLIC_BUSINESS_TITULAR?.trim() || process.env.NEXT_PUBLIC_TRANSFER_TITULAR?.trim() || 'Cristian Benjamin Corbalan',
  alias: process.env.NEXT_PUBLIC_BUSINESS_ALIAS?.trim() || process.env.NEXT_PUBLIC_TRANSFER_ALIAS?.trim() || 'corbalan.cristian.b',
  cvu: process.env.NEXT_PUBLIC_BUSINESS_CVU?.trim() || process.env.NEXT_PUBLIC_TRANSFER_CVU?.trim() || '0000003100071749630487',
  cbu: process.env.NEXT_PUBLIC_BUSINESS_CBU?.trim() || process.env.NEXT_PUBLIC_TRANSFER_CBU?.trim() || '0000003100071749630487',
  banco: process.env.NEXT_PUBLIC_BUSINESS_BANCO?.trim() || 'Mercado Pago'
}

/** Exige titular, alias y al menos un identificador válido de 22 dígitos. */
export const BANK_CONFIG_READY = Boolean(
  BUSINESS_BANK_CONFIG.titular &&
  BUSINESS_BANK_CONFIG.alias &&
  [BUSINESS_BANK_CONFIG.cvu, BUSINESS_BANK_CONFIG.cbu].some((n) => /^\d{22}$/.test(n ?? ''))
)
