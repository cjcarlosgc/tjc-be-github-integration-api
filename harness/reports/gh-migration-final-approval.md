# Excepción temporal — aprobación final de migración GH

**Fecha:** 2026-09-25
**Aprobada por:** usuario, en esta conversación.
**Alcance:** solo la migración de capacidades al repositorio GitHub Integration (`WI-GH-003`–`WI-GH-005`); no modifica la política general del Harness.

## Acuerdo

- El usuario revisará y aprobará el resultado una sola vez cuando los cortes de extracción al cuarto componente estén completos, en vez de revisar cada WI por separado.
- Cada WI conserva su revisión independiente por un agente distinto del implementador, revisión contractual cuando aplique, pruebas, Contract Sync y demás gates con evidencia. Un WI no se cierra si esos gates no pasan.
- Al terminar `WI-GH-005`, se presentará el conjunto de cambios y la evidencia para la aprobación humana global.
- Esta excepción no autoriza push, PR, merge, cambios de infraestructura ni el cutover del consumidor Core. `WI-CORE-003` sigue siendo un trabajo separado y mantiene su propia autorización y gates.
