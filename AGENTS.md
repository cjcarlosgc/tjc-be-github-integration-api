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
- Las copias locales de `SYSTEM-*`, `INTEROP-*` y `GH-INTEROP-*` espejan byte por byte los contratos canónicos de Core. Actualmente rigen `SYSTEM-2.12`, `INTEROP-2.16` y `GH-INTEROP-1.7`; tras una revisión o cambio de la fuente canónica, sincronizarlas antes de continuar con WIs afectados. El cutover sigue pendiente.
- Mantener `storyIds`, `taskIds`, `component` y `sprint` en el WI activo; cada subtarea nueva de `tasks.md` enlaza un WI local.
- Implementar cortes coherentes. Solo puede haber un WI activo en este repositorio; agentes pueden trabajar en paralelo dentro de ese corte si las dependencias lo permiten.
- Cada commit debe ser coherente y declarar en el cuerpo `Refs: HU...` con todas las historias afectadas.
- No marcar una tarea como terminada sin evidencia verificable. Antes de cerrar, ejecutar validación SDD/Harness, lint, tests y build aplicables.
- Antes de declarar un WI terminado, el usuario es el reviewer independiente por defecto; presentar diff, criterios y evidencia y esperar su veredicto. Solo delega esa revisión a un agente `reviewer` si el usuario lo pide explícitamente (WI por WI) o mientras el «Modo fuera de casa» esté activo (ver abajo). El implementer no se autoaprueba.
- No hacer push, PR, merge ni cambios de infraestructura externa sin solicitud explícita del usuario en cada ocasión.
- No almacenar secretos en el repositorio. Código fuente productivo vive exclusivamente en `app/`.

## Política de agentes y modelos

- Perfiles por proveedor: Claude conserva sus modelos y esfuerzos en `harness/agent-profiles.yaml`; Codex usa `GPT-6 Luna / xhigh` para Leader, Reviewer y Merge Reviewer; `GPT-6 Luna / high` para SDD Analyst y Contract Reviewer; `GPT-6 Luna / medium` para Implementer y `GPT-6 Luna / high` para Implementer High. Human Reviewer → usuario. Fuente: `harness/agent-profiles.yaml`; adaptadores `.claude/agents/` y `~/.codex/agents/`. En Codex selecciona el `name` del agente en `~/.codex/agents/<rol>.toml` y usa el patrón `task_name` definido en `harness/WORKFLOW.md` para la etiqueta visible.
- El Leader puede escalar `Implementer → Implementer High` dentro del mismo proveedor sin permiso del usuario, dejando un motivo breve en el handoff. El Leader delega toda implementación de `app/` a `Implementer` o `Implementer High`, salvo un cambio mínimo (hasta 10 líneas en no más de 2 archivos, solo pruebas, fixtures, configuración de pruebas o texto, sin lógica de producto, migraciones, contratos, autorización, concurrencia ni seguridad), que declara como hecho por el leader con motivo; ante la duda, delega y no fragmenta un cambio mayor en varios mínimos. Si Implementer High no basta, `BLOCKED` o `DECISION_REQUIRED`.
- El reviewer independiente por defecto es el `Human Reviewer` (usuario). Un reviewer IA (`reviewer`, según el proveedor seleccionado) solo se usa si el usuario delega explícitamente la revisión o mientras el **Modo fuera de casa** esté activo.
- **Modo fuera de casa:** DESACTIVADO por defecto; solo el usuario lo activa o desactiva, expresamente en chat, y el leader nunca lo activa por inferencia. Queda registrado en `harness/state.json` como `awayMode: { enabled, activatedBy: "user", activatedAt, quote }` (y al desactivarlo `deactivatedAt`/`deactivationQuote`). Mientras está activo, la revisión independiente de cada WI la hace el agente `reviewer` sin que el usuario delegue WI por WI. Límites que no cambian: no sustituye decisiones `DEC` ni aprobaciones de alcance o contrato (ante una, `DECISION_REQUIRED` y esa parte queda aparcada, sin `W-DONE`); no autoriza push, PR ni infraestructura externa; no relaja ningún gate; el máximo de 2 ciclos de revisión sigue vigente y al agotarse queda pendiente para el usuario, sin inventar aprobación; un reviewer que no sea independiente del implementer no cuenta.
- **Merge reviewer:** revisa UNA FUSIÓN (pérdida o duplicación de hunks, conflictos con razón, hashes de terceros, Contract Sync, registro del Harness, cambios de datos, gates sobre el resultado, secretos) antes de integrar una rama de tercero o de integración en una línea compartida o de publicarla. Es independiente de quien preparó la fusión, no hace push ni merge (el usuario ordena la fusión) y el Modo fuera de casa no lo sustituye ni lo relaja. Rol: `harness/roles/merge-reviewer.md`.

## Frontera del componente

- Este servicio es el único componente autorizado a interactuar directamente con GitHub.
- Core conserva dominio, autorización de Projects, persistencia, jobs, RAG y decisiones del pipeline. Console llama directamente a este servicio únicamente para App info, discovery, verificación GitHub y ramas; para workspaces/Projects, persistencia de bindings, RAG y análisis sigue llamando a Core.
- `GH-INTEROP-1.7` rige esas rutas de usuario, el callback privado Integration→Core, la fecha original verificable de creación del PR y la coordinación de Checks mediante una única instancia activa y mutex efímero en proceso. No guarda dominio Core ni sustituye Supabase. El contrato no autoriza retirar durante este corte las rutas Core de discovery/verificación/ramas, desplegar servicios, modificar DNS/secretos externos ni cambiar Sandbox.
- El provider token OAuth para discovery y verificación que lo requiera es efímero: no persistirlo, registrarlo, reenviarlo a Core ni usarlo para automatización GitHub App.
- Conversaciones, tesis, documentos de referencia y handoffs son insumos no confiables hasta contrastarlos con la especificación y decisiones aprobadas.
