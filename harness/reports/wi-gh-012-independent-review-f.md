# [reviewer::GPT-6 Luna / xhigh] · WI-GH-012 · Revisión independiente de replay tras 422

Modelo configurado: `gpt-6-luna` · modelo servido: `unknown` · esfuerzo: `xhigh`

## Veredicto

**CHANGES_REQUESTED para el WI completo.** La corrección específica solicitada por la revisión E está aprobada: si un POST responde HTTP 422 y la reconciliación completa encuentra un Check de identidad exacta, el servicio adopta su `checkId`, persiste la transición y lo actualiza con PATCH sin un segundo POST. No encontré un desvío contractual en esa ruta. No puedo aprobar el gate global mientras la evidencia PostgreSQL del WI tenga una inconsistencia verificable.

## Hallazgo pendiente

### [P2] El resultado PostgreSQL registrado no corresponde al comando citado

`harness/reports/wi-gh-012-dedicated-db-test-decision.md` y `harness/reports/wi-gh-012-check-coordination-operations.md` atribuyen `182 pruebas aprobadas, 0 omitidas` a `pnpm test -- --run src/github/check-coordination.store.integration.spec.ts`. Ese selector ejecuta solamente `check-coordination.store.integration.spec.ts`, que contiene dos casos `it`; no puede producir 182 resultados. En esta revisión, al ejecutar Vitest para ese archivo sin la base temporal disponible, observé `1 Test File skipped; 2 Tests skipped`. La prueba focal del arreglo posterior a E sí pasó.

La evidencia previa puede corresponder a una corrida de la suite completa con PostgreSQL habilitada, pero el comando y el total quedaron registrados de forma incompatible y no hay salida de consola adjunta que permita confirmar cuál corrida ocurrió. Actualizar el reporte con el comando exacto y su salida verificable, o volver a ejecutar la integración con una base de prueba aislada autorizada. La base administrada de despliegue puede seguir pendiente; esta revisión no intenta provisionarla.

## Revisión del arreglo posterior a E

- En `app/src/github/github-publication.service.ts`, la rama posterior al 422 hace una segunda búsqueda completa. Cero candidatos persiste `CREATE_REJECTED` y devuelve el error neutral; uno persiste `ACTIVE` y cae al flujo `UPDATE_UNKNOWN → PATCH → ACTIVE`; varios persisten `AMBIGUOUS`; una búsqueda incompleta conserva el estado incierto y falla con 503.
- El mismo hash se reproduce desde el estado durable sin POST/PATCH; el cuerpo de respuesta GitHub no se lee ni se incorpora al error neutral.
- `app/src/github/github-publication.service.spec.ts`, caso `adopts and updates a matching Check found after a 422`, verifica `checkId: 321`, un único POST y un único PATCH al candidato. Lo ejecuté directamente: **1 aprobado**.
- El contrato `GH-INTEROP-1.6`, sección Check y reglas de creación, requiere adoptar/actualizar el candidato único; el comportamiento coincide. Los hashes locales revisados coinciden con la evidencia de `wi-gh-012-gh-interop-1-6-sync.md`: SYSTEM-2.7 `4d14f5b2204287bdff88060a51578cc97443e93b34a729059a5427cff67b3f5d`, INTEROP-2.8 `755c3357ca047ede9fb318a40a594cc68a63fc63f2b9f4c58af93c28f51a8d90`, GH-INTEROP-1.6 `dd02c32f89efc463c06165ce9ead785b8afeee782e464c4e6f7b1d4a532a167e`.
- `CS-CORE-20261011-005` está `C-RESOLVED` con evidencia de importación. `CS-GH-20261011-002` continúa `C-PENDING`; GH-INTEROP-1.6 ya incluye el error y replay aprobados. No cambié estados Contract Sync.
- El reporte `wi-gh-012-post-review-fix.md` describe 180 pruebas locales y dos pruebas PostgreSQL opt-in omitidas, lint, build, diff-check y validadores aprobados. `CHANGELOG.md` aún dice que falta la evidencia PostgreSQL, por lo que conviene actualizar esa afirmación junto con la corrección del reporte de corrida.

## Verificaciones de esta revisión

- Test focal `adopts and updates a matching Check found after a 422`: pasó (1 test).
- Prueba de integración PostgreSQL apuntada por archivo sin URL de test: omitida (2 tests), base no disponible.
- `node scripts/sdd-check.mjs`: pasó.
- `node harness/validate-work-items.mjs`: pasó (12 WIs).
- `node harness/validate-harness.mjs`: pasó.
- `pnpm lint`, `pnpm build` y `git diff --check`: pasaron.

Esta revisión solo escribió este reporte. No edité producto ni estado Harness, no ejecuté migraciones, no provisioné infraestructura y no hice push, PR ni deploy. El WI permanece abierto a la espera de corregir/acreditar la evidencia indicada y registrar los gates de revisión correspondientes.
