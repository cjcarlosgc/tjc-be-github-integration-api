# Plan — Acceso a repositorio para vinculación

## Boceto de corte

1. Inventariar llamadas existentes de Core usadas por RepositoryBinding y discovery: App info, OAuth discovery, installation, metadatos, permisos, organizaciones y ramas.
2. Mapear cada operación a los DTOs de GH-INTEROP aprobado; conservar resultados `NOT_FOUND`, `NOT_INSTALLED` y `UNVERIFIABLE`.
3. Extraer/reutilizar el adaptador GitHub de Core sin portar autorización de Project ni persistencia.
4. Añadir pruebas de contrato/paridad y entregar un handoff de consumidores Core afectados. Core solo migra su consumidor en un WI propio.
5. Publicar Contract Sync `CS-GH-YYYYMMDD-NNN` con `sourceWorkItem: WI-GH-002` para todos los consumidores afectados.

## Precondiciones

- `WI-GH-001` debe estar `W-DONE` y registrado en `completedWorkItems`.
- Revisión independiente del GH-INTEROP finalizada y el espejo local sincronizado.
- Contrato Sync y decisión gate de este WI se ejecutan al seleccionarlo.

Este plan es de backlog y puede precisarse al seleccionar; no autoriza cambios de aplicación antes de esa puerta.
