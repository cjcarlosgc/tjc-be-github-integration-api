# Arquitectura del servicio

**Estado:** topología aprobada en `GH-INTEROP-1.1`; WI-GH-006 en implementación fuente, revisión personal y cutover pendientes.

## Fronteras

- Adaptadores de entrada: API interna para Core, API de usuario autenticado para Console, endpoint público de webhooks y liveness/readiness.
- Aplicación: casos de uso GitHub (App/discovery/repositorios/branches/content/compare/Checks/publicación) y entrega del evento normalizado.
- Infraestructura: SDK/HTTP de GitHub, firma HMAC, configuración y cliente HTTPS de Core.
- GitHub Integration no mantiene base de datos de dominio ni lee/escribe tablas Core.
- No se introduce almacenamiento persistente de tokens de usuario ni GitHub App.
- Console consume la API de usuario solo para App info, discovery, verificación GitHub y ramas; autorización de Project/workspace y persistencia siguen en Core.

Los límites son responsabilidades, no una obligación de replicar nombres de clases del Core. Evitar dependencias circulares y facilitar el traslado incremental de código existente.

## Operación

- HTTPS y JSON entre Core y el servicio bajo `/internal/v1/github`; HTTPS y JSON con sesión humana en `/v1/github`.
- Core→GH y GH→Core usan bearers independientes.
- La API de usuario reenvía a Core el JWT Supabase solo como contexto de identidad; el provider token nunca cruza a Core.
- `X-Correlation-ID` se propaga a Core y GitHub cuando proceda; los logs redactan tokens, firma, body de webhook y URLs firmadas.
- Readiness valida solo configuración local requerida; no comprueba disponibilidad remota de GitHub/Core.
- La entrega webhook a Core es confirmada al emisor solo tras la respuesta contractual; ante fallo/timeout de Core, devolver `503` para habilitar reintento de GitHub.
