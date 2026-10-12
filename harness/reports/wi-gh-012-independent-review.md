# [reviewer::GPT-6 Luna / xhigh] · WI-GH-012 · Corte C

Modelo configurado: `gpt-6-luna` · modelo servido: `unknown` · esfuerzo: `xhigh`

## Veredicto

**CHANGES_REQUESTED**. La implementación preserva el principio fail-closed frente a incertidumbre, pero no implementa la transición recuperable `CREATE_REJECTED` exigida por `GH-INTEROP-1.5` y carece de la evidencia de PostgreSQL multi-instancia requerida. No se aprueba el gate independiente en este estado.

## Findings

### [P1] No se implementa ni persiste `CREATE_REJECTED`

`app/src/github/github-publication.service.ts:112-124` persiste `CREATE_UNKNOWN` antes del POST, pero su `catch` convierte cualquier error en `CREATE_UNKNOWN`, sin distinguir una respuesta HTTP que confirme rechazo de una respuesta ambigua (timeout, desconexión, 5xx o fallo al persistir). Así, un rechazo inequívoco queda como tombstone incierto permanente; un request corregido no puede continuar conforme al contrato.

El store contempla `CREATE_REJECTED` en `app/src/github/check-coordination.store.ts:50-60`, pero no hay productor de ese estado ni se guarda su clase neutral: `app/migrations/001_github_check_coordination.sql:15-34` no tiene columna para ello. El endpoint tampoco reproduce el rechazo guardado para el mismo hash como prescribe el contrato. La suite no cubre rechazo confirmado, replay del mismo request ni corrección con huella distinta.

**Corrección requerida:** clasificar solo respuestas que demuestren rechazo/no-creación como `CREATE_REJECTED`, conservar la huella y una clase neutral reproducible, devolver el rechazo guardado ante replay idéntico y permitir que un request corregido vuelva a `RESERVED` únicamente tras búsqueda completa de cero candidatos. Mantener `CREATE_UNKNOWN` para resultados no concluyentes.

### [P1] Falta evidencia real del mecanismo compartido

El criterio del WI exige concurrencia entre al menos dos instancias conectadas al mismo PostgreSQL. `app/src/github/check-coordination.store.integration.spec.ts:8-10` marca esa prueba como `skip` cuando falta `GITHUB_CHECK_COORDINATION_TEST_DATABASE_URL`; la evidencia entregada reporta una prueba omitida y confirma que la migración no fue aplicada. Las 24 pruebas enfocadas que ejecuté no sustituyen esta evidencia: son mocks/unitarias.

Esto no autoriza aprovisionar recursos externos. Antes de aprobar el comportamiento concurrente hace falta una base PostgreSQL de prueba aislada autorizada/configurada, ejecutar la prueba multi-instancia y aplicar/verificar la migración en esa base. Hasta entonces no se demuestra la restricción única, `FOR UPDATE`, secuencia de fencing ni compatibilidad del esquema real.

### [P2] Cobertura de fallos y fencing incompleta

La prueba `never repeats a POST after its result is uncertain` cubre una respuesta 500 y la reconciliación de update verifica un GET por `checkId`; no encontré pruebas para fallo de escritura del estado previo al POST/PATCH, éxito remoto seguido por fallo al persistir `ACTIVE`, expiración del lease mientras la llamada remota sigue en curso, ni respuestas de rechazo inequívoco. Tampoco hay un test que pruebe que una instancia con token de fencing vencido no puede confirmar una transición posterior.

Añadir esos escenarios a la suite de store/servicio y a la integración PostgreSQL (cuando sea aplicable). Son los puntos que evidencian que los estados inciertos y el fencing cubren fallos antes y después de cada mutación externa, como requieren el plan y el WI.

### [P2] Alertas descritas, pero no hay señal de estado por identidad/edad

`harness/reports/wi-gh-012-check-coordination-operations.md:27-31` pide alertas por estado, antigüedad de tombstones, leases vencidos y errores de fencing. En el código revisado no hay métricas/exporter ni una consulta/vista operativa preparada que produzca esas señales; readiness (`app/src/health/health.controller.ts:21-47`) solo comprueba configuración y conectividad/versión del esquema. Por tanto, el runbook enumera alertas futuras, pero no demuestra que puedan observarse hoy. Tratarlo como pendiente operativo antes del cutover; no afirma que se haya configurado infraestructura externa.

## Bloqueos de gates

- El Contract Sync PULL ejecutado con `node harness/contract-sync.mjs check --checkpoint before-review --work-item WI-GH-012` devolvió como `relevantPendingSyncIds` ocho eventos: `CS-CORE-20261008-004`, `CS-CORE-20261008-006`, `CS-CORE-20261008-007`, `CS-CORE-20261009-012`, `CS-CORE-20261010-001`, `CS-CORE-20261010-002`, `CS-CORE-20261011-003` y `CS-CORE-20261011-004`. Todos aparecen como `C-ACKNOWLEDGED`, no `C-RESOLVED`; no los modifiqué. El checkpoint debe repetirse y registrarse cuando el leader haya satisfecho los prerrequisitos Harness.
- En `harness/state.json`, `implementationCompleted`, `technicalChecksPassed`, `independentReviewPassed`, `contractSyncPublished`, `interopSyncChecked` y `retryLimitRespected` aún están `G-NOT_RUN`. No se debe cerrar ni marcar `W-DONE` por este reporte.
- El WI continúa local, sin migración aplicada ni despliegue. La decisión `DEC-CHECK-002` no autoriza seleccionar/provisionar el proveedor ni hacer cutover.

## Evidencia ejecutada

- `node scripts/sdd-check.mjs`: pasó (`SDD check OK`).
- `node harness/validate-work-items.mjs`: pasó (12 WI).
- `node harness/validate-harness.mjs`: pasó (Harness V3).
- `git diff --check`: pasó.
- `pnpm exec vitest run src/github/github-publication.service.spec.ts src/github/check-coordination.store.spec.ts`: pasó, 24 tests. La prueba PostgreSQL multi-instancia no está en este comando y no se ejecutó.
- PULL `before-review`: ejecutado, **no pasó** por los ocho eventos enumerados.
- El reporte de implementación comunica `pnpm test` (165 pasaron, 1 integración PostgreSQL omitida), lint y build exitosos; no pude verificar la prueba con una base real porque no está configurada.

## Archivos afectados por la revisión

- `app/src/github/github-publication.service.ts`
- `app/src/github/check-coordination.store.ts`
- `app/migrations/001_github_check_coordination.sql`
- `app/src/github/github-publication.service.spec.ts`
- `app/src/github/check-coordination.store.integration.spec.ts`
- `app/src/health/health.controller.ts`
- `harness/reports/wi-gh-012-check-coordination-operations.md`

**Blockers:** transición `CREATE_REJECTED` ausente; evidencia PostgreSQL compartida pendiente; Contract Sync `before-review` no resuelto; gates Harness de implementación/revisión aún no registrados.

**Siguiente paso recomendado:** corregir y probar `CREATE_REJECTED`; luego obtener/usar una base PostgreSQL de prueba aislada autorizada para correr la prueba multi-instancia y verificar la migración. El leader debe resolver eventos solo tras cumplir `implementationCompleted`, ejecutar y registrar PULL/checks en orden, y solicitar una nueva revisión independiente. Mantener sin cambios la infraestructura externa y no cerrar el WI mientras quede evidencia requerida pendiente.
