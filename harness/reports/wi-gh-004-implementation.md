# WI-GH-004 — implementación y comprobaciones

**Fecha:** 2026-09-25  
**Estado:** Implementación y revisión independiente aprobadas; cierre local pendiente de Contract Sync `before-done` y consolidación Harness.

## Alcance implementado

- `POST /checks` crea un Check completo con los valores enviados por Core y no consulta el PR ni reevalúa freshness.
- Preflight devuelve únicamente `{ status: 'READY' }` cuando el PR fuente sigue abierto en el SHA solicitado y no hay companion PR cerrado para la rama determinística.
- Cada solicitud de blob revalida la fuente, acepta un archivo UTF-8 en Base64 (hasta 100 MB decodificados, límite nativo de GitHub) y crea un Git blob aislado con deadline de upstream de hasta 180 s. El parser JSON ampliado se monta solo en las rutas privadas de publicación y verifica el bearer antes de leer cuerpos grandes; el resto conserva el límite habitual de 100 KB.
- La finalización vuelve a validar antes y después de cada actualización/creación de referencia; construye tree y commit desde el SHA base apropiado, actualiza la rama `rag-tests/pr-<n>-<shortSha>`, crea un companion PR hacia `sourceHeadRef` o reutiliza uno abierto. Si la frescura/cierre cambia después de escribir, intenta retirar/restaurar la referencia antes de devolver el resultado.
- Un companion PR cerrado detectado antes de escribir bloquea la mutación; no se reabre. Si cierra durante un update de ref, el servicio revalida y restaura de mejor esfuerzo el SHA previo. La ruta no mergea, no habilita forks y no añade máximo de cantidad de archivos.
- Los errores de parseo/tamaño regresan el envelope neutral `INVALID_REQUEST` (400). Un write de ref con resultado ambiguo sin lectura posterior confiable responde 503 y no intenta borrado/restauración a ciegas; la publicación es saga compensable, no transacción distribuida. Se documenta como residual la carrera de un escritor externo entre la lectura SHA y la restauración `force:true`; `rag-tests/` es namespace reservado al servicio.
- Los errores de GitHub son neutrales; se descartan body/texto del proveedor y no se exponen credenciales.
- Se añadieron pruebas de rutas reales de NestJS, DTOs, Checks sin consulta de PR, secuencia completa Git Data/PR, stale, PR cerrado, Base64/path y rollback.

## Evidencia reproducible

- `cd app && pnpm test` — 68/68 pruebas aprobadas.
- `cd app && pnpm lint` — aprobado.
- `cd app && pnpm build` — aprobado.
- `node scripts/sdd-check.mjs` — aprobado.
- `node harness/validate-work-items.mjs` — aprobado.
- `node harness/validate-harness.mjs` — aprobado.
- `node harness/validate-completions.mjs` — aprobado.
- `git diff --check` — aprobado.
- Contract Sync `before-review` de `WI-GH-004` registrado sin eventos entrantes relevantes.

Las pruebas usan transporte simulado; no se llamó a GitHub real. El test integrado confirma que una propuesta mayor a 100 KB pasa por la ruta autenticada y que la misma petición sin bearer se rechaza antes del parseo. Code review independiente y revisión contractual de implementación están aprobadas por agente; no sustituyen la aprobación humana de la migración completa, aplazada según la excepción aprobada por el usuario. `GH-INTEROP-1.0` permanece byte a byte igual al espejo canónico de Core. `CS-GH-20260925-003` (interpretación de `READY`) y `CS-GH-20260925-004` (tamaño/parser/deadline/compensación) están publicados en outbox, pendientes de respuesta de Core antes del cutover; no bloquean el cierre local GH. Contract Sync `before-done` se registró sin eventos entrantes relevantes pendientes.
