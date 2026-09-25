# Feature 004 — Checks y publicación companion PR

**Estado:** planificada para `WI-GH-004`; no implementada.

## Valor relacionado

Habilita HU16: presentar validación y publicar una propuesta vigente en un companion PR controlado, sin merge autónomo.

## Alcance

- Crear Checks en el `headSha` recibido de Core con la conclusión, el título y el resumen ya decididos por Core. GitHub Integration no decide la vigencia/conclusión ni consulta el PR para crear un Check.
- Implementar la publicación sin estado server-side en tres pasos: preflight, un blob de propuesta por llamada, y finalización con `{ path, blobSha }`.
- En preflight, cada creación de blob y finalización de publicación, volver a verificar que el PR fuente siga abierto en el `sourceHeadSha` solicitado y que no exista un companion PR cerrado para la rama destino. Esto no aplica al endpoint de Checks.
- La respuesta wire de preflight `READY` es exactamente `{ status: 'READY' }`, conforme al tipo y tabla normativos de `GH-INTEROP-1.0`. La frase descriptiva “con branch/base actuales” se interpreta como verificación interna de esos valores, no como campos adicionales de respuesta; cualquier extensión del DTO requiere aprobación del dueño canónico.
- La rama companion es `rag-tests/pr-<pullRequestNumber>-<shortSourceHeadSha>` y su PR apunta a `sourceHeadRef`, la rama fuente del PR original. Un companion PR abierto se reutiliza; uno cerrado no se reabre ni modifica.
- Antes de cada cambio visible (crear/actualizar una referencia o crear un PR), revalidar frescura y PR cerrado. Los casos stale o cerrados no publican refs, ramas ni PRs; blobs/objetos Git no referenciados no alteran contenido visible.
- No habilitar publicación desde fork en este incremento; Core conserva y debe aplicar la elegibilidad del origen antes de llamar al servicio. GH no crea reglas de dominio para decidirla.
- Mantener errores y resultados neutrales y redactados.

## Fuera de alcance

El consumidor, elegibilidad (incluida la exclusión actual de forks), aprobación de producto, freshness y conclusiones siguen en Core; no se añade límite de cantidad de propuestas, no se reabre PR cerrado y no se permite merge automático.
