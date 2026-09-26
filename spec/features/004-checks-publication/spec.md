# Feature 004 — Checks y publicación companion PR

**Estado:** `WI-GH-004` implementado localmente; los Contract Sync salientes siguen pendientes antes del cutover coordinado.

## Valor relacionado

Habilita HU16: presentar validación y publicar una propuesta vigente en un companion PR controlado, sin merge autónomo.

## Alcance

- Crear Checks en el `headSha` recibido de Core con la conclusión, el título y el resumen ya decididos por Core. GitHub Integration no decide la vigencia/conclusión ni consulta el PR para crear un Check.
- Implementar la publicación sin estado server-side en tres pasos: preflight, un blob de propuesta por llamada, y finalización con `{ path, blobSha }`.
- Aceptar cada blob hasta el límite nativo de GitHub (100 MB por blob); el transporte JSON/Base64 permite ese tamaño solo en la ruta interna autenticada de propuestas, con deadline de upstream compatible. No se introduce un límite de cantidad de archivos distinto del contrato/proveedor.
- En preflight, cada creación de blob y finalización de publicación, volver a verificar que el PR fuente siga abierto en el `sourceHeadSha` solicitado y que no exista un companion PR cerrado para la rama destino. Esto no aplica al endpoint de Checks.
- La respuesta wire de preflight `READY` es exactamente `{ status: 'READY' }`, conforme al tipo y tabla normativos de `GH-INTEROP-1.1`. La frase descriptiva “con branch/base actuales” se interpreta como verificación interna de esos valores, no como campos adicionales de respuesta; cualquier extensión del DTO requiere aprobación del dueño canónico.
- La rama companion es `rag-tests/pr-<pullRequestNumber>-<shortSourceHeadSha>` y su PR apunta a `sourceHeadRef`, la rama fuente del PR original. Un companion PR abierto se reutiliza; uno cerrado no se reabre. Si se cierra durante un ref update, la compensación restaura de mejor esfuerzo el SHA previo.
- La búsqueda de companion PR debe coincidir tanto con la rama `head` determinística como con el `base` actual `sourceHeadRef`; un PR a otra rama base no se reutiliza ni bloquea esta publicación.
- Antes de cada cambio visible (crear/actualizar una referencia o crear un PR), revalidar frescura y PR cerrado; volver a validar después de cada ref update antes de responder o crear el PR. Stale/cerrado detectado antes de escribir no publica refs, ramas ni PRs; tras un ref update se intenta compensación antes de devolver el resultado.
- No habilitar publicación desde fork en este incremento; Core conserva y debe aplicar la elegibilidad del origen antes de llamar al servicio. GH no crea reglas de dominio para decidirla.
- Tratar la publicación como una secuencia compensable, no como transacción distribuida: revalidar antes/después de actualizar ref; ante resultado ambiguo o SHA actual distinto, responder `GITHUB_UPSTREAM_UNAVAILABLE` sin rollback ciego. GitHub no ofrece compare-and-swap para esta compensación; el namespace `rag-tests/` es de escritura exclusiva del servicio y existe una carrera residual si otro actor lo modifica entre la lectura SHA y el `force` restore.
- Mantener errores y resultados neutrales y redactados.

## Fuera de alcance

El consumidor, elegibilidad (incluida la exclusión actual de forks), aprobación de producto, freshness y conclusiones siguen en Core; no se añade límite de cantidad de propuestas, no se reabre PR cerrado y no se permite merge automático. Un cierre detectado después de actualizar una ref puede requerir la escritura compensatoria documentada para restaurar el SHA previo.
