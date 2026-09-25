# WI-GH-001 — Evidencia de implementación

**Fecha:** 2026-09-25
**Estado:** `W-DONE` tras aprobación del usuario; no implica push, despliegue ni cutover.

## Cambios

- Se creó el paquete NestJS mínimo bajo `app/`, con `@nestjs/config`, configuración de puerto validada y sin dependencias de DB, Supabase, GitHub o Core.
- `GET /health` da `200` solo cuando está presente la credencial de servicio Core→GH; si falta, da `503` con liveness `ok` y readiness `not_ready`. El body no devuelve secretos.
- Liveness de infraestructura se verifica por TCP; readiness se consulta por HTTP. No se añadieron rutas fuera de `GET /health`.
- No hay acceso a GitHub, creación de JWT/installation tokens, recepción de webhooks, cambios a Core/Console/Sandbox, persistencia ni configuración externa.
- Tras cerrar WI-GH-001, la validación descubrió que el test de dependencia de WI-GH-002 todavía suponía que WI-GH-001 no estaba cerrado. Se corrigió solo el fixture del test para recrear ese estado anterior; ningún código de producto cambió.

## Verificación reproducible

En `app/`:

- `pnpm install --frozen-lockfile` — correcto.
- `pnpm lint` — correcto.
- `pnpm test` — 9 pruebas en 2 archivos; todas aprobadas.
- `pnpm build` — correcto.

Prueba HTTP local sobre el build:

- Sin bearer configurado: `GET /health` respondió `503` y `{"status":"not_ready","checks":{"liveness":"ok","readiness":"not_ready"}}`.
- Con un bearer efímero de prueba: respondió `200` y `{"status":"ok","checks":{"liveness":"ok","readiness":"ok"}}`; el valor no apareció en la respuesta ni en logs.
- El proceso escuchó localmente y se detuvo tras la prueba; no se dejó servidor en ejecución.

Harness:

- `node scripts/sdd-check.mjs` — correcto.
- `node harness/validate-harness.mjs` — correcto.
- Contract Sync `start` e `implementation-delivery` — sin eventos relevantes pendientes; ambos checkpoints registrados.
- Contract Sync `before-review` — sin eventos relevantes pendientes; checkpoint registrado.
- Contract Sync `before-done` — sin eventos relevantes pendientes; checkpoint registrado.
- `node harness/validate-work-items.mjs` — correcto (5 WIs); `node harness/validate-completions.mjs` — correcto (1 WI completado); `node harness/validate-harness.mjs` — correcto; `node scripts/sdd-check.mjs` y `git diff --check` — correctos.
- `app/`: `pnpm lint`, `pnpm test` (9/9) y `pnpm build` — correctos.

## Revisión y cierre

El usuario revisó el diff/evidencia y aprobó WI-GH-001; el gate humano y el límite de ciclos de revisión quedaron registrados en `wi-gh-001-review.md`. No se hizo push y no se modificó infraestructura.
