import type { ErrorEnvelope } from './contracts/generated/contract-types.js';

export interface ErrorEnvelopeInput {
  status: number;
  code: string;
  message: string;
  retryable: boolean;
  correlationId: string;
  /** URL original de la petición; solo se emite la ruta, sin query string. */
  originalUrl?: string;
}

/**
 * Construye el `ErrorEnvelope` canónico de la solución (INTEROP-2.18 §4, GH-INTEROP-1.8). GitHub Integration siempre
 * declara `retryable`; nunca incluye texto crudo de GitHub, tokens ni query strings.
 */
export function buildErrorEnvelope(input: ErrorEnvelopeInput): ErrorEnvelope {
  return {
    statusCode: input.status,
    code: input.code,
    message: input.message,
    details: null,
    correlationId: input.correlationId,
    timestamp: new Date().toISOString(),
    path: (input.originalUrl ?? '').split('?')[0] || '/',
    retryable: input.retryable,
  };
}
