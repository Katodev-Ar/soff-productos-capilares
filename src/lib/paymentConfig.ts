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
  titular: process.env.NEXT_PUBLIC_BUSINESS_TITULAR?.trim() ?? '',
  alias: process.env.NEXT_PUBLIC_BUSINESS_ALIAS?.trim() ?? '',
  cvu: process.env.NEXT_PUBLIC_BUSINESS_CVU?.trim() ?? '',
  cbu: process.env.NEXT_PUBLIC_BUSINESS_CBU?.trim() ?? '',
  banco: process.env.NEXT_PUBLIC_BUSINESS_BANCO?.trim() ?? ''
}

/** Exige titular, alias y al menos un identificador válido de 22 dígitos. */
export const BANK_CONFIG_READY = Boolean(
  BUSINESS_BANK_CONFIG.titular &&
  BUSINESS_BANK_CONFIG.alias &&
  [BUSINESS_BANK_CONFIG.cvu, BUSINESS_BANK_CONFIG.cbu].some((n) => /^\d{22}$/.test(n ?? ''))
)
