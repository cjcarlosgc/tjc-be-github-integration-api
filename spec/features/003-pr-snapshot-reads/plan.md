# Plan — Lecturas de snapshots y cambios

## Corte

1. Reutilizar el cliente GitHub/App ya extraído en `app/src/github/` y el mapeo de lookup; este servicio no depende de Core en ejecución.
2. Implementar compare consultando una sola vez la primera página de `files`; no iterar páginas como si contuvieran archivos, porque GitHub pagina commits y solo devuelve `files` en la primera página (hasta 300 cambios).
3. Si compare devuelve 300 archivos, emitir `UNVERIFIABLE`: la API no señala si el máximo alcanzado es el total exacto o una lista truncada. Compare y files:batch son all-or-error; `tree` conserva `truncated`.
4. Implementar tree de blobs, lectura batch fijada por commit y HEAD/estado/fecha original del PR usando el cliente GitHub/App. `created_at` ausente, inválido o ambiguo produce `UNVERIFIABLE` sin valor.
5. Probar DTOs y fallos con transportes simulados, incluyendo distinción de ausencia, App no instalada, resultado no verificable, timeouts, tope de compare y batch incompleto.
6. Publicar Contract Sync namespaced ligado a `WI-GH-003` para que Core ratifique/documente esta interpretación segura del límite de compare.

## Dependencias

`WI-GH-002` debe estar `W-DONE`. `WI-CORE-003` espera a que finalicen todos los cortes GH (`WI-GH-002`–`WI-GH-005`) y se importen/resuelvan sus eventos Contract Sync. La comprobación del estado del repo hermano es coordinación manual: el Harness local valida estructura y eventos, no consulta otro repositorio.

No hay llamadas reales ni cambios de consumidores hasta selección y aprobación del WI.
