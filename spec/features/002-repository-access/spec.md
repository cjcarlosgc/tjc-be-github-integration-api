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

`WI-GH-001` ya está `W-DONE`; `WI-GH-002` conserva su evidencia de extracción, y la migración del consumidor se completó en WIs posteriores: `WI-CORE-003`, `WI-CONSOLE-003` y `WI-GH-006`. El mapeo público de errores está resuelto en el contrato vigente. La configuración externa y el cutover siguen pendientes.

## Auditoría SMART V3 (SDD 2026-10-08; sin cambio funcional previsto)

GitHub Integration es un adaptador técnico: conoce solo hechos GitHub, permisos, PR/HEAD, freshness, webhooks, Checks, companion PR, trazabilidad, seguridad y Contract Sync. No incorpora retrieval, SE/SEM, RAG, GENERALIST_AGENT, oráculos, CF/CO, Functional Knowledge, `ACTION_REQUIRED`, bootstrap ni selección de casos, y no decide el rol de dominio ni la política de FK. El handoff V3 anticipa que «mucho ya cumple»: no se crea trabajo artificial.

Requisitos con evidencia revisada en `WI-GH-010` (la verificación campo a campo y de pruebas queda en su matriz):

- **Hechos de permiso.** El contrato (`RepositoryPermissionLevel`) y el código conservan `admin`, `maintain`, `write`, `triage` y `read` sin colapsar `write` en `maintain`; Core deriva Admin, Maintainer, Writer o Reader (`DEC-ORG-003`, `INTEROP-2.7` §6.13). **Posible brecha menor:** si GitHub no devuelve `role_name` (o devuelve un rol personalizado), la ruta de respaldo de `toPermissionLevel` devuelve `write` antes de considerar `maintain` y no evalúa nunca `triage`, lo que reporta menos privilegio del real, nunca más. El orden de derivación esperado es `role_name` conocido, booleanos de mayor a menor especificidad (`admin`, `maintain`, `push`, `triage`, `pull`), campo legacy `permission` y, si no, `UNVERIFIABLE`. `WI-GH-011` lo confirma con fixtures y lo corrige solo si reproduce.
- **Hechos de PR/HEAD.** `deliveryId`, `pullRequest.createdAt` verificable, `headSha` y `baseSha` ya existen; `WI-GH-010` verifica el resto de la lista del handoff (repositorio, número, estado, refs, `correlationId`).
- **Webhooks, Checks y companion PR.** HMAC sobre el cuerpo crudo, allowlist, deduplicación por entrega, entrega normalizada sin payload crudo ni headers de firma, `headSha` exacto en Checks, conclusión provista por Core y verificación de freshness con resultado `STALE` ya están implementados (`WI-GH-004`, `WI-GH-005`); no hay auto-merge, escritura directa a la feature branch ni merge blocking.
- **Seguridad.** Provider token OAuth efímero, installation token interno, bearer de servicio y CORS allowlist se conservan; Sandbox nunca recibe secretos GitHub.
- **Contract Sync.** `GH-INTEROP-1.2` no cambia con SMART V3. Core publica `SYSTEM-2.6` e `INTEROP-2.7` (rol Writer, `UNKNOWN`, OE2, OE5, trace y evidencia); GitHub Integration solo sincroniza sus espejos en `WI-GH-010`. Un evento Contract Sync no autoriza implementación.
