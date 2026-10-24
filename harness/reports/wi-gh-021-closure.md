# WI-GH-021 — Cierre

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

Cerrado el 2026-10-24 tras reviewer independiente APPROVED en 2 ciclos (ciclo 1: P3-1 prueba de no fuga vacía en el camino de error y P3-2 miembro inalcanzable del tipo, corregidos; ciclo 2 APPROVED, con una mutación temporal que confirma que la prueba detecta `error.message` en el log). `contractImpact=false`: sin contrato ni wire.

- `listOrganizationInstallations()` registra un WARN por motivo en sus siete retornos `UNVERIFIABLE`: `JWT_NO_FIRMABLE`, `GITHUB_SIN_RESPUESTA` (con `duracionMs`), `GITHUB_HTTP_<estatus>` (100..599, si no `GITHUB_HTTP_DESCONOCIDO`), `RESPUESTA_NO_ES_LISTA`, `INSTALACION_INVALIDA:<AUSENTE|Organization|OTRO>` y `DEMASIADAS_PAGINAS`. Sin cuerpos, JWT, clave, variables, ids, logins ni `error.message`; el valor devuelto no cambia.
- Validadores, lint, 265 pruebas, build y `contracts:check` en verde.

## Pendientes fuera del WI

- Sin `correlationId` en el log (la función no lo recibe).
- Opcionales no aprobados: mismos motivos en `getOrganizationMembership`/`listOrganizationOwners` y comprobación de la clave de la App en `/health`. El arranque en frío es infraestructura o decisión de Core.
