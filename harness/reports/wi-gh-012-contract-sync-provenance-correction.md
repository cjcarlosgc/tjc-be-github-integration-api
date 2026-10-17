# Corrección de procedencia Contract Sync — WI-GH-012

Fecha: 2026-10-11

`CS-GH-20261011-002` fue consumido históricamente con `sourceRevision: feature/jean@working-tree`, una etiqueta que no resuelve a commit. No se reescribe ese evento, pues Core ya lo importó y resolvió.

Se publica el evento inmutable sucesor `CS-GH-20261011-003`, sin cambio funcional de contrato, para registrar la procedencia verificable del corte: `e9de71dd51c15b84d004b7f4ebb84f49213604c7` (`feat(github): coordinar Checks con mutex efímero`). Core debe importar y registrar el evento correctivo preservando el histórico de `CS-GH-20261011-002`.

No se modifican contratos canónicos, código de producto, despliegue, cutover ni el repositorio de Core.
