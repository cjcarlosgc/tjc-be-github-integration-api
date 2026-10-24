# Autorización de alcance — WI-GH-015, regularización retroactiva y re-espejo de INTEROP-2.17 (GitHub Integration)

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

**Fecha:** 2026-10-18 (America/Lima)
**Origen:** sesión [TN]-Cross pidió regularizar con WI propio, en la sesión de este repositorio, el trabajo que cross ejecutó con excepción puntual sobre Integration (commits e6beb06, b457533, ffc890b, a3ebecf), importar `CS-CORE-20261018-001` y re-espejar `interoperability-contract.md`. El mensaje de cross es un relevo, no aprobación; el alcance lo aprobó el usuario en el chat de esta sesión.

## Respuesta del usuario

Ante la propuesta de WI-GH-015 (STANDARD, `contractImpact=true`, `ST-GH-017`, reviewer independiente + contract-reviewer, máximo 2 ciclos, sin push), el usuario eligió en el chat la opción «Aprobar alcance».

## Alcance aprobado (y solo este)

1. Documentar retroactivamente los cuatro commits de cross (reporte declara retroactividad, cross como `implementationAgent`).
2. Importar `CS-CORE-20261018-001` (destino `github-integration`, `breaking=false`, `sourceRevision` `67519a20…`) y re-espejar `interoperability-contract.md` byte a byte (INTEROP-2.17); verificar que `system-contract.md`, `github-integration-contract.md` y `spec/contracts/schemas` coinciden con Core.
3. Regenerar y validar tipos/contract tests solo si el nuevo contrato lo exige.
4. Revisión independiente por el agente `reviewer` y `contract-reviewer` (hay contratos); máximo 2 ciclos.

## Límites

Sin ampliar el error envelope (INTEROP-2.18), sin tiempo real, sin tag `arch-v1.0`, sin editar otros repositorios, sin push, PR, merge ni infraestructura externa. Si el análisis exigiera una decisión `DEC` o un cambio de comportamiento adicional, el WI pasa a `W-DECISION_REQUIRED` sin implementarlo.
