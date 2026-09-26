# Feature 002 — Acceso a repositorio para vinculación

**Estado:** `WI-GH-002` terminado; depende de `WI-GH-001`, ya cerrado.
**Historia relacionada:** HU02, sin crear una HU adicional.

El alcance original de esta feature fue extraer las lecturas GitHub que Core delegaba al servicio: verificar acceso de la App, resolver metadatos/permiso vigentes y obtener ramas para vincular un repositorio. Core conserva la autorización de Project y el ciclo de vida de `RepositoryBinding`; la arquitectura vigente añade aparte las rutas de usuario directas especificadas por WI-GH-006.

## Límite

- Implementar solo operaciones ya descritas por el GH-INTEROP vigente después de revisión independiente y sincronización final del espejo.
- El alcance original de `WI-GH-002` no cambió login, flujo, scopes, DTO ni respuestas exitosas del discovery, ni migró entonces el consumidor Core. Esas frases describen el corte cerrado, no la frontera vigente. La traducción actual sí está definida en `GH-INTEROP-1.1`: un `401` explícito del provider token es `GITHUB_USER_TOKEN_INVALID`; `403`/`429` ambiguos son `GITHUB_UPSTREAM_UNAVAILABLE` (`503`, reintentable) y Core los expone como `503 GITHUB_VERIFICATION_UNAVAILABLE`, no como sesión expirada.
- No incluye publicación ni webhooks.
- Las rutas privadas de este corte no se reutilizan desde Console. Las rutas de usuario separadas se añadieron después bajo WI-GH-006; GitHub Integration no persiste dominio ni tokens.
- En discovery, un `401` del provider token se normaliza como `GITHUB_USER_TOKEN_INVALID`; un `403` o `429` no prueba por sí solo que la sesión expiró y se devuelve como `GITHUB_UPSTREAM_UNAVAILABLE` (`503`, reintentable). Ningún cuerpo o mensaje crudo de GitHub se registra ni se devuelve.
- Readiness exige la credencial interna Core→GH y la configuración local `GITHUB_APP_ID` + `GITHUB_APP_PRIVATE_KEY_BASE64`; configuración incompleta/inválida no expone valores ni impide liveness. Readiness no consulta GitHub.
- La lista de ramas se devuelve completa o como `UNVERIFIABLE`: máximo 10 páginas y 30 segundos por operación. Si se excede cualquiera de esos límites, no se devuelve una lista parcial.
- Depender de `WI-GH-001` completado; el Harness y las dependencias prohíben seleccionarlo antes.

## Vigencia de la arquitectura

`WI-GH-006` amplía la capacidad para que Console use directamente rutas autenticadas de GitHub Integration para App info, discovery, verificación y ramas. Core sigue conservando Projects/workspaces, autorización de dominio y persistencia. La interacción directa y el callback síncrono se rigen por `spec/features/006-console-github-api/` y el `GH-INTEROP-1.1` canónico; el cutover externo continúa pendiente.

## Criterio de preparación

`WI-GH-001` ya está `W-DONE`; `WI-GH-002` conserva su evidencia de extracción, y la migración del consumidor se completó en WIs posteriores: `WI-CORE-003`, `WI-CONSOLE-003` y `WI-GH-006`. El mapeo público de errores está resuelto en el contrato vigente. La configuración, aprobación personal y cutover externo siguen pendientes.
