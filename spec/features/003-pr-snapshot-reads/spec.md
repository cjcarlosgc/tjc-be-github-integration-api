# Feature 003 — Lecturas de snapshots y cambios del PR

**Estado:** planificada para `WI-GH-003`; no implementada.

## Valor relacionado

Habilita HU06 y HU14: obtener un changeset y una vista reproducible del contenido de un PR fijada al commit analizado.

## Alcance

- Implementar `compare`, `tree`, `files:batch` y `pull-request-head` de `GH-INTEROP-1.0`.
- Todas las operaciones internas autentican al servicio Core→GH y devuelven los wrappers `GithubLookup<T>` establecidos.
- Comparación paginada se completa antes de responder; el tree solo lista blobs; el batch se fija al commit y falla como una unidad.
- No decide autorización de Project, persiste snapshots ni cambia análisis/RAG en Core.

## Fuera de alcance

Discovery y ramas (WI-GH-002), Checks/publicación (WI-GH-004), webhooks (WI-GH-005), migración del consumidor Core (WI-CORE-003) y cambios a Sandbox.
