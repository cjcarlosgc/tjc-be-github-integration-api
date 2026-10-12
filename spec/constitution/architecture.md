# Arquitectura del servicio

**Estado:** topología `GH-INTEROP-1.1` implementada y revisada localmente en `WI-GH-006`; la extensión `GH-INTEROP-1.2` para la fecha original verificable del PR se implementó y cerró en `WI-GH-007` (`W-DONE`); `WI-GH-012` cerró la coordinación efímera de instancia única de `GH-INTEROP-1.7`. Despliegue y cutover externos siguen pendientes.

## Fronteras

- Adaptadores de entrada: API interna para Core, API de usuario autenticado para Console, endpoint público de webhooks y liveness/readiness.
- Aplicación: casos de uso GitHub (App/discovery/repositorios/branches/content/compare/Checks/publicación) y entrega del evento normalizado.
- Infraestructura: SDK/HTTP de GitHub, firma HMAC, configuración y cliente HTTPS de Core.
- GitHub Integration no mantiene base de datos de dominio ni lee/escribe tablas Core. `DEC-CHECK-003` no introduce persistencia adicional: una única instancia activa serializa las identidades de Check mediante mutex efímero en proceso.
- No se introduce almacenamiento persistente de tokens de usuario ni GitHub App.
- Console consume la API de usuario solo para App info, discovery, verificación GitHub y ramas; autorización de Project/workspace y persistencia siguen en Core.

Los límites son responsabilidades, no una obligación de replicar nombres de clases del Core. Evitar dependencias circulares y facilitar el traslado incremental de código existente.

## Operación

- HTTPS y JSON entre Core y el servicio bajo `/internal/v1/github`; HTTPS y JSON con sesión humana en `/v1/github`.
- Core→GH y GH→Core usan bearers independientes.
- En las rutas directas de usuario, Integration reenvía a Core el JWT Supabase solo como contexto de identidad, nunca el provider token. Solo la ruta Core heredada de discovery (`GET /integrations/github/repositories`) recibe y reenvía temporalmente el provider token a Integration; el verify-access heredado usa la GitHub App. No se persiste ni registra.
- `X-Correlation-ID` se propaga a Core y GitHub cuando proceda; los logs redactan tokens, firma, body de webhook y URLs firmadas.
- Readiness valida solo configuración local requerida; no comprueba disponibilidad remota de GitHub/Core.
- La operación de Checks falla cerrada ante búsqueda incompleta o resultado remoto incierto mientras el proceso conserva el estado; reiniciar pierde esa memoria y acepta el riesgo residual definido por el contrato.
- La entrega webhook a Core es confirmada al emisor solo tras la respuesta contractual; ante fallo/timeout de Core, devolver `503` para habilitar reintento de GitHub.
