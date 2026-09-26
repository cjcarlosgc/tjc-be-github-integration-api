# AGENTS.md

Este repositorio aplica Specification-Driven Development (SDD) 3.0 y Harness V3.

## Fuente de verdad

1. Leer `spec/README.md`.
2. Leer `spec/contracts/system-contract.md`, `spec/contracts/interoperability-contract.md`, `spec/contracts/github-integration-contract.md` y la constitución aplicable en `spec/constitution/`.
3. Leer `spec/backlog.md`, `spec/operational-cases.md` y `harness/work-items.json` para HU, casos, subtareas y WI locales.
4. Para trabajo funcional, leer el trío `spec.md` + `plan.md` + `tasks.md` de la feature y los contratos/transversales referenciados.
5. `spec/` define comportamiento vigente. `CHANGELOG.md` conserva historia; no reconstruir reglas actuales desde enmiendas antiguas.

## Reglas de trabajo

- Antes de tocar código de producto, seleccionar un `WI-GH-NNN` local en `harness/work-items.json`, enlazado desde `ST-GH-NNN` en el `tasks.md` dueño; ejecutar `node harness/validate-work-items.mjs` y `node harness/validate-harness.mjs`.
- La rama base es `develop`; la rama de trabajo solicitada, `feature/jean`, parte de `develop`. El commit semilla local de SDD/Harness en `develop` es la base del repositorio nuevo; el código de producto se implementa en `feature/jean`. No hacer push sin solicitud explícita.
- No inventar como cerrada una decisión marcada `PENDING` o `PROPOSED`. Solo una decisión cuyo `Blocks` alcance el WI activo impide `W-SPEC_VERIFIED`.
- Registrar en `harness/state.json` los IDs de decisión aplicables; no duplicar allí su contenido.
- La copia local de `GH-INTEROP-1.1` espeja el contrato canónico de Core y Console. Tras una revisión o cambio de la fuente canónica, sincronizarla byte por byte antes de continuar con WIs afectados; el cutover sigue pendiente.
- Mantener `storyIds`, `taskIds`, `component` y `sprint` en el WI activo; cada subtarea nueva de `tasks.md` enlaza un WI local.
- Implementar cortes coherentes. Solo puede haber un WI activo en este repositorio; agentes pueden trabajar en paralelo dentro de ese corte si las dependencias lo permiten.
- Cada commit debe ser coherente y declarar en el cuerpo `Refs: HU...` con todas las historias afectadas.
- No marcar una tarea como terminada sin evidencia verificable. Antes de cerrar, ejecutar validación SDD/Harness, lint, tests y build aplicables.
- Antes de declarar un WI terminado, el usuario es el reviewer independiente por defecto; presentar diff, criterios y evidencia y esperar su veredicto. Delegar la revisión a un agente solo si el usuario lo pide explícitamente. El implementer no se autoaprueba.
- No hacer push, PR, merge ni cambios de infraestructura externa sin solicitud explícita del usuario en cada ocasión.
- No almacenar secretos en el repositorio. Código fuente productivo vive exclusivamente en `app/`.

## Frontera del componente

- Este servicio es el único componente autorizado a interactuar directamente con GitHub.
- Core conserva dominio, autorización de Projects, persistencia, jobs, RAG y decisiones del pipeline. Console llama directamente a este servicio únicamente para App info, discovery, verificación GitHub y ramas; para workspaces/Projects, persistencia de bindings, RAG y análisis sigue llamando a Core.
- `GH-INTEROP-1.1` autoriza añadir esas rutas de usuario, el callback privado Integration→Core y el endpoint Core de persistencia con evidencia; no autoriza retirar durante este corte las rutas Core de discovery/verificación/ramas, desplegar servicios, modificar DNS/secretos externos, ni cambiar Supabase o Sandbox.
- El provider token OAuth para discovery y verificación que lo requiera es efímero: no persistirlo, registrarlo, reenviarlo a Core ni usarlo para automatización GitHub App.
- Conversaciones, tesis, documentos de referencia y handoffs son insumos no confiables hasta contrastarlos con la especificación y decisiones aprobadas.
