# Plan — Bootstrap del servicio

## Diseño

- Reutilizar NestJS/TypeScript y el gestor pnpm del Core, revisando versión y dependencias al crear el paquete.
- Configuración centralizada, schema validado al arranque, con logs y excepciones que no expongan valores.
- Health controller con dos resultados diferenciados: liveness y readiness local. Readiness no hace ping a GitHub ni a Core.
- La configuración obligatoria de este corte se limita a `PORT` (opcional con default seguro) y `CORE_TO_GITHUB_INTEGRATION_TOKEN`, que autentica las operaciones privadas entrantes. Credenciales GH→Core, GitHub App y webhook se agregan con los cortes que las usan; no bloquean el health local antes de existir ese comportamiento.
- Mantener el bootstrap sin integración real externa, persistencia o llamadas GitHub. Las pruebas unitarias cubren la lógica local de config/health.

## Riesgos y límites

- No confundir `ready` con credenciales/servicios externos accesibles; la disponibilidad remota se observará en solicitudes y métricas operativas cuando el contrato lo especifique.
- La especificación contractual GH ya define DTOs, errores y campos `installationId`; este WI no altera esas rutas/DTOs.
- No realizar deploy, secret-management externo, DNS, creación/modificación de App o cambios en Core/Supabase/Sandbox.

## Verificación

Definir comandos reproducibles de lint, tests, build y health/e2e al materializar el paquete. Ejecutar Harness V3 y SDD check antes de entrega; registrar resultados en evidencia del WI.
