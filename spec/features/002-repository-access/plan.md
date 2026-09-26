# Plan — Acceso a repositorio para vinculación

## Boceto de corte

1. Inventariar llamadas existentes de Core usadas por RepositoryBinding y discovery: App info, OAuth discovery, installation, metadatos, permisos, organizaciones y ramas.
2. Mapear cada operación a los DTOs de GH-INTEROP aprobado; conservar resultados `NOT_FOUND`, `NOT_INSTALLED` y `UNVERIFIABLE`.
3. Extraer/reutilizar el adaptador GitHub de Core sin portar autorización de Project ni persistencia; validar App ID/private key localmente y reflejar su presencia en readiness, sin ping remoto.
4. Acotar la consulta de ramas a 10 páginas y 30 segundos; si no se verifica una lista completa, responder `UNVERIFIABLE` sin resultados parciales.
5. Añadir pruebas de contrato/paridad y entregar un handoff de consumidores Core afectados. Core solo migra su consumidor en un WI propio.
6. Publicar Contract Sync `CS-GH-YYYYMMDD-NNN` con `sourceWorkItem: WI-GH-002` para todos los consumidores afectados.

La regla de errores del corte se consolidó después en `GH-INTEROP-1.1`: solo un `401` explícito del provider token es inválido; `403` ambiguo/`429` son upstream reintentable y Core los traduce a `503 GITHUB_VERIFICATION_UNAVAILABLE`. La afirmación histórica de que Core aún no migraba pertenecía al plan original de `WI-GH-002`; la vigencia de Console directo y callback Core se especifica en `spec/features/006-console-github-api/`.

## Precondiciones

- `WI-GH-001` debe estar `W-DONE` y registrado en `completedWorkItems`.
- Revisión independiente del GH-INTEROP finalizada y el espejo local sincronizado.
- Contrato Sync y decisión gate de este WI se ejecutan al seleccionarlo.

Las puertas previas de `WI-GH-002` están satisfechas. Este plan no autoriza cambios fuera de este corte ni el cutover del consumidor Core.
