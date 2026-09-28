# SDD — GitHub Integration API

`spec/` es la fuente local de verdad implementable de este componente. Las decisiones globales se comparten con Core/Console conforme a sus contratos vigentes.

**Espejos locales de GH:** SDD 3.0 / SYSTEM-2.5 / INTEROP-2.6 / GH-INTEROP-1.2. Los tres contratos de este repositorio coinciden byte por byte con las fuentes canónicas de Core en `c96e9ad3c58a65914e234974f342b83415a50286`. La homologación global con Test Execution Sandbox sigue pendiente; no se declara una línea base común de los cuatro componentes ni una integración desplegada.

## Orden de lectura

`contracts/system-contract.md` → `contracts/interoperability-contract.md` → `contracts/github-integration-contract.md` → constituciones aplicables → `backlog.md` y `operational-cases.md` → feature `spec.md` → `plan.md` → `tasks.md` → `harness/work-items.json`.

## Contratos y sincronización

- `SYSTEM-2.5`, `INTEROP-2.6` y `GH-INTEROP-1.2` son copias espejo byte por byte de las fuentes canónicas de Core, sincronizadas mediante `CS-CORE-20260927-004`, `CS-CORE-20260927-005` y `CS-CORE-20260927-006`; Sandbox conserva una línea base local anterior hasta su homologación.
- Core es dueño canónico de `GH-INTEROP-1.2`. La topología de WI-GH-006 está cerrada localmente; WI-CORE-014 amplió el contrato para transmitir la fecha original del PR y está cerrado. WI-GH-007 implementó y cerró esa extensión (`W-DONE`); no está desplegada ni cortada.
- Las nuevas necesidades contractuales usan `CONTRACT_SYNC` dirigido al dueño. Un evento no aprueba el cambio ni autoriza a modificar al consumidor.

## Planificación

El catálogo de seis épicas, 18 HU y 15 OC se mantiene idéntico al backlog global; no se abre una HU por cada componente. El trabajo técnico se define como subtareas en `tasks.md` y WIs locales en `harness/work-items.json`. Las 18 HU y 15 OC son referencias de alcance, no evidencia de que GH las implemente o cubra.

`WI-GH-001` prepara la base del servicio, health y configuración local. `WI-GH-002` cubre discovery/autorización/repositorios/ramas, `WI-GH-003` compare/tree/files/PR, `WI-GH-004` Checks/publicación, `WI-GH-005` webhooks y `WI-GH-006` rutas de usuario Console/autorización síncrona; sus snapshots de cierre se conservan. `WI-GH-007` entregó `pullRequest.createdAt` verificable en webhook y lectura histórica y está cerrado; su Contract Sync coordinó Core y Console.

## Decisiones

Una decisión `PENDING` o `PROPOSED` vive en su contrato/feature dueño con `Blocks`; solo bloquea el WI cuyo alcance coincida. `harness/state.json` conserva IDs aplicables al WI activo, no duplica texto de decisiones.
