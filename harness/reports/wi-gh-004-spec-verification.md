# WI-GH-004 — Verificación de especificación

**Fecha:** 2026-09-25
**Estado:** `APPROVED` para `W-SPEC_VERIFIED` e implementación del contrato vigente; no es revisión ni cierre del WI.

## Alcance y trazabilidad

- `WI-GH-003` está `W-DONE`; satisface la dependencia declarada por `WI-GH-004`.
- `ST-GH-004` enlaza `WI-GH-004` con `HU16`. El corte cubre Checks y publicación companion PR en GitHub Integration; Core conserva elegibilidad, aprobación, frescura y conclusión de producto.
- Checks usa el `headSha`, conclusión, título y resumen provistos por Core y responde `204`; GH no vuelve a consultar el PR ni decide si el resultado sigue vigente.
- El preflight responde exactamente `{ status: 'READY' }` según el tipo y la tabla normativos. `branch`/`base` se verifican internamente; no se agregan campos wire. Esta lectura de la frase descriptiva ambigua queda notificada a Core por Contract Sync para confirmar antes del cutover.
- Publicación vuelve a comprobar que el PR fuente esté abierto y en el SHA pedido, y que el companion PR no esté cerrado, antes de crear cada blob y antes de mutar refs/PR. Un companion PR abierto se reutiliza; uno cerrado no se reabre. No se habilita publicación de forks ni merge automático.
- No se agregan límites de producto al número de propuestas; Core envía un archivo por llamada y conserva su política.

## Decisiones y coordinación

- `DEC-GH-001` está aprobada y respalda checks/publicación human-in-the-loop.
- `DEC-VAL-001` no bloquea pruebas locales con transporte simulado; sí impide ingestión/despliegue con código empresarial y producción de evidencia empresarial, que están fuera de este WI.
- `CONTRACT_SYNC start` de `WI-GH-004` se registró sin eventos entrantes relevantes (`2026-09-25T17:51:45.874Z`). Los CS salientes previos no son bloqueos de esta implementación local; sus confirmaciones siguen requeridas antes del cutover Core.
- El espejo local `GH-INTEROP-1.0` permanece intacto y byte a byte igual al canónico de Core. La discrepancia prose/schema de preflight se notifica, no se corrige unilateralmente.

Este reporte acredita solo la verificación SDD y de decisiones; no certifica código, pruebas de implementación ni cierre del WI.
