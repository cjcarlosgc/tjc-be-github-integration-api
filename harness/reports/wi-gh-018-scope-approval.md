# Autorización de alcance — WI-GH-018, re-espejo de SYSTEM-2.14 e INTEROP-2.19 (GitHub Integration)

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

**Fecha:** 2026-10-21 (America/Lima)
**Origen:** la sesión [TN]-Cross pidió importar `CS-CORE-20261021-004` (informativo, `breaking=false`, `sourceRevision` `3d2383e4…`, `WI-CORE-076`, DEC-EXP-005 sobre configuración del LLM) y re-espejar. El relevo de cross no es aprobación; el alcance lo aprobó el usuario en el chat de esta sesión.

## Respuesta del usuario

Ante la propuesta de WI-GH-018 (STANDARD, `contractImpact=true`, `ST-GH-020`), el usuario eligió en el chat la opción «Aprobar alcance».

## Alcance aprobado (y solo este)

Importar y acusar `CS-CORE-20261021-004`; copiar byte a byte `system-contract.md` (SYSTEM-2.14) e `interoperability-contract.md` (INTEROP-2.19) desde Core; verificar que `github-integration-contract.md` y `spec/contracts/schemas/` siguen idénticos; actualizar las citas vigentes (AGENTS.md, spec/README.md, CHANGELOG) sin reescribir historia; `contract-reviewer` y `reviewer` independiente (máximo 2 ciclos).

## Límites

Documental: sin cambio de código ni de `GH-INTEROP-1.8`, sin push, PR, merge ni infraestructura externa. Si hiciera falta código o una `DEC`, el WI pasa a `W-DECISION_REQUIRED`.
