# SDD — GitHub Integration API

`spec/` es la fuente local de verdad implementable de este componente. Las decisiones globales se comparten con Core/Console conforme a sus contratos vigentes.

**Espejos locales de GH:** SDD 3.1 / SYSTEM-2.14 / INTEROP-2.19 / GH-INTEROP-1.8. Los tres contratos y la carpeta `spec/contracts/schemas/` de este repositorio coinciden byte por byte con las fuentes canónicas de Core. La línea base SDD 3.1 es común a los cuatro componentes; eso no implica una integración desplegada.

## Orden de lectura

`contracts/system-contract.md` → `contracts/interoperability-contract.md` → `contracts/github-integration-contract.md` → constituciones aplicables → `backlog.md` y `operational-cases.md` → feature `spec.md` → `plan.md` → `tasks.md` → `harness/work-items.json`.

## Contratos y sincronización

- `SYSTEM-2.14`, `INTEROP-2.19` y `GH-INTEROP-1.8` son copias espejo byte por byte de las fuentes canónicas de Core, junto con los esquemas JSON de `spec/contracts/schemas/`. Los espejos previos se sincronizaron con `WI-GH-013` y `WI-GH-014`; la homologación a SYSTEM-2.13 / INTEROP-2.18 / GH-INTEROP-1.8 (editorial y aditiva) se hizo desde la sesión cross el 2026-10-18 y se regularizó con `WI-GH-015`, que además re-espejó `interoperability-contract.md` byte a byte desde Core `67519a2`.
- Core es dueño canónico de `GH-INTEROP-1.8`. WI-GH-007 implementó localmente la fecha original del PR; WI-GH-012 cerró la coordinación efímera de instancia única y el rechazo terminal confirmado de creación. La decisión y sincronización no acreditan despliegue ni cutover.
- Las nuevas necesidades contractuales usan `CONTRACT_SYNC` dirigido al dueño. Un evento no aprueba el cambio ni autoriza a modificar al consumidor.

## Planificación

El catálogo de seis épicas, 18 HU y 15 OC se mantiene idéntico al backlog global; no se abre una HU por cada componente. El trabajo técnico se define como subtareas en `tasks.md` y WIs locales en `harness/work-items.json`. Las 18 HU y 15 OC son referencias de alcance, no evidencia de que GH las implemente o cubra.

`WI-GH-001` prepara la base del servicio, health y configuración local. `WI-GH-002` cubre discovery/autorización/repositorios/ramas, `WI-GH-003` compare/tree/files/PR, `WI-GH-004` Checks/publicación, `WI-GH-005` webhooks y `WI-GH-006` rutas de usuario Console/autorización síncrona; sus snapshots de cierre se conservan. `WI-GH-007` entregó `pullRequest.createdAt` verificable en webhook y lectura histórica y está cerrado; su Contract Sync coordinó Core y Console.

## Decisiones

Una decisión `PENDING` o `PROPOSED` vive en su contrato/feature dueño con `Blocks`; solo bloquea el WI cuyo alcance coincida. `harness/state.json` conserva IDs aplicables al WI activo, no duplica texto de decisiones.
