# WI-GH-005 — implementación y comprobaciones

**Fecha:** 2026-09-25  
**Estado:** WI-GH-005 cerrado localmente; la integración end-to-end y el cutover siguen pendientes de WI-CORE-003.

## Alcance implementado

- Se añadió `POST /integrations/github/webhooks` con parser raw exclusivo de la ruta, límite de 25 MB y respuesta neutral `413 INVALID_REQUEST` por exceso.
- La firma HMAC-SHA256 se compara en tiempo constante sobre los bytes crudos; se deshabilitó la inflación HTTP y la conversión UTF-8/parseo JSON ocurren solo después de verificarla. `receivedAt` se captura antes de leer el body. Firmas incorrectas responden `401`; metadata ausente, JSON inválido o campos requeridos inválidos responden `400`.
- Se mapean los eventos allowlisted de `GH-INTEROP-1.0` al DTO `NormalizedWebhookEvent`; campos extra del proveedor nunca se reenvían. Los eventos desconocidos producen `IGNORED` sin persistir ni filtrar el payload.
- El cliente GH→Core usa `GITHUB_INTEGRATION_TO_CORE_TOKEN`, propaga `X-Correlation-ID`, resuelve la ruta de destino sin errores de slash final, limita la llamada a 8 s y acepta solo respuestas `200`/`202` coherentes con delivery/duplicate. Devuelve solo los cuatro campos contractuales y no refleja propiedades extra de Core. Fallo, timeout o respuesta inválida devuelve `503 CORE_WEBHOOK_UNAVAILABLE` neutral para habilitar el reintento de GitHub.
- `/health` requiere la configuración local de ambos sentidos de autenticación y del webhook, sin realizar llamadas de red.
- Se documentó que el receptor `/internal/v1/github/webhook-events` del lado Core pertenece a `WI-CORE-003`; su ausencia impide integración end-to-end/cutover, pero no las pruebas locales de GH.

## Evidencia reproducible

- `cd app && pnpm lint` — aprobado.
- `cd app && pnpm test` — 106/106 pruebas aprobadas, sin servicios externos.
- `cd app && pnpm build` — aprobado.
- `node scripts/sdd-check.mjs` — aprobado.
- `node harness/validate-work-items.mjs` — aprobado.
- `node harness/validate-harness.mjs` — aprobado.
- `node harness/validate-completions.mjs` — aprobado.
- `git diff --check` — aprobado.
- Contract Sync `start`, `implementation-delivery` y `before-review` — sin eventos entrantes relevantes.

La prueba HTTP integrada cubre cuerpo exactamente al máximo configurado y uno byte por encima; el exceso se rechaza antes de invocar el controlador. Las llamadas a Core usan fetch simulado. `GH-INTEROP-1.0` quedó sincronizado byte por byte con el canónico Core (SHA-256 `98662fa978968e14265ba9d6d208f5f2cc87015a6f8d58d47086cc7ce7262d9`); los cinco Contract Sync relacionados permanecen `C-ACKNOWLEDGED`, pues Core aún no implementa los cambios. No hubo llamadas a GitHub real, modificaciones en Core/Console/Sandbox, cambios de credenciales, webhook registrado, despliegue ni cutover. La aprobación humana global se difiere al final de la migración conforme a `harness/reports/gh-migration-final-approval.md`.
