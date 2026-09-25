# WI-GH-004 — inicio de implementación

**Fecha:** 2026-09-25  
**Estado:** `W-IN_PROGRESS`

- La especificación, el plan, las subtareas y la revisión pre-tarea quedaron consolidados en `65e102f` (`Refs: HU16`).
- La estrategia excepcional de aprobación al final de toda la migración está documentada en `harness/reports/gh-migration-final-approval.md`; este WI conserva sus revisiones independientes, de contrato y gates.
- `DEC-GH-001` no bloquea este trabajo. `DEC-VAL-001` no bloquea el desarrollo ni las pruebas aisladas; limita ingesta/despliegue con código empresarial y evidencia empresarial, fuera del WI.
- Contract Sync `start` e `implementation-delivery` se registraron sin eventos entrantes relevantes.
- Se publicó `CS-GH-20260925-003` a Core para aclarar la frase descriptiva del preflight frente al DTO normativo `{ status: 'READY' }`. Sigue `C-PENDING`; no modifica el contrato local/canónico, no impide esta implementación local y debe resolverse antes del cutover.
- El usuario autorizó completar la migración en este modo excepcional; no se hará push ni cutover sin confirmación explícita.

Este reporte registra el arranque y el Contract Sync publicado; no acredita implementación, pruebas ni cierre.
