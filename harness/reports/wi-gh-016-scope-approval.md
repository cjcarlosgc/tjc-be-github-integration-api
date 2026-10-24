# Autorización de alcance — WI-GH-016, re-espejo de INTEROP-2.18 (GitHub Integration)

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

**Fecha:** 2026-10-21 (America/Lima)
**Origen:** la sesión [TN]-Cross pidió importar `CS-CORE-20261021-002` (INTEROP-2.18, `breaking=false`, `sourceRevision` `5c82853c…`) y re-espejar. El mensaje de cross es un relevo, no aprobación; el alcance lo aprobó el usuario en el chat de esta sesión.

## Respuesta del usuario

Ante la propuesta de WI-GH-016 (STANDARD, `contractImpact=true`, `ST-GH-018`), el usuario eligió en el chat la opción «Aprobar alcance».

## Alcance aprobado (y solo este)

Importar y acusar `CS-CORE-20261021-002`; copiar byte a byte `interoperability-contract.md` (INTEROP-2.18) y `spec/contracts/schemas/` desde Core; verificar que `system-contract.md` y `github-integration-contract.md` siguen idénticos; regenerar y verificar tipos; confirmar que los errores recibidos con `code` abierto se toleran, conservando la política `INVALID_REQUEST` propia; revisión por `contract-reviewer` y `reviewer` independiente (máximo 2 ciclos).

## Límites

Sin cambio de comportamiento ni de `GH-INTEROP`, sin impacto de §6.6 (no usa WebSocket), sin el WI de estabilidad, sin push, PR, merge ni infraestructura externa. Si hiciera falta código o una `DEC`, el WI pasa a `W-DECISION_REQUIRED` sin implementarlo.
