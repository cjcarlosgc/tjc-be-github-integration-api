# WI-GH-002 — Revisión técnica de contrato y seguridad

**Fecha:** 2026-09-25
**Reviewer:** `oauth_contract_review` (revisión delegada de contrato/seguridad; no es la revisión independiente final del WI).
**Estado:** `APPROVED` para el alcance técnico revisado.

## Resultado

- El bearer Core→GH se valida separadamente del provider token; este último se utiliza solo en discovery y no persiste ni se registra.
- Las rutas, DTOs, respuestas normalizadas, errores y redacción de respuestas siguen GH-INTEROP-1.0; no se exponen tokens ni cuerpos crudos de GitHub.
- Permisos, roles y tipos de instalación desconocidos fallan cerrados como `UNVERIFIABLE`.
- Se corrigió el hallazgo M2 de paginación potencialmente ilimitada. `listBranches` limita la operación a 10 páginas/30 s, propaga el tiempo restante al cliente y devuelve `UNVERIFIABLE` sin parciales. Hay pruebas para el límite de páginas y el plazo total.
- La prueba `pnpm test` pasa con 38/38.
- El espejo local `GH-INTEROP-1.0` coincide byte por byte con Core.

## Coordinación y límites

- `CS-GH-20260925-001` se publicó en el outbox local, dirigido a Core. Permanece `C-PENDING`: Core aún debe ratificar el tratamiento interno `403/429 → GITHUB_UPSTREAM_UNAVAILABLE`; esto no autoriza ni realiza el cutover del consumidor.
- No se hicieron llamadas live ni cambios a permisos externos. La especificación de Core indica que GitHub App aún no tiene `Members: read`, por lo que endpoints de membresía/owners no se validaron contra una organización real. Habilitar ese permiso requiere coordinación externa y está fuera de este WI.
- El reviewer aprueba el código y la resolución del hallazgo técnico, no el alcance/arquitectura final ni el cierre. La revisión humana del WI sigue pendiente.
