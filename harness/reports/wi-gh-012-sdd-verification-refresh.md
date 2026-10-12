# WI-GH-012 — Verificación SDD renovada · Corte B

**Resultado:** `SPEC_VERIFIED` para implementación local de la coordinación durable de Checks. Este informe reemplaza la conclusión de bloqueo de decisión del reporte anterior `wi-gh-012-spec-verification.md`; no acredita implementación, provisión, despliegue ni cutover.

**Handoff:** [sdd-analyst::GPT-6 Luna / high] · WI-GH-012 · Corte B
**Modelo:** sdd-analyst · configurado gpt-6-luna · atendido unknown · esfuerzo high
**Ejecución:** `executedBy.configuredModel: gpt-6-luna`, `servedModel: unknown`, `effort: high`.

## Verificación

- **Contrato y decisión:** `CS-CORE-20261011-004` está importado y `C-ACKNOWLEDGED`; sus tres rutas están reflejadas byte por byte según el reporte de acuse. `GH-INTEROP-1.5` registra la decisión aprobada `DEC-CHECK-002`: PostgreSQL administrado, dedicado y bajo ownership de GitHub Integration para coordinación técnica compartida. Está separado de la persistencia de dominio Core/Supabase. No se selecciona proveedor ni se autoriza provisionar o desplegar el recurso.
- **Semántica:** spec y plan preservan `200 { checkId }`, identidad exacta `(repositoryId, appId, headSha, name)` con comparación exacta del nombre, búsqueda paginada, adopción única y `409 GITHUB_CHECK_IDENTITY_AMBIGUOUS` para varios candidatos. Exigen reserva/claim compartidos entre instancias, persistir `CREATE_UNKNOWN`/`UPDATE_UNKNOWN` antes de POST/PATCH, reconciliar sin reintento ciego y fallar cerrado con `503 GITHUB_CHECK_COORDINATION_UNAVAILABLE` cuando la coordinación no es verificable. La garantía no es exactly-once.
- **Cobertura operativa:** el WI requiere migración aditiva, concurrencia con al menos dos instancias, pruebas de fallos antes/después de llamadas remotas, tombstones, retención, backup, alertas, runbook y drenado de instancias antiguas. Los detalles normativos de estados, transición y retención remiten a GH-INTEROP-1.5, evitando una especificación local contradictoria.
- **Trazabilidad:** `WI-GH-012` declara `HU14`, `HU16` y `ST-GH-014`; `tasks.md` enlaza explícitamente esos mismos IDs. HU16 es el valor de la feature de publicación; el WI vincula HU14 con la fiabilidad de Checks del flujo PR automatizado. Backlog conserva las historias globales sin duplicarlas.
- **Límites:** el WI actualiza la excepción de tech stack solo para PostgreSQL técnico propio. El task, plan, spec y criterios excluyen provisión, despliegue y cutover; no trasladan decisiones de dominio a Integration ni autorizan cambios en Core/Console/Sandbox.

## Hallazgos y blockers

No encontré contradicciones de alcance o contrato que bloqueen `SPEC_VERIFIED`. La decisión arquitectónica ya está resuelta en Core; no hace falta abrir otra decisión. La selección del proveedor administrado y la operación externa siguen fuera de este WI y requieren su autorización/gates separados.

El registro local todavía muestra `WI-GH-012` como `W-DECISION_REQUIRED` en `harness/work-items.json` y `harness/state.json`, aunque el `decisionGate` vigente enumera `blockingDecisionIds: []` y `DEC-CHECK-002` como no bloqueante. Esto es una transición Harness pendiente, no un blocker de especificación: el leader debe registrar la nueva evidencia y mover el WI por el estado/gates aplicables antes de implementar. El reporte previo de especificación también conserva alcance GH-INTEROP-1.3/1.4 y no debe usarse como evaluación vigente.

## Siguiente paso recomendado

El leader registra este reporte en el handoff del WI, refresca el estado Harness desde `W-DECISION_REQUIRED` a `W-SPEC_VERIFIED` conforme al validador/protocolo local, conserva `DEC-CHECK-002` como decisión no bloqueante y verifica Contract Sync inicial. Después puede pasar a revisión contractual e implementación local acotada a `app/`, migración técnica y evidencia operativa; no provisionar PostgreSQL ni desplegar.
