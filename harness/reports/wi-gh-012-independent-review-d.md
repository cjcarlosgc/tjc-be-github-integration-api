# [reviewer::GPT-6 Luna / xhigh] · WI-GH-012 · Corte D

Modelo: reviewer · configurado `gpt-6-luna` · atendido `unknown` · esfuerzo `xhigh`

## Veredicto

**BLOCKED — no aprobado.** La revisión técnica encontró dos desvíos contractuales corregibles. Además, PULL `before-review` continúa bloqueado, no hay evidencia PostgreSQL multi-instancia y siguen abiertas las dos tarjetas de decisión. No marco `independentReviewPassed`.

## Findings

### [P1] Los reintentos de `AMBIGUOUS` y `ABANDONED` no conservan su respuesta contractual

`CheckCoordinationStore.claim` (`app/src/github/check-coordination.store.ts:46`) trata ambos estados igual y lanza `GITHUB_CHECK_COORDINATION_UNAVAILABLE` con `retryable: true`. Para `AMBIGUOUS`, el primer intento responde correctamente `409 GITHUB_CHECK_IDENTITY_AMBIGUOUS`, pero los siguientes responden `503` reintentable. Para `ABANDONED`, el contrato exige `503 GITHUB_CHECK_COORDINATION_UNAVAILABLE` con `retryable: false`. Esto permite reintentos innecesarios y rompe la respuesta estable de la reserva. Faltan pruebas de replay para los dos estados.

**Siguiente acción:** mapear cada estado persistido a la respuesta fijada por `GH-INTEROP-1.5` y probar respuestas repetidas sin mutar GitHub.

### [P1] Un Check `ACTIVE` podado por GitHub nunca se reconcilia por identidad

Cuando PATCH al `checkId` guardado devuelve 404, `createCheck` lo convierte en `UPDATE_UNKNOWN`. Los retries consultan únicamente ese mismo ID mediante `checkMatches`; si el GET también devuelve 404, conservan `UPDATE_UNKNOWN` y devuelven 503 sin paginar la identidad completa. Esto contradice `spec/contracts/github-integration-contract.md:75`: ante un ID ausente, buscar la identidad completa, reparar con un único candidato, marcar ambigüedad si hay varios y bloquear sin recrear si hay cero. En el caso de un Check conservado con ID nuevo, la identidad queda bloqueada indefinidamente pese a existir un único candidato válido.

**Siguiente acción:** distinguir el 404 confirmado del fallo no verificable; hacer búsqueda completa por repositorio/App/SHA/nombre y cubrir candidato único, múltiple y cero sin permitir POST nuevo.

### [P1 — DECISION_REQUIRED] `CREATE_REJECTED` sigue sin productor ni replay neutral

La migración y el tipo incluyen el estado, y `claim` permite que una huella corregida pase a `RESERVED`; no se encontró una transición productora de `CREATE_REJECTED`, persistencia de la clase neutral del rechazo ni replay del rechazo original. Para la misma huella, `claim` devuelve el 503 genérico reintentable. El `catch` de la creación continúa tratando cualquier rechazo/error como `CREATE_UNKNOWN`.

`GH-INTEROP-1.5` exige conservar y reproducir el rechazo para la misma huella, pero la tabla de errores no define el código HTTP/retryability del rechazo ni el envelope que se reproduce. La tarjeta [wi-gh-012-create-rejected-replay-decision.md](wi-gh-012-create-rejected-replay-decision.md) identifica correctamente esa decisión pendiente. No inventé la semántica ni cambié código/contrato; el hallazgo queda bloqueado hasta decisión canónica.

### [P1 — evidencia externa pendiente] No se acreditó coordinación real entre instancias

`app/src/github/check-coordination.store.integration.spec.ts` implementa una prueba optativa con dos stores independientes, pero `GITHUB_CHECK_COORDINATION_TEST_DATABASE_URL` no está configurada y la prueba se omite. No usé `app-postgres-1`, no provisioné una base y no apliqué la migración. Sin esa prueba no se acredita el unique constraint, el claim/lease transaccional ni el fencing sobre PostgreSQL real. La tarjeta [wi-gh-012-dedicated-db-test-decision.md](wi-gh-012-dedicated-db-test-decision.md) sigue pendiente; corresponde usar una DB de prueba dedicada autorizada/configurada o esperar autorización para prepararla localmente.

### Findings anteriores: evidencia añadida en el corte D

- **Fallos pre-write:** las pruebas nuevas verifican que el servicio no envíe POST ni PATCH cuando falla la persistencia de `CREATE_UNKNOWN`/`UPDATE_UNKNOWN`.
- **Fallo post-remote/persistencia:** se prueba POST/PATCH remoto exitoso seguido de fallo al guardar `ACTIVE`; el retry reconcilia y no repite la mutación remota.
- **Fencing:** una prueba verifica que una transición con fencing token vencido sea rechazada; la prueba multi-instancia que usaría PostgreSQL real sigue omitida. No encontré una prueba de expiración de lease mientras la llamada remota permanece en curso.
- **Consulta y permisos operativos:** el runbook ahora incluye una consulta read-only que agrupa por estado e informa antigüedad, leases vencidos y estados de reconciliación; documenta `CONNECT`, `USAGE` del schema, `SELECT` de versión, `SELECT/INSERT/UPDATE` de reservas y `USAGE` de secuencia para runtime, sin DDL, `DELETE` ni escritura en auditoría. El operador queda read-only y la auditoría usa un rol separado insert-only. Esto queda documentado, no aplicado ni probado contra una DB real; tampoco afirma que métricas/alertas o backups estén instalados.

## Blockers de PULL y Harness

- PULL `before-review` devolvió ocho IDs en `relevantPendingSyncIds`, todos `C-ACKNOWLEDGED`, no `C-RESOLVED`: `CS-CORE-20261008-004`, `CS-CORE-20261008-006`, `CS-CORE-20261008-007`, `CS-CORE-20261009-012`, `CS-CORE-20261010-001`, `CS-CORE-20261010-002`, `CS-CORE-20261011-003` y `CS-CORE-20261011-004`. No los resolví. Acuse no equivale a implementación.
- El WI sigue `W-IN_PROGRESS`. En `harness/state.json`, `implementationCompleted`, `independentReviewPassed`, `technicalChecksPassed`, `contractSyncPublished`, `interopSyncChecked` y `retryLimitRespected` permanecen `G-NOT_RUN`; no actualicé state ni registré cierre.
- La decisión `DEC-CHECK-002` no autoriza provisión, despliegue ni cutover. La base dedicada de prueba tampoco se provisionó.

## Evidencia ejecutada

- `node harness/contract-sync.mjs check --checkpoint before-review --work-item WI-GH-012`: ejecutado; bloqueado por los ocho eventos anteriores.
- `node scripts/sdd-check.mjs`: pasó (`SDD check OK`).
- `node harness/validate-work-items.mjs`: pasó (12 WI).
- `node harness/validate-harness.mjs`: pasó (Harness V3).
- En `app/`, `pnpm test`: pasó, 170 tests aprobados y 1 PostgreSQL multi-instancia omitido; `pnpm lint`: pasó; `pnpm build`: pasó. La variable de conexión de prueba no está configurada.
- `git diff --check`: pasó.
- Inspección de diff/código: store, servicio, migración, pruebas unitarias/integración optativa, health readiness y runbook operativo. No hubo llamadas a GitHub ni a PostgreSQL.

## Files affected

Este reporte es el único archivo escrito por esta revisión. Archivos inspeccionados: `app/src/github/check-coordination.store.ts`, `app/src/github/github-publication.service.ts`, `app/migrations/001_github_check_coordination.sql`, `app/src/github/check-coordination.store.spec.ts`, `app/src/github/check-coordination.store.integration.spec.ts`, `app/src/github/github-publication.service.spec.ts` y `harness/reports/wi-gh-012-check-coordination-operations.md`.

**Blockers:** respuestas de replay para estados terminales; recuperación de `ACTIVE` cuando el `checkId` guardado ya no existe; decisión de replay `CREATE_REJECTED`; DB aislada para evidencia multi-instancia; PULL `before-review` bloqueado y gates Harness aún no registrados.

**Recommended next step:** corregir los dos hallazgos contractuales de código y añadir sus pruebas; pedir/resolver las dos decisiones pendientes sin inferirlas; con la base dedicada autorizada, ejecutar la prueba multi-instancia y verificar la migración. Después, resolver Contract Sync solo con evidencia local, repetir PULL `before-review` y solicitar nueva revisión independiente. No cerrar el WI ni habilitar infraestructura/cutover con este reporte.
