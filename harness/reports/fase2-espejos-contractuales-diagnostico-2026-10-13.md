# Fase 2 — Diagnóstico de espejos contractuales en GitHub Integration

Modelo: leader · configurado claude-opus-5-5 · atendido unknown · esfuerzo medium

**Fecha:** 2026-10-13. **Alcance:** solo lectura; no se modificó ningún contrato, código ni estado del Harness. **Motivo:** objetivo de Jean «seguir puliendo lo ya construido, sin contradecir el paper ni la tesis».

## Hallazgo
`AGENTS.md` exige que las copias locales de `SYSTEM-*`, `INTEROP-*` y `GH-INTEROP-*` espejen byte a byte los contratos canónicos de Core. Hoy:

| Contrato | Core (canónico) | Integration (espejo) | ¿Iguales? |
|---|---|---|---|
| `system-contract.md` | SYSTEM-2.12 | SYSTEM-2.8 | No (75 líneas distintas) |
| `interoperability-contract.md` | INTEROP-2.15 | INTEROP-2.8 | No (45 líneas distintas) |
| `github-integration-contract.md` | GH-INTEROP-1.7 | GH-INTEROP-1.7 | Sí (byte a byte) |

Eventos en la bandeja de Integration aún `C-PENDING`: `CS-CORE-20261012-006` (INTEROP-2.9) y `CS-CORE-20261012-008` (SYSTEM-2.10 / INTEROP-2.10). Ambos piden «espejar si mantiene copia; sin cambio de código ni de GH-INTEROP». Los eventos posteriores de Core (2.11–2.15) se dirigieron a `console` y `sandbox`, no a `github-integration`.

## ¿Afecta al comportamiento de Integration?
No. Los cambios entre 2.8 y 2.15 son de Core y de sus consumidores:
- INTEROP-2.9: aclaraciones de `POST …/answers`, `continuationAttemptId`, `functionalBehaviorValidated`, `resultSummary` de OC11 (menciona el `UNVERIFIABLE` del compare, propiedad de Integration: descripción, sin cambio de contrato GH).
- INTEROP-2.13: `technicallyValidRate`, `assertionFailureCount` (experimentos).
- INTEROP-2.14 / 2.15: `dependencyContext` y `final` en la traza RAG.
- SYSTEM-2.9–2.12: decisiones de infraestructura del Sandbox y `DEC-VAL-002` (precedencia de estados; el Check neutral por `INFRASTRUCTURE_FAILURE` ya es el mapeo vigente).
`GH-INTEROP-1.7` no cambió: rutas, callback y coordinación de Checks siguen iguales.

## Riesgo de dejarlo así
Documental: `AGENTS.md` declara «rigen SYSTEM-2.8, INTEROP-2.8», lo que ya no es cierto para la fuente canónica; un agente que lea el espejo local trabajaría con un contrato atrasado. No hay riesgo funcional conocido.

## Propuesta (no ejecutada)
WI documental `WI-GH-013`, con el precedente de `WI-GH-008` y `WI-GH-010`:
1. Copiar byte a byte `system-contract.md` e `interoperability-contract.md` desde Core (revisión de `develop` vigente) y verificar con `cmp`.
2. Actualizar la frase de versiones en `AGENTS.md` y cualquier referencia documental vigente; `CHANGELOG.md` conserva la historia.
3. Acusar y resolver `CS-CORE-20261012-006` y `-008` con la evidencia del `cmp`.
4. Sin cambios en `app/`, sin push ni despliegue. Revisión independiente (Modo fuera de casa activo).

**Requiere:** aprobación de alcance de Jean (no la sustituye el Modo fuera de casa).
**No contradice** el paper ni la tesis: es higiene de trazabilidad contractual (OE1).
