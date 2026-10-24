# Autorización de alcance — WI-GH-019 y WI-GH-020 (GitHub Integration)

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

**Fecha:** 2026-10-24 (America/Lima)
**Origen:** la sesión [TN]-Cross pidió importar `CS-CORE-20261024-001` (SYSTEM-2.15 / INTEROP-2.20 / GH-INTEROP-1.9, `breaking=false`, `sourceRevision` `208c3bdf…`, `WI-CORE-079`) y validar lo que emite el normalizador de webhooks contra el esquema canónico (CT-01-A5, mitad de Integration). El relevo de cross no es aprobación; el alcance lo aprobó el usuario en el chat de esta sesión.

## Respuesta del usuario

Ante la propuesta de dos WI en orden (WI-GH-019 re-espejo y WI-GH-020 validación del normalizador), el usuario eligió en el chat «Aprobar ambos».

## Alcance aprobado (y solo este)

- **WI-GH-019 (`ST-GH-021`):** importar y acusar el evento; copiar byte a byte los tres contratos y `spec/contracts/schemas/` desde Core; regenerar tipos y verificar; actualizar citas vigentes.
- **WI-GH-020:** pruebas que validan lo que emite el normalizador de webhooks y los ejemplos `github-webhook-event.*` contra el esquema `GithubWebhookEvent`; sin cambio de wire.
- Ambos: `contract-reviewer` y `reviewer` independiente (máximo 2 ciclos), `sdd-analyst`.

## Límites

Sin cambio de rutas, DTO, enums ni códigos de error; sin push, PR, merge ni infraestructura externa. Si hiciera falta código de producto o una `DEC`, el WI pasa a `W-DECISION_REQUIRED`.

## Ajuste de versión (2026-10-24)

Tras aprobar el alcance, Core publicó `CS-CORE-20261024-004` (`WI-CORE-089`, SYSTEM-2.16 / INTEROP-2.21, documental, `breaking=false`, destino `github-integration`), que supera a `CS-CORE-20261024-001` en `system-contract.md` e `interoperability-contract.md` (`github-integration-contract.md` GH-INTEROP-1.9 y `schemas` no cambian). Se preguntó al usuario en el chat y eligió «Re-espejar a 2.21/2.16»: `WI-GH-019` espeja directamente la versión vigente de Core (SYSTEM-2.16, INTEROP-2.21, GH-INTEROP-1.9) y acusa/resuelve `-001` y `-004`.
