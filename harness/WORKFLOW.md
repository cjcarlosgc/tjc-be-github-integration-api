# Harness V3 — GitHub Integration

El Harness ejecuta **work items locales** en `harness/work-items.json`. La planificación global de épicas, HU, OC e ideas vive en `spec/`; `harness/state.json` conserva el WI activo y snapshots verificables al cerrarlos. Ver `spec/constitution/planning-model.md` para identidades y estados.

## Ciclo de un WI

`W-PLANNED → W-READY → W-SELECTED → W-SPEC_VERIFIED → W-AWAITING_APPROVAL → W-IN_PROGRESS → W-IN_REVIEW → W-DONE`. `W-BLOCKED`, `W-DECISION_REQUIRED` y `W-CANCELLED` son salidas explícitas con motivo/evidencia. Un WI terminado se retira de `activeWorkItem`; su snapshot, reporte y Git conservan evidencia. `W-READY` exige HU, taskIds, componente, criterios, dependencias y rutas. Solo puede existir un WI activo local.

1. **Pre-tarea:** leader selecciona WI, verifica `dependsOn`, hace PULL Contract Sync `start` y asigna análisis SDD, decisiones `Blocks`, criterios, límites y riesgos. Contract-reviewer evalúa cambios contractuales. Cambio funcional, arquitectónico o de contrato requiere aprobación humana antes de implementar.
2. **Durante la tarea:** implementer trabaja el corte aprobado. Subtareas independientes pueden correr en paralelo; dependencias reales se respetan. Antes de entregar: PULL `implementation-delivery`, checks y evidencia.
3. **Post-tarea:** PULL `before-review`, revisión independiente y contract-reviewer si aplica. Por defecto revisa el usuario: recibe diff, criterios, checks y evidencia, y emite veredicto. Solo por solicitud explícita se delega a un agente `reviewer`. El leader consolida handoffs, resuelve hallazgos (máximo dos ciclos), hace PULL `before-done`, valida gates y registra el cierre. La revisión acumulada previa al push es distinta.

Las asignaciones pueden quedar vacías antes de designar responsables. En `W-IN_REVIEW`, `implementationAgent` y `reviewAgent` deben identificar responsables distintos; usa `human-reviewer` por defecto y `reviewer` solo si el usuario delegó. Un handoff aprobado no es por sí mismo un gate aprobado.

## Gates

Los valores son `G-NOT_RUN`, `G-PASSED`, `G-FAILED`, `G-NOT_APPLICABLE`. Para `W-DONE` pasan `sddVerified`, `implementationCompleted`, `independentReviewPassed`, `technicalChecksPassed`, `interopSyncChecked`, `noBlockingDecisions` y `retryLimitRespected`. Si `contractImpact=true`, pasan además `contractReviewed` y `canonicalContractSynced`. `contractSyncPublished` pasa solo si `publishesContract=true` y hay evento en outbox; de lo contrario es `G-NOT_APPLICABLE`. Cada gate tiene evidencia reproducible.

Contract Sync se ejecuta en `start`, `implementation-delivery`, `before-review` y `before-done`. Todo evento relevante que no esté `C-RESOLVED` bloquea el gate interop. No se inventa un endpoint ni se modifica el consumidor a partir de una notificación.

Los Contract Sync nuevos usan `CS-CORE-*`, `CS-CONSOLE-*`, `CS-SANDBOX-*` o `CS-GH-*` y requieren `sourceWorkItem` de ese componente. Los IDs simples anteriores al corte siguen legibles sin reescritura. Este Harness solo valida WIs de su propio repositorio; dependencias entre componentes requieren comprobar manualmente el estado/evidencia del WI origen además de importar y resolver su evento. `dependsOn` no acepta IDs de otro repo.

## Validación local

```sh
node scripts/sdd-check.mjs
node harness/validate-work-items.mjs
node harness/validate-harness.mjs
```

Al seleccionar trabajo de servicio, añadir comandos de lint, test y build del paquete real. No hacer push, PR, merge ni cambios de infraestructura externa sin solicitud explícita del usuario.
