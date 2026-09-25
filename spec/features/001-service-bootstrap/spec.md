# Feature 001 — Bootstrap del servicio

**Estado:** especificada para `WI-GH-001`; se implementa después de la selección y verificación formal del WI.
**Alcance:** proceso NestJS mínimo, validación de configuración local y health/readiness. No traslada clientes ni flujos de GitHub.

## Historia relacionada

Esta es una habilitación técnica transversal para `HU02` (vincular repositorio), `HU14` (analizar PR) y `HU16` (publicación controlada). No crea una nueva HU ni declara terminada ninguna historia.

## Comportamiento requerido

- El proceso inicia como servicio HTTP NestJS con configuración validada.
- Liveness indica si el proceso está vivo y no depende de Core ni GitHub.
- Readiness indica si está disponible la configuración local obligatoria del proceso; no efectúa llamadas remotas a GitHub/Core.
- Si falta configuración local obligatoria, el servicio no informa readiness satisfactoria. Los valores secretos nunca aparecen en logs, respuesta health, excepciones serializadas o artefactos.
- La configuración usa entorno y puede inicializarse en pruebas sin secretos productivos; las pruebas no presentan credenciales ficticias como integraciones live.
- No se añade base de datos, almacenamiento de tokens ni lógica de dominio Core.

## Criterios de aceptación

1. La aplicación inicia con configuración sintáctica válida y falla de forma diagnóstica y segura ante configuración requerida inválida o ausente.
2. Liveness distingue vida del proceso y no requiere conectividad externa.
3. Readiness refleja solo validación local de configuración, no disponibilidad remota de GitHub/Core.
4. Las respuestas de salud no revelan valores de configuración ni secretos.
5. Las pruebas cubren configuración válida/inválida y liveness/readiness sin acceder a red externa.
6. El código productivo de este corte queda dentro de `app/`; no crea SDK alterno ni implementa operaciones del GH-INTEROP.

Los nombres definitivos de variables deben derivarse del inventario de configuración del código Core que se traslade. No se deben copiar variables ajenas al servicio ni versionar valores.
