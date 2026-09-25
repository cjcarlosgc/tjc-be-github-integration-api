# Feature 001 — Bootstrap del servicio

**Estado:** código listo para revisión independiente del usuario bajo `WI-GH-001`; no incluye operaciones GitHub.
**Alcance:** proceso NestJS mínimo, validación de configuración local y health/readiness. No traslada clientes ni flujos de GitHub.

## Historia relacionada

Esta es una habilitación técnica transversal para `HU02` (vincular repositorio), `HU14` (analizar PR) y `HU16` (publicación controlada). No crea una nueva HU ni declara terminada ninguna historia.

## Comportamiento requerido

- El proceso inicia como servicio HTTP NestJS con sintaxis/configuración validada; un valor requerido ausente deja la readiness en rojo sin revelar el valor.
- Liveness indica si el proceso está vivo mediante una comprobación de conexión TCP y no depende de Core ni GitHub.
- Readiness indica si está disponible la configuración local obligatoria del proceso; no efectúa llamadas remotas a GitHub/Core.
- `GET /health` devuelve `{ status: 'ok' | 'not_ready', checks: { liveness: 'ok', readiness: 'ok' | 'not_ready' } }`; responde `503` si falta configuración local necesaria.
- Los valores secretos nunca aparecen en logs, respuesta health, excepciones serializadas o artefactos.
- La configuración usa entorno y puede inicializarse en pruebas sin secretos productivos; las pruebas no presentan credenciales ficticias como integraciones live.
- No se añade base de datos, almacenamiento de tokens ni lógica de dominio Core.

## Criterios de aceptación

1. La aplicación inicia con configuración sintáctica válida; falla con mensaje genérico y seguro ante valores inválidos, y permanece viva/no lista si falta una credencial requerida.
2. Liveness distingue vida del proceso y no requiere conectividad externa.
3. Readiness refleja solo validación local de configuración, no disponibilidad remota de GitHub/Core.
4. Las respuestas de salud no revelan valores de configuración ni secretos.
5. Las pruebas cubren configuración válida/inválida y liveness/readiness sin acceder a red externa.
6. El código productivo de este corte queda dentro de `app/`; no crea SDK alterno ni implementa operaciones del GH-INTEROP.

Los nombres definitivos de variables deben derivarse del inventario de configuración del código Core que se traslade. No se deben copiar variables ajenas al servicio ni versionar valores.
