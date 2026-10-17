# [reviewer::GPT-6 Luna / xhigh] · WI-GH-012 · revisión independiente final de Checks

Modelo configurado: `gpt-6-luna` · modelo servido: `unknown` · esfuerzo: `xhigh`

## Veredicto

**CHANGES_REQUESTED**. La coordinación PostgreSQL, el replay terminal para una respuesta `422` sin candidatos y la sincronización contractual están implementados. Falta alinear una rama de reconciliación con GH-INTEROP-1.6. Además, no pude volver a ejecutar la integración PostgreSQL porque la base temporal ya no está disponible; el reporte previo sí registra que pasó.

## Hallazgos

### [P1] Un candidato encontrado tras el `422` no se adopta ni actualiza

En `app/src/github/github-publication.service.ts:134-137`, si la búsqueda completa posterior al `POST` `422` encuentra exactamente un Check de identidad coincidente, el servicio conserva `CREATE_UNKNOWN`, guarda el `checkId` y responde `503`. GH-INTEROP-1.6, sección “Checks”, exige adoptar/actualizar ese único candidato; solo varios candidatos quedan `AMBIGUOUS`. La prueba en `app/src/github/github-publication.service.spec.ts:164-192` codifica el comportamiento actual.

Esto evita un segundo `POST`, pero difiere el resultado contractual a un retry posterior. Para cumplir el contrato, adoptar el `checkId` y aplicar el `PATCH`; si la actualización queda incierta, conservar `UPDATE_UNKNOWN` y fallar cerrado.

### [P2] La evidencia PostgreSQL no se pudo reproducir durante esta revisión

La corrida autorizada del test opt-in contra `127.0.0.1:55439` terminó con `ECONNREFUSED`. La inspección de contenedores tampoco encontró `gh-check-coordination-test`. El reporte previo `harness/reports/wi-gh-012-dedicated-db-test-decision.md` afirma que la corrida anterior pasó con 182 pruebas y 0 omitidas, incluida la migración idempotente, concurrencia de dos stores y fencing. No pude volver a confirmar ese resultado en esta revisión. La suite disponible sin esa base pasó 180 pruebas y omitió las 2 pruebas PostgreSQL opt-in.

### [P2] Las referencias de evidencia de gates siguen apuntando a reportes anteriores

En `harness/state.json`, los gates `implementationCompleted` y `technicalChecksPassed` aparecen como `G-PASSED`, pero `gateEvidence` aún referencia `wi-gh-012-implementation-blocked.md`; ese reporte describe la implementación como parcial y bloqueada. Hay evidencia posterior en `wi-gh-012-create-rejected-implementation.md` y `wi-gh-012-dedicated-db-test-decision.md`, pero no está enlazada como evidencia de implementación completa. Actualizar estas referencias y retirar o marcar como supersedidas las afirmaciones obsoletas antes del cierre.

## Contratos y Harness

- Los contratos SYSTEM-2.7, INTEROP-2.8 y GH-INTEROP-1.6 coinciden byte a byte con Core en `4246685534bfdbb2de631c526cebce6ebb51ac99`. SHA-256 local/Core: SYSTEM `4d14f5b2204287bdff88060a51578cc97443e93b34a729059a5427cff67b3f5d`; INTEROP `755c3357ca047ede9fb318a40a594cc68a63fc63f2b9f4c58af93c28f51a8d90`; GH `dd02c32f89efc463c06165ce9ead785b8afeee782e464c4e6f7b1d4a532a167e`.
- `CS-CORE-20261011-005` está `C-RESOLVED` con evidencia de sincronización. `CS-GH-20261011-002` sigue `C-PENDING`, dirigido a Core; el checkpoint `before-review` registrado no tiene Contract Sync entrantes pendientes.
- El WI está `W-IN_REVIEW`. Gates visibles: SDD, implementación, checks técnicos, revisión contractual, espejo canónico, publicación Contract Sync, sincronización interop y decisiones bloqueantes figuran aprobados; `independentReviewPassed` y `retryLimitRespected` aún no están registrados. El tercer ciclo está documentado como excepción única autorizada por el usuario.

## Verificaciones ejecutadas

- `node scripts/sdd-check.mjs`: pasó.
- `node harness/validate-work-items.mjs`: pasó (12 WI).
- `node harness/validate-harness.mjs`: pasó.
- `pnpm test -- --run`: 180 pasaron, 2 omitidas (integración PostgreSQL opt-in).
- `pnpm lint`, `pnpm build` y `git diff --check`: pasaron.
- `pnpm exec vitest run src/github/check-coordination.store.integration.spec.ts` con la URL de prueba autorizada: no pudo conectar; no aplicó la migración. La base temporal no está disponible.

## Aprovisionamiento y despliegue

Esta revisión no aprovisionó ni desplegó recursos. La evidencia del WI dice que la integración se ejecutó previamente contra una PostgreSQL temporal desechable y separada; no declara aprovisionada una base administrada de despliegue, ni backups, alertas o cutover. No inspeccioné infraestructura externa.

## Siguiente paso

Corregir la reconciliación de un candidato único tras `422`, renovar la evidencia de los gates y volver a acreditar el test PostgreSQL multi-instancia con una base aislada autorizada. Mantener el WI abierto hasta una revisión conforme.
