# Feature 002 — Acceso a repositorio para vinculación

**Estado:** `WI-GH-002` terminado; depende de `WI-GH-001`, ya cerrado.
**Historia relacionada:** HU02, sin crear una HU adicional.

Esta feature prepara la primera operación GitHub de dominio que Core delegará al servicio: verificar acceso de la App, resolver metadatos/permiso vigentes y obtener ramas para vincular un repositorio. Core conserva la autorización de Project y el ciclo de vida de `RepositoryBinding`.

## Límite

- Implementar solo operaciones ya descritas por el GH-INTEROP vigente después de revisión independiente y sincronización final del espejo.
- No cambiar login, flujo, scopes, DTO ni respuestas exitosas del discovery. No cambiar la API pública Core-Console ni migrar el consumidor Core en este WI. GH clasifica `401` como `GITHUB_USER_TOKEN_INVALID` y usa `GITHUB_UPSTREAM_UNAVAILABLE` (`503`, reintentable) para `429` y `403` ambiguos, evitando tratarlos como expiración de sesión. El mapeo `403` no está escrito literalmente en GH-INTEROP-1.0: Contract Sync debe solicitar su ratificación al consumidor Core, que seguirá sin cambios aquí. Antes de un futuro cutover deberá confirmarse y documentarse la traducción pública del `503` frente al `401` actual de Core.
- No incluye publicación ni webhooks.
- No aceptar operaciones GitHub desde Console ni persistir dominio/tokens en GH.
- En discovery, un `401` del provider token se normaliza como `GITHUB_USER_TOKEN_INVALID`; un `403` o `429` no prueba por sí solo que la sesión expiró y se devuelve como `GITHUB_UPSTREAM_UNAVAILABLE` (`503`, reintentable). Ningún cuerpo o mensaje crudo de GitHub se registra ni se devuelve.
- Readiness exige la credencial interna Core→GH y la configuración local `GITHUB_APP_ID` + `GITHUB_APP_PRIVATE_KEY_BASE64`; configuración incompleta/inválida no expone valores ni impide liveness. Readiness no consulta GitHub.
- La lista de ramas se devuelve completa o como `UNVERIFIABLE`: máximo 10 páginas y 30 segundos por operación. Si se excede cualquiera de esos límites, no se devuelve una lista parcial.
- Depender de `WI-GH-001` completado; el Harness y las dependencias prohíben seleccionarlo antes.

## Criterio de preparación

`WI-GH-001` ya está `W-DONE`; la dependencia, puerta de decisiones, Contract Sync `start` y verificación SDD de este corte están comprobados. La especificación no autoriza a modificar el consumidor Core ni a cambiar el flujo OAuth. La futura migración de Core conserva su propio WI y debe resolver el mapeo público del `403` ambiguo antes del cutover.
