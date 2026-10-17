# WI-GH-012 — Evidencia PostgreSQL aislada para prueba multi-instancia

Se usó únicamente una PostgreSQL temporal de prueba, vacía y exclusiva para GitHub Integration, suministrada fuera del repositorio mediante `GITHUB_CHECK_COORDINATION_TEST_DATABASE_URL`. No es la URL de Core/Supabase, no es `app-postgres-1`, no se guardó en `.env` y no se imprimió en esta evidencia.

La prueba opt-in ejecutó la migración aditiva de forma idempotente y verificó con dos instancias `CheckCoordinationStore` independientes: una sola obtiene el lease compartido, un lease vencido se reclama con fencing token mayor y la transición del dueño vencido falla cerrada. Resultado: `pnpm test -- --run src/github/check-coordination.store.integration.spec.ts` — 182 pruebas aprobadas, 0 omitidas.

Esta evidencia acredita exclusivamente la prueba local desechable. No provisiona, configura ni declara existente una PostgreSQL administrada de despliegue, backups, alertas, acceso operativo o cutover.
