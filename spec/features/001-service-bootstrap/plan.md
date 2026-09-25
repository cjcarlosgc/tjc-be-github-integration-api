# Plan — Bootstrap del servicio

## Diseño

- Reutilizar NestJS/TypeScript y el gestor pnpm del Core, revisando versión y dependencias al crear el paquete.
- Configuración centralizada, schema validado al arranque, con logs y excepciones que no expongan valores. `PORT` tiene default; bearer interno ausente no bloquea liveness pero hace fallar readiness.
- Health controller con dos resultados diferenciados: el proceso responde a conexión TCP para liveness; `GET /health` informa readiness local por HTTP (200/503). Readiness no hace ping a GitHub ni a Core. No se usa el estado HTTP de `/health` como liveness probe.
- La ruta operacional de contrato es `GET /health`; el cuerpo solo presenta `status` y checks neutrales de liveness/readiness, no valores ni nombres de secretos.
- El shape JSON y el código HTTP son detalles operativos locales de este proceso, no DTO del contrato Core↔GH: Core no llama este endpoint. Se conserva la única ruta `/health`; cualquier consumidor programático futuro requerirá especificación/contract sync antes de depender de ese shape.
- La configuración obligatoria de este corte se limita a `PORT` (opcional con default seguro) y `CORE_TO_GITHUB_INTEGRATION_TOKEN`, que autentica las operaciones privadas entrantes. Si el bearer está ausente, el proceso sigue vivo pero readiness devuelve `503`. Credenciales GH→Core, GitHub App y webhook se agregan con los cortes que las usan.
- Mantener el bootstrap sin integración real externa, persistencia o llamadas GitHub. Las pruebas unitarias cubren la lógica local de config/health.

## Riesgos y límites

- No confundir `ready` con credenciales/servicios externos accesibles; la disponibilidad remota se observará en solicitudes y métricas operativas cuando el contrato lo especifique.
- La especificación contractual GH ya define DTOs, errores y campos `installationId`; este WI no altera esas rutas/DTOs.
- No realizar deploy, secret-management externo, DNS, creación/modificación de App o cambios en Core/Supabase/Sandbox.

## Verificación

Definir comandos reproducibles de lint, tests, build y health/e2e al materializar el paquete. Ejecutar Harness V3 y SDD check antes de entrega; registrar resultados en evidencia del WI.
