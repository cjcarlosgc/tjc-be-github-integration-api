# WI-GH-006 — Evidencia de implementación

**Fecha:** 2026-09-26
**Estado:** evidencia de código y checks locales registrada. El WI permanece `W-IN_PROGRESS`; no es una aprobación ni un cierre.

## Resultado comprobado en fuente

- Se añadieron rutas de usuario bajo `/v1/github/*` para App info, discovery, verificación de acceso y ramas. No reutilizan las rutas `/internal/v1/github/*` ni sus credenciales de servicio.
- Las rutas exigen JWT Supabase y fail-closed ante rechazo, error o timeout de autorización. Integration transmite a Core solo el JWT de usuario y hechos GitHub allowlisted, y no envía provider token, installation token ni secretos a Core.
- Core decide autorización de dominio/workspace/Project y emite evidencia de binding breve firmada; Integration no persiste el binding. Console presenta la evidencia a Core y no impone installationId ni rol.
- CORS usa allowlist, rechaza HTTP loopback en producción y acepta HTTPS. El parser JSON de 136 MB está limitado a `proposal-blobs` y autentica el bearer de servicio antes del parseo; JSON general y finalización conservan 100 KB. El ingress webhook usa parser raw con límite independiente de 25 MB.
- El flujo interno Core→Integration→GitHub, el webhook GitHub→Integration→Core y las operaciones de pipeline existentes se conservan. El cliente GH→Core rechaza respuestas con campos fuera de su contrato. No se modificó Sandbox ni se hizo deploy/configuración externa/cutover.

## Contract Sync y Harness

`CS-GH-20260926-001` está publicado en el outbox de GH para Core y Console. Los consumidores ya lo importaron en `C-PENDING`; sus revisiones y resolución siguen pendientes, no se ha cambiado su estado. Los Harnesses GH y Console ahora registran tiempo local de importación, conservan el ciclo de evidencia y preservan snapshots cerrados frente a eventos posteriores.

## Verificación reproducible

- GitHub Integration: `pnpm test`, `pnpm lint` y `pnpm build` pasaron; 16 archivos, 120/120 pruebas. Las nuevas pruebas HTTP cubren sesión/DTO/no-store y el cliente cubre bearers separados, no reenvío de provider token, DENY y fallos fail-closed.
- Harness GH: `node scripts/sdd-check.mjs`, `node harness/validate-work-items.mjs`, `node harness/validate-harness.mjs` y `node harness/validate-completions.mjs` pasaron. Las pruebas cubren importación, lifecycle, cierre inmutable y validación de publicación namespaced.
- `GH-INTEROP-1.1` se mantiene espejo byte por byte de las copias Core y Console.

## Pendiente

La revisión técnica delegada halló un vacío P2 en las pruebas HTTP de estas rutas; se añadió cobertura y la revisión focalizada posterior confirmó 11/11 pruebas dirigidas y no encontró regresión/bypass. Esto no sustituye tu visto bueno personal: `independentReviewPassed` y los demás gates de cierre siguen `G-NOT_RUN`. No pasar a `W-DONE`, no hacer push ni declarar deploy/cutover.
