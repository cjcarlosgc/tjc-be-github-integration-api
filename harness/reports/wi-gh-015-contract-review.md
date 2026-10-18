Modelo: contract-reviewer · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo low

# WI-GH-015 — Revisión contractual independiente

Veredicto: **APPROVED** (con un hallazgo P3 documental, no bloqueante).

## (a) Espejos frente a Core (solo lectura)

`cmp` idéntico y SHA-256 iguales a los esperados:

| Artefacto | SHA-256 |
| --- | --- |
| `system-contract.md` (SYSTEM-2.13) | `b70f9358…0444` |
| `interoperability-contract.md` (INTEROP-2.17) | `b9ed40dc…ea05` |
| `github-integration-contract.md` (GH-INTEROP-1.8) | `6c553ee8…565a` |
| árbol `spec/contracts/schemas` | `c45e4513…1b31` (local = Core) |

## (b) ffc890b — ErrorEnvelope

- `app/src/error-envelope.ts` emite `statusCode`, `code`, `message`, `details: null`, `correlationId`, `timestamp` ISO, `path` sin query y `retryable`. Cubre los 7 campos requeridos de `error-envelope.schema.json` más `retryable` opcional; el contrato (GH-INTEROP-1.8, sección de errores) exige `retryable` siempre presente: cumple.
- `internal-error.filter.ts` y `request-body-parsers.ts` usan solo `buildErrorEnvelope`; no hay otra vía de emisión. `message` neutral, sin texto crudo de GitHub.
- Aditivo: los campos previos (`code`, `message`, `retryable`, `correlationId`) conservan nombre, tipo y significado. El cliente de Core (`github-integration.client.ts`, líneas 223-246) solo exige `code` string y `retryable` boolean, e ignora lo demás; INTEROP-2.17 §4 manda a los consumidores ignorar campos desconocidos. Sin impacto en Core ni Console.

## (c) a3ebecf — 4xx no previstos

Antes: cualquier `HttpException` 4xx no mapeada caía en `upstreamUnavailable()` (503 `GITHUB_UPSTREAM_UNAVAILABLE`, `retryable: true`). Ahora: 413 -> `INVALID_REQUEST` 413; el resto de 4xx -> `INVALID_REQUEST` 400, `retryable: false`.

- 413: respaldado explícitamente (tabla de errores del contrato: `INVALID_REQUEST` 400, 413; también la sección de webhooks, `413 INVALID_REQUEST`).
- 405/406/415 y similares: el contrato no los enumera. `INVALID_REQUEST` se define como "DTO/path inválido"; mapearlos a 400 `INVALID_REQUEST` es coherente con ese espíritu y con el principio de no devolver errores crudos, pero no hay texto explícito. No requiere DEC: es un caso de error de cliente dentro de un código existente, sin ruta, código ni estado nuevos, y GH-INTEROP-1.8 declara "no cambia rutas, códigos ni reintentos".
- Efecto en Core: la tabla de Core (`INVALID_REQUEST`: status [400, 413], `retryable: false`) acepta exactamente este par; ya no recibe 503 reintentable para una petición mal formada (antes habría reintentado inútilmente). Ningún par code/status/retryable nuevo; Core no se rompe. Un 5xx real sigue siendo 503 reintentable.
- Nota: el 404 genérico (ruta inexistente) sigue siendo `GITHUB_RESOURCE_NOT_FOUND`, preexistente y válido para Core.

## (d) Tipos generados

`pnpm contracts:check` (`generate-contract-types.mjs --check`) pasa: tipos al día.

## Hallazgos

- P3: el contrato no menciona 405/406/415. Sugerencia (no bloqueante): en la próxima versión de GH-INTEROP, aclarar que todo 4xx de cliente no enumerado se emite como `INVALID_REQUEST` 400 no reintentable. Requiere cambio en Core (productor del contrato), no aquí.

## Handoff

- status: APPROVED
- findings: P3 anterior; sin P0-P2.
- blockers: ninguno.
- filesAffected: ninguno modificado por la revisión (solo este reporte).
- evidence: `cmp` y SHA-256 de los 3 contratos y del árbol de esquemas contra Core; lectura de `error-envelope.ts`, `internal-error.filter.ts`, `request-body-parsers.ts`, `error-envelope.schema.json`; `git show a3ebecf`; `github-integration.client.ts` de Core; `pnpm contracts:check` exit 0.
- recommendedNextStep: el leader continúa con el cierre del WI (reviewer independiente, resolución de `CS-CORE-20261018-001`); opcionalmente registrar el P3 como nota para Core.
