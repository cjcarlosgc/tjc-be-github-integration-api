# Autorización de alcance — WI-GH-021, motivos de UNVERIFIABLE en logs (GitHub Integration)

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

**Fecha:** 2026-10-24 (America/Lima)
**Origen:** [TN]-Cross relevó la indicación de Core (`WI-CORE-087`, `harness/reports/wi-core-087-indicacion-integration.md`): `ACCESS_REVERIFY` de Core marca accesos `UNVERIFIABLE` sin que se sepa por qué. El relevo de cross no es aprobación; el alcance lo aprobó el usuario en el chat de esta sesión.

## Respuesta del usuario

Ante la propuesta de `WI-GH-021` (STANDARD, `contractImpact=false`, `ST-GH-023`), el usuario eligió en el chat «Aprobar (solo core)».

## Alcance aprobado (y solo este)

En `app/src/github/github-app-auth.service.ts`, `listOrganizationInstallations()` registra un WARN por motivo en cada punto que devuelve `{status:'UNVERIFIABLE'}`: `JWT_NO_FIRMABLE`, `GITHUB_SIN_RESPUESTA` (con duración), `GITHUB_HTTP_<estatus>`, `RESPUESTA_NO_ES_LISTA`, `INSTALACION_INVALIDA:<tipo>`, `DEMASIADAS_PAGINAS`. Sin cuerpos de respuesta, JWT, clave, variables, ids ni logins. Pruebas por motivo y una de no fuga.

## Fuera de alcance (no aprobado)

Los mismos motivos en `getOrganizationMembership`/`listOrganizationOwners` y la comprobación de que `/health` parsea la clave de la App; el arranque en frío (infraestructura o decisión de Core). Sin cambio de contrato ni de wire; push, PR y merge solo por la autorización permanente al cerrar el WI.
