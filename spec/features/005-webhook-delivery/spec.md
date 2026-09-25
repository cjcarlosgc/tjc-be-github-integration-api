# Feature 005 — Webhooks verificados y entrega normalizada

**Estado:** planificada para `WI-GH-005`; no implementada.

## Valor relacionado

Habilita HU02, HU14 y HU16 al mantener actualizado el binding de repositorio y disparar análisis de PR sin confiar en eventos falsos ni perder reintentos.

## Alcance

- Recibir el webhook público en GitHub Integration, verificar HMAC-SHA256 sobre bytes crudos y normalizar campos allowlisted conforme a `GH-INTEROP-1.0`.
- Entregar a Core con credencial GH→Core independiente; responder a GitHub solo tras confirmación de Core.
- Fallo/timeout de Core produce 503 para habilitar retry de GitHub.
- No se crea un dominio persistente duplicado en GH.

## Fuera de alcance

La idempotencia durable, AnalysisRun, jobs y efectos de dominio permanecen en Core. Cambios de URL registrada, secretos productivos, deploy y cutover no están autorizados por este WI.
