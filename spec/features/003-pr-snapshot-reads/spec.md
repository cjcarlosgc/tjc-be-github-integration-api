# Feature 003 — Lecturas de snapshots y cambios del PR

**Estado:** `WI-GH-003` cerrado localmente; `WI-GH-007` implementa la fecha original de creación del PR conforme a `GH-INTEROP-1.2`.

## Valor relacionado

Habilita HU06 y HU14: obtener un changeset y una vista reproducible del contenido de un PR fijada al commit analizado.

## Alcance

- Implementar `compare`, `tree`, `files:batch` y `pull-request-head` de `GH-INTEROP-1.2`.
- Todas las operaciones internas autentican al servicio Core→GH y devuelven los wrappers `GithubLookup<T>` establecidos.
- `compare` obtiene `files` de la primera respuesta del endpoint Compare. GitHub pagina commits, no los archivos del changeset: solo incluye el arreglo `files` en la primera página y lo limita a 300. Si la respuesta alcanza ese tope, la completitud es ambigua y el servicio devuelve `UNVERIFIABLE`; nunca presenta el tope como lista completa.
- Fallo, timeout, JSON inválido o forma de respuesta incorrecta en `compare` devuelve el estado aplicable sin archivos parciales.
- `tree` lee el commit solicitado, devuelve solo paths de blobs y conserva el indicador `truncated` informado por GitHub.
- `files:batch` acepta como máximo ocho paths por llamada, lee todos fijados al `commitSha` solicitado y devuelve el lote completo o el resultado de error aplicable; nunca devuelve contenido parcial.
- `pull-request-head` devuelve SHA actual, estado `open`/`closed` y la fecha original de creación verificable del PR. Si `created_at` falta o no es una fecha inequívoca, devuelve `UNVERIFIABLE` sin valor parcial.
- Las lecturas conservan la clasificación contractual: ausencia confirmada como `NOT_FOUND`, instalación explícitamente revocada/no disponible como `NOT_INSTALLED`, y permisos/errores ambiguos, timeout o respuesta inválida como `UNVERIFIABLE`.
- No decide autorización de Project, persiste snapshots ni cambia análisis/RAG en Core.

## Criterios verificables

- DTOs, rutas, valores y respuestas coinciden con `GH-INTEROP-1.2`; no se altera la API pública Core–Console.
- La paginación y las lecturas por archivo no filtran respuestas crudas, tokens ni mensajes de GitHub.
- Pruebas con transporte simulado cubren compare por debajo del tope y el tope de 300, 404, instalación no disponible, error/timeout upstream, JSON inválido, `tree.truncated` y fallo de un elemento del batch sin resultado parcial.
- La limitación del endpoint compare se comunica al dueño del contrato GH-INTEROP mediante Contract Sync para ratificar/documentar la interpretación conservadora de `UNVERIFIABLE` al alcanzar 300 archivos.
- La respuesta de `pull-request-head` incluye `createdAt` solo con fecha original verificable y conserva `NOT_FOUND`/`NOT_INSTALLED` como estados separados.

## Fuera de alcance

Discovery y ramas (WI-GH-002), Checks/publicación (WI-GH-004), webhooks (WI-GH-005), migración del consumidor Core (WI-CORE-003) y cambios a Sandbox.
