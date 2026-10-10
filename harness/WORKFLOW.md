# Harness V3 — GitHub Integration

El Harness ejecuta **work items locales** en `harness/work-items.json`. La planificación global de épicas, HU, OC e ideas vive en `spec/`; `harness/state.json` conserva el WI activo y snapshots verificables al cerrarlos. Ver `spec/constitution/planning-model.md` para identidades y estados.

## Ciclo de un WI

`W-PLANNED → W-READY → W-SELECTED → W-SPEC_VERIFIED → W-AWAITING_APPROVAL → W-IN_PROGRESS → W-IN_REVIEW → W-DONE`. `W-BLOCKED`, `W-DECISION_REQUIRED` y `W-CANCELLED` son salidas explícitas con motivo/evidencia. Un WI terminado se retira de `activeWorkItem`; su snapshot, reporte y Git conservan evidencia. `W-READY` exige HU, taskIds, componente, criterios, dependencias y rutas. Solo puede existir un WI activo local.

1. **Pre-tarea:** leader selecciona WI, verifica `dependsOn`, hace PULL Contract Sync `start` y asigna análisis SDD, decisiones `Blocks`, criterios, límites y riesgos. Contract-reviewer evalúa cambios contractuales. Cambio funcional, arquitectónico o de contrato requiere aprobación humana antes de implementar.
2. **Durante la tarea:** implementer trabaja el corte aprobado. Subtareas independientes pueden correr en paralelo; dependencias reales se respetan. Antes de entregar: PULL `implementation-delivery`, checks y evidencia.
3. **Post-tarea:** PULL `before-review`, revisión independiente y contract-reviewer si aplica. Por defecto revisa el usuario: recibe diff, criterios, checks y evidencia, y emite veredicto. Solo por solicitud explícita (WI por WI) o mientras el «Modo fuera de casa» esté activo (ver abajo) se delega a un agente `reviewer`. El leader consolida handoffs, resuelve hallazgos (máximo dos ciclos), hace PULL `before-done`, valida gates y registra el cierre. La revisión acumulada previa al push es distinta.

Las asignaciones pueden quedar vacías antes de designar responsables. En `W-IN_REVIEW`, `implementationAgent` y `reviewAgent` deben identificar responsables distintos; usa `human-reviewer` por defecto y `reviewer` solo si el usuario delegó. Un handoff aprobado no es por sí mismo un gate aprobado.

**Trazabilidad de modelo.** Todo handoff de agente IA y todo reporte nuevo en `harness/reports/` generado por un agente declara con qué modelo se hizo la tarea: en handoffs, el objeto `executedBy: { agent, configuredModel, servedModel, effort }`; en reportes Markdown, la línea `Modelo: <agent> · configurado <exactModelId> · atendido <exactModelId|unknown> · esfuerzo <low|medium|high>`. `configuredModel` y `effort` se copian de `harness/agent-profiles.yaml`. `servedModel` es el modelo realmente observado; si no se pudo observar, se escribe `unknown`, nunca se asume igual al configurado. Una escalada `implementer → implementer-high` se anota con motivo breve. El handoff del `human-reviewer` no lleva modelo. El campo es informativo, no sustituye gates ni la revisión humana y el validador no lo exige.

**Título de subagentes.** Todo lanzamiento de subagente con WI usa `description` = `[<perfil>::<modelo>] · <WI> · <corte en español>` (ver `harness/roles/leader.md`); el hook `.claude/hooks/check-subagent-title.mjs`, registrado en `.claude/settings.json`, rechaza los que no cumplen.

**Delegación de implementación.** El leader delega toda implementación de `app/` a `implementer` o `implementer-high` (Haiku 5.5), salvo un **cambio mínimo**: hasta 10 líneas en no más de 2 archivos, solo pruebas, fixtures, configuración de pruebas o texto, y sin lógica de producto, migraciones, contratos, autorización, concurrencia ni seguridad. Todo lo demás, y cualquier duda, se delega. Un cambio mínimo hecho por el leader se declara: `executedBy` con `agent: leader`, motivo `cambio mínimo`, archivos y líneas tocados, y la línea `Modelo:` del reporte. No se fragmenta un cambio mayor en varios mínimos. Ver `harness/roles/leader.md` y `AGENTS.md`.

**Modo fuera de casa.** Desactivado por defecto; solo el usuario lo activa o desactiva, expresamente en chat (el leader nunca lo activa por inferencia). Se registra en `harness/state.json` como `awayMode: { enabled, activatedBy: "user", activatedAt, quote }` y, al desactivarse, `deactivatedAt` y `deactivationQuote`. Mientras `awayMode.enabled` sea `true`, la revisión independiente de cada WI la hace el agente `reviewer` (Sonnet 5.5 / medium) en lugar del `human-reviewer`, sin delegación WI por WI. No cambia: las decisiones `DEC` y las aprobaciones de alcance o contrato siguen siendo del usuario (ante una, `DECISION_REQUIRED` y esa parte queda aparcada, sin `W-DONE`); no autoriza push, PR ni infraestructura externa; no relaja ningún gate; `maxReviewCycles` sigue en 2 y, al agotarse, queda pendiente para el usuario sin inventar aprobación; un reviewer no independiente del implementer no cuenta.

**Merge reviewer.** Toda fusión de una rama de tercero o de integración se revisa con el agente `merge-reviewer` (Sonnet 5.5 / medium, rol `harness/roles/merge-reviewer.md`) antes de entrar en `feature/jean`, `develop` o `main` y antes de publicarla. Revisa la fusión completa (no el trabajo de un WI), escribe `harness/reports/merge-review-<scope>.md` y no hace push ni merge: el usuario ordena la fusión. El Modo fuera de casa no lo sustituye ni lo relaja; no sustituye decisiones `DEC` ni aprobaciones del usuario.

## Gates

Los valores son `G-NOT_RUN`, `G-PASSED`, `G-FAILED`, `G-NOT_APPLICABLE`. Para `W-DONE` pasan `sddVerified`, `implementationCompleted`, `independentReviewPassed`, `technicalChecksPassed`, `interopSyncChecked`, `noBlockingDecisions` y `retryLimitRespected`. Si `contractImpact=true`, pasan además `contractReviewed` y `canonicalContractSynced`. `contractSyncPublished` pasa solo si `publishesContract=true` y hay evento en outbox; de lo contrario es `G-NOT_APPLICABLE`. Cada gate tiene evidencia reproducible.

Contract Sync se ejecuta en `start`, `implementation-delivery`, `before-review` y `before-done`. Todo evento relevante que no esté `C-RESOLVED` bloquea el gate interop. No se inventa un endpoint ni se modifica el consumidor a partir de una notificación.

Los Contract Sync nuevos usan `CS-CORE-*`, `CS-CONSOLE-*`, `CS-SANDBOX-*` o `CS-GH-*` y requieren `sourceWorkItem` de ese componente. Los IDs simples anteriores al corte siguen legibles sin reescritura. Este Harness solo valida WIs de su propio repositorio; dependencias entre componentes requieren comprobar manualmente el estado/evidencia del WI origen además de importar y resolver su evento. `dependsOn` no acepta IDs de otro repo.

Las importaciones de Contract Sync registran `consumerImportedAt` local. El validador de completions ignora eventos que llegaron después del `closedAt` del snapshot histórico, sin excluirlos para WIs activos o futuros; los eventos antiguos sin marca se tratan de forma conservadora.

## Validación local

```sh
node scripts/sdd-check.mjs
node harness/validate-work-items.mjs
node harness/validate-harness.mjs
```

Al seleccionar trabajo de servicio, añadir comandos de lint, test y build del paquete real. No hacer push, PR, merge ni cambios de infraestructura externa sin solicitud explícita del usuario.

**Perfiles y escalamiento:** los perfiles de agentes viven en `harness/agent-profiles.yaml` y se materializan en `.claude/agents/`. El leader puede escalar `implementer` a `implementer-high` (Haiku Low → High) sin permiso, con motivo trazado; nunca Haiku → Sonnet automáticamente (`BLOCKED`/`DECISION_REQUIRED`). El reviewer independiente por defecto es el `human-reviewer` (usuario).
