# Autorización de alcance — Fase 2, espejos de contrato (GitHub Integration)

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

**Fecha:** 2026-10-13 (America/Lima)
**Autoriza:** usuario (Jean), en el chat de la sesión Cross de este repositorio.

Pregunta formulada al usuario: «¿Qué correcciones de Fase 2 apruebas para que las implemente ya? (ninguna cambia ranking, R-PHP ni métricas)».

Opción elegida por el usuario: «Espejos de contrato (Integration)», descrita como: «WI-GH-013: copiar byte a byte SYSTEM-2.12 e INTEROP-2.15 desde Core, actualizar AGENTS.md y acusar dos eventos pendientes. Solo documentos, riesgo nulo.»

Objetivo general declarado por el usuario: «seguir puliendo lo ya construido; no contradecir el paper ni la tesis».

## Alcance aprobado (y solo este)

`WI-GH-013` (HARNESS, documental): copiar `system-contract.md` e `interoperability-contract.md` desde Core, actualizar las referencias documentales vigentes a las versiones, y acusar y resolver los eventos Contract Sync pendientes dirigidos a este componente. Diagnóstico de origen: `harness/reports/fase2-espejos-contractuales-diagnostico-2026-10-13.md`.

## Límites

Sin cambios en `app/`, `GH-INTEROP-1.7` ni decisiones `PENDING`/`PROPOSED`; sin editar otros repositorios; sin push, PR, merge, despliegue ni infraestructura externa. Esta autorización no cubre ninguna otra corrección de Fase 2. Si el análisis detectara algo que exija cambiar `app/` o `GH-INTEROP`, se marca `DECISION_REQUIRED` y no se implementa.
