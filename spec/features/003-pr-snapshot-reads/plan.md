# Plan — Lecturas de snapshots y cambios

## Corte

1. Reutilizar el cliente GitHub/App existente de Core y el mapeo de lookup aprobado.
2. Portar compare paginado, tree de blobs, lectura batch fijada por commit y HEAD/estado de PR.
3. Probar DTOs y fallos con transportes simulados, incluyendo distinción de ausencia, App no instalada y resultado no verificable.
4. Publicar Contract Sync namespaced ligado a `WI-GH-003`.

## Dependencias

`WI-GH-002` debe estar `W-DONE`. `WI-CORE-003` espera a que finalicen todos los cortes GH (`WI-GH-002`–`WI-GH-005`) y se importen/resuelvan sus eventos Contract Sync. La comprobación del estado del repo hermano es coordinación manual: el Harness local valida estructura y eventos, no consulta otro repositorio.

No hay llamadas reales ni cambios de consumidores hasta selección y aprobación del WI.
