# SDD — GitHub Integration API

`spec/` es la fuente local de verdad implementable de este componente. Las decisiones globales se comparten con Core/Console conforme a sus contratos vigentes.

**Línea base:** SDD 3.0 / SYSTEM-2.4 / INTEROP-2.4 / GH-INTEROP-1.0. La homologación global con Test Execution Sandbox sigue pendiente; no se declara una línea base común de los cuatro componentes ni una integración desplegada.

## Orden de lectura

`contracts/system-contract.md` → `contracts/interoperability-contract.md` → `contracts/github-integration-contract.md` → constituciones aplicables → `backlog.md` y `operational-cases.md` → feature `spec.md` → `plan.md` → `tasks.md` → `harness/work-items.json`.

## Contratos y sincronización

- `SYSTEM-2.4` y `INTEROP-2.4` son espejos byte a byte de las fuentes canónicas compartidas por Core y Console; no se modifican unilateralmente.
- Core es dueño canónico de `GH-INTEROP-1.0`; el espejo local coincide byte a byte y la revisión independiente del contrato está `APPROVED` en Core. Los WIs GH deben volver a comprobar decisiones y sync aplicables al seleccionarse; el contrato aprobado no significa implementación o despliegue.
- Las nuevas necesidades contractuales usan `CONTRACT_SYNC` dirigido al dueño. Un evento no aprueba el cambio ni autoriza a modificar al consumidor.

## Planificación

El catálogo de seis épicas, 18 HU y 15 OC se mantiene idéntico al backlog global; no se abre una HU por cada componente. El trabajo técnico se define como subtareas en `tasks.md` y WIs locales en `harness/work-items.json`. Las 18 HU y 15 OC son referencias de alcance, no evidencia de que GH las implemente o cubra.

`WI-GH-001` prepara la base del servicio, health y configuración local. Los cortes siguientes son locales al API: `WI-GH-002` discovery/autorización/repositorios/organizaciones/ramas, `WI-GH-003` lecturas de compare/tree/files/PR, `WI-GH-004` Checks/publicación, `WI-GH-005` webhooks y entrega normalizada. Todos deben sincronizar su contrato con Core; los WIs 002–005 tienen dependencias explícitas y no se seleccionan antes del cierre de sus predecesores. Ningún WI incluye cambiar contratos sin sincronización con su dueño.

## Decisiones

Una decisión `PENDING` o `PROPOSED` vive en su contrato/feature dueño con `Blocks`; solo bloquea el WI cuyo alcance coincida. `harness/state.json` conserva IDs aplicables al WI activo, no duplica texto de decisiones.
