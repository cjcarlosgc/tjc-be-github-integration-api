# [implementer-high::GPT-6 Luna / high] · WI-GH-012 · Corte C

Modelo: implementer-high · configurado `gpt-6-luna` · atendido `unknown` · esfuerzo `high`

```yaml
executedBy:
  agent: implementer-high
  configuredModel: gpt-6-luna
  servedModel: unknown
  effort: high
```

## Operación local preparada

- La base debe ser PostgreSQL técnico dedicado, de ownership de GitHub Integration y separada de Core/Supabase. Este corte no selecciona proveedor, aprovisiona la base ni cambia recursos externos.
- Aplicar `app/migrations/001_github_check_coordination.sql` con el procedimiento de migración autorizado antes de iniciar la versión que depende de ella. La app no migra automáticamente: readiness solo acepta esquema versión `1`, y `POST /internal/v1/github/checks` falla cerrado con `503 GITHUB_CHECK_COORDINATION_UNAVAILABLE` si URL, conexión o esquema no están disponibles.
- `GITHUB_CHECK_COORDINATION_DATABASE_URL` debe apuntar a esa base y mantenerse fuera del repositorio, logs y reportes. La cuenta de runtime debe tener únicamente los permisos requeridos para leer/insertar/actualizar reservas; no necesita modificar el historial append-only de reconciliación. La identidad, claims y los logs no contienen tokens ni payload de dominio.
- Privilegios mínimos previstos para runtime: `CONNECT` a la base y `USAGE` en el schema; `SELECT` en `github_check_schema_version`; `SELECT`, `INSERT` y `UPDATE` en `github_check_coordination`; `USAGE` en `github_check_fencing_seq` para `nextval`. No conceder permisos de escritura sobre `github_check_reconciliation_audit`, permisos de DDL, `CREATE` en el schema, `DELETE` de reservas ni `UPDATE`/`DELETE` de auditoría. El rol operador de solo lectura requiere `SELECT` sobre `github_check_coordination`; las operaciones auditadas usan un rol separado con permisos insert-only sobre la tabla de auditoría. Ajustar nombres de database/schema al entorno; no se selecciona proveedor ni se provisiona aquí.
- Antes de habilitar varias instancias, desplegar el esquema y la versión compatible; drenar todas las instancias anteriores que usaban lock local. No permitir convivencia durante el cutover. Estos son requisitos operativos futuros, no acciones autorizadas por este WI.

## Reconciliación y tombstones

1. Ante `CREATE_UNKNOWN`, `UPDATE_UNKNOWN` o `RECONCILIATION_REQUIRED`, mantener el endpoint cerrado para la identidad. Un retry consulta la misma reserva; un create incierto pagina todos los candidatos, y un update incierto hace GET del `checkId`. Nunca repetir POST/PATCH solo porque el GET o la búsqueda no encontraron el cambio.
2. Revisar repositorio, App, SHA y nombre exactos; completar paginación y comparar `name` bytewise. Un candidato puede adoptarse; más de uno queda `AMBIGUOUS` y no se crea ni actualiza otro Check.
3. Una ausencia remota no libera `CREATE_UNKNOWN`. Solo evidencia independiente de rechazo/no-creación puede justificar resolución. `ABANDONED` es terminal. Una transición operativa requiere operador autorizado, segundo responsable independiente y una fila insert-only en `github_check_reconciliation_audit`, con identidad, estado previo/nuevo, actor, aprobador, fecha, motivo y SHA-256 de la referencia de evidencia. No editar ni borrar auditoría.
4. Los estados inciertos, ambiguos, rechazados y abandonados son tombstones: no expiran ni se purgan automáticamente. Los activos se retienen mientras exista la identidad/repositorio. Purga solo después de confirmar eliminación del repo, 90 días de gracia, cero estados sin resolver y respaldo archivado verificable.

## Backup, alertas y guardia

- Configurar backup/PITR del PostgreSQL técnico y probar restauración periódicamente antes del cutover. La retención externa del backup debe cubrir cualquier purga operativa; este cambio no configura infraestructura ni políticas del proveedor.
- Alertar sobre indisponibilidad/conexiones agotadas, schema version no soportada, edad/cantidad de `CREATE_UNKNOWN`, `UPDATE_UNKNOWN`, `RECONCILIATION_REQUIRED`, `AMBIGUOUS` y `ABANDONED`, leases expirados y errores de claim/fencing. No registrar nombres ni secretos como etiquetas métricas; usar contadores y edades agregadas.
- Para una falla, pausar reintentos automáticos de la identidad afectada; comprobar DB/schema y lease; revisar la búsqueda paginada/GET remoto; preservar el estado; escalar al operador de GitHub Integration. Resolver solo con evidencia y aprobación dual, registrándolo primero en la auditoría append-only. Una DB restaurada debe conservar tombstones y secuencias de fencing antes de aceptar tráfico.

Consulta operativa concreta (ejecutar con un rol operador read-only). Produce conteo y edad por estado, además de leases expirados y estados de reconciliación/terminales; es una consulta puntual, no un exporter ni una alerta ya configurada:

```sql
SELECT state,
       COUNT(*) AS identity_count,
       clock_timestamp() - MIN(updated_at) AS oldest_state_age,
       COUNT(*) FILTER (WHERE lease_until IS NOT NULL AND lease_until < clock_timestamp()) AS expired_lease_count,
       clock_timestamp() - (MIN(lease_until) FILTER (WHERE lease_until IS NOT NULL AND lease_until < clock_timestamp())) AS oldest_expired_lease_age,
       COUNT(*) FILTER (WHERE state IN (
         'CREATE_UNKNOWN', 'UPDATE_UNKNOWN', 'RECONCILIATION_REQUIRED',
         'AMBIGUOUS', 'CREATE_REJECTED', 'ABANDONED'
       )) AS reconciliation_or_terminal_count
FROM github_check_coordination
GROUP BY state
ORDER BY state;
```

La fila `CREATE_REJECTED` representa un rechazo remoto solo cuando la respuesta confirma no-creación; su replay wire todavía requiere decisión contractual. La consulta ayuda a inspeccionar volumen/edad y no implica que señales externas, alertas o dashboards estén instalados.

## Límite y evidencia

Este documento prepara la operación prevista por `GH-INTEROP-1.5`; no afirma que DB administrada, backups, alertas, multi-réplica de despliegue, drenado o cutover existan o hayan sido ejecutados. La prueba de concurrencia contra PostgreSQL usa opcionalmente `GITHUB_CHECK_COORDINATION_TEST_DATABASE_URL` apuntando a una base de prueba aislada.

La implementación local añade reserva única bytewise, lease con token de fencing, persistencia de estados inciertos antes de POST/PATCH, reconciliación de update por GET y readiness ligada a la versión del esquema. En la corrida de este corte: `pnpm test -- --run src/github/check-coordination.store.integration.spec.ts` tuvo 182 pruebas aprobadas, incluida la integración opt-in con dos stores y migración idempotente sobre una PostgreSQL temporal aislada; `pnpm lint`, `pnpm build`, `git diff --check`, SDD check y validadores Harness pasaron. Contract Sync `implementation-delivery` continúa bloqueado por eventos relevantes sin resolver; además `CS-GH-20261011-002` solicita a Core la revisión canónica del error `CREATE_REJECTED`. La prueba no provisionó ni configuró una base administrada de despliegue.

Pendientes relacionados: [replay de `CREATE_REJECTED`](wi-gh-012-create-rejected-replay-decision.md) y [base PostgreSQL aislada para la prueba multi-instancia](wi-gh-012-dedicated-db-test-decision.md).
