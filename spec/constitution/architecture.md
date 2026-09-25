# Arquitectura del servicio

**Estado:** objetivo aprobado en `GH-INTEROP-1.0`; organización interna se confirma por WI.

## Fronteras

- Adaptadores de entrada: API interna para Core, endpoint público de webhooks y liveness/readiness.
- Aplicación: casos de uso GitHub (App/discovery/repositorios/branches/content/compare/Checks/publicación) y entrega del evento normalizado.
- Infraestructura: SDK/HTTP de GitHub, firma HMAC, configuración y cliente HTTPS de Core.
- GitHub Integration no mantiene base de datos de dominio ni lee/escribe tablas Core.
- No se introduce almacenamiento persistente de tokens de usuario ni GitHub App.

Los límites son responsabilidades, no una obligación de replicar nombres de clases del Core. Evitar dependencias circulares y facilitar el traslado incremental de código existente.

## Operación

- HTTPS y JSON entre Core y el servicio bajo `/internal/v1/github`.
- Core→GH y GH→Core usan bearers independientes.
- `X-Correlation-ID` se propaga a Core y GitHub cuando proceda; los logs redactan tokens, firma, body de webhook y URLs firmadas.
- Readiness valida solo configuración local requerida; no comprueba disponibilidad remota de GitHub/Core.
- La entrega webhook a Core es confirmada al emisor solo tras la respuesta contractual; ante fallo/timeout de Core, devolver `503` para habilitar reintento de GitHub.
