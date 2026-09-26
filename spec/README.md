# SDD — GitHub Integration API

`spec/` es la fuente local de verdad implementable de este componente. Las decisiones globales se comparten con Core/Console conforme a sus contratos vigentes.

**Línea base:** SDD 3.0 / SYSTEM-2.5 / INTEROP-2.5 / GH-INTEROP-1.1. La homologación global con Test Execution Sandbox sigue pendiente; no se declara una línea base común de los cuatro componentes ni una integración desplegada.

## Orden de lectura

`contracts/system-contract.md` → `contracts/interoperability-contract.md` → `contracts/github-integration-contract.md` → constituciones aplicables → `backlog.md` y `operational-cases.md` → feature `spec.md` → `plan.md` → `tasks.md` → `harness/work-items.json`.

## Contratos y sincronización

- `SYSTEM-2.5` y `INTEROP-2.5` son copias espejo de las fuentes canónicas de Core, también mantenidas por Console; Sandbox conserva una línea base local anterior hasta su homologación.
- Core es dueño canónico de `GH-INTEROP-1.1`. Los WIs GH-002–005 conservan su historial; WI-GH-006 añade las rutas directas de Console y su autorización síncrona con Core. El cambio no está desplegado ni cortado.
- Las nuevas necesidades contractuales usan `CONTRACT_SYNC` dirigido al dueño. Un evento no aprueba el cambio ni autoriza a modificar al consumidor.

## Planificación

El catálogo de seis épicas, 18 HU y 15 OC se mantiene idéntico al backlog global; no se abre una HU por cada componente. El trabajo técnico se define como subtareas en `tasks.md` y WIs locales en `harness/work-items.json`. Las 18 HU y 15 OC son referencias de alcance, no evidencia de que GH las implemente o cubra.

`WI-GH-001` prepara la base del servicio, health y configuración local. `WI-GH-002` discovery interno/autorización/repositorios/organizaciones/ramas, `WI-GH-003` compare/tree/files/PR, `WI-GH-004` Checks/publicación, `WI-GH-005` webhooks y `WI-GH-006` rutas de usuario Console/autorización síncrona. Los WIs 002–005 conservan sus snapshots de cierre; el nuevo corte requiere Contract Sync con Core y Console antes de la revisión final.

## Decisiones

Una decisión `PENDING` o `PROPOSED` vive en su contrato/feature dueño con `Blocks`; solo bloquea el WI cuyo alcance coincida. `harness/state.json` conserva IDs aplicables al WI activo, no duplica texto de decisiones.
