# WI-GH-002 — Evidencia de implementación

**Fecha:** 2026-09-25
**Estado:** `W-DONE` tras aprobación humana. El Contract Sync dirigido a Core sigue pendiente del consumidor; no hay cutover, despliegue ni push.

## Cambios

- Se extrajeron en `app/` las operaciones de App info, discovery OAuth temporal, instalación, metadatos/permisos de repositorio, instalaciones/membresía/owners de organización y ramas.
- La credencial interna Core→GH se valida en todas las rutas privadas. El provider token de OAuth se usa solo en la petición de discovery; no se almacena, registra ni devuelve.
- Las respuestas y errores son neutrales; no se propagan bodies ni mensajes de GitHub. La configuración de App participa en readiness local sin consultar GitHub.
- Branches se obtiene completa en un máximo de 10 páginas o 30 segundos. Si no termina dentro del límite, devuelve `UNVERIFIABLE` sin contenido parcial.
- Core conserva autorización de Project, `RepositoryBinding`, persistencia y efectos de dominio. No se cambió Core, Console ni Sandbox; tampoco la API pública Core–Console ni el consumidor Core.

## Verificación reproducible

En `app/`:

- `pnpm lint` — correcto.
- `pnpm test` — 38 pruebas en 6 archivos; todas aprobadas, incluidas límites de páginas/tiempo, token OAuth, permisos desconocidos, roles desconocidos y errores no filtrados.
- `pnpm build` — correcto.

En la raíz:

- `node harness/validate-work-items.mjs`, `node harness/validate-harness.mjs`, `node scripts/sdd-check.mjs` y `git diff --check` — correctos.
- `GH-INTEROP-1.0` local coincide byte por byte con el contrato canónico de Core.
- Contract Sync `start`, `implementation-delivery` y `before-review` están registrados sin eventos entrantes relevantes pendientes.
- Se publicó `CS-GH-20260925-001` para Core: solicita ratificar el manejo interno de `403/429` de discovery; el evento no pide cutover ni modificación de Core en este WI.

## Límites de validación

- No se hicieron llamadas reales a GitHub ni se cambiaron permisos/configuración externa de la GitHub App.
- La especificación vigente de Core advierte que la App aún no cuenta con `Members: read`; por ello, membresías/owners se validaron con pruebas aisladas, no contra una organización real. La habilitación de ese permiso requiere coordinación fuera de este corte.
- La revisión técnica señaló la paginación potencialmente ilimitada de ramas; se acotó, se añadieron pruebas de límite de páginas y vencimiento del plazo total, y la reauditoría confirmó que el hallazgo de implementación quedó resuelto. La aprobación final del contract-reviewer para este último test aún está pendiente.

Este reporte no representa revisión humana ni cierre de WI-GH-002.
