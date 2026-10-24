Modelo: reviewer · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo low

# WI-GH-020 — Revisión independiente

Veredicto: **APPROVED** (hallazgos solo P2/P3, no bloqueantes). Ciclo de revisión 1 de 2. La revisión no sustituye la aprobación de alcance ni el reporte del `contract-reviewer`, que no se leyó ni se esperó.

## Verificación

1. Pruebas (`app/src/github-webhooks/github-webhook-event.contract.spec.ts`): no tautológicas. Los 15 ejemplos se validan contra el `definition` del manifest, con conteo afirmado (15 = 13 + 2; coincide con los 15 archivos en disco). El normalizador se ejercita con payloads GitHub inline y se valida su salida con Ajv strict. Hay caso negativo real (sin `deliveryId`) y caracterización de `action` de 101 caracteres, con rechazo en `/action`. Esto demuestra que el esquema no es vacuo. Robustez: la ruta sale de `import.meta.url`, sin depender del cwd; no hay dependencia del reloj en las aserciones (el `new Date` del `it.each` es fijo y los dos casos de kind no afirman `receivedAt`); el orden de las pruebas es independiente. El estilo es el del repo.
2. Cero cambios en producción, `generated/` y `spec/contracts`: confirmado con `git status` y `git diff --stat -- app spec/contracts`. Solo el spec nuevo es untracked dentro de `app/`. `spec/features/006-console-github-api/tasks.md` añade ST-GH-022 (T-IN_PROGRESS, `[ ]`), coherente con el WI.
3. Harness: WI-GH-020 en `work-items.json` (STANDARD, contractImpact=true, publishesContract=false, `dependsOn WI-GH-019`, HU02/HU14, ST-GH-022) coherente con `state.json`. Checkpoints `start`, `implementation-delivery` y `before-review` presentes, con `pendingRelevantSyncIds` vacío. Gates: `independentReviewPassed`, `contractReviewed` y `canonicalContractSynced` en G-NOT_RUN (esperado), `contractSyncPublished` en G-NOT_APPLICABLE, el resto en G-PASSED. DEC-VAL-001 figura como no bloqueante. `git grep` de tokens, claves, cadenas postgres e IPs en los archivos del WI: sin coincidencias.
4. Salidas reales:

| Comando | Resultado |
|---|---|
| `node scripts/sdd-check.mjs` | `SDD check OK`, exit 0 |
| `node harness/validate-work-items.mjs` | `Work item validation passed (GH, 20 WI)`, exit 0 |
| `node harness/validate-harness.mjs` | `Harness V3 validation passed`, exit 0 |
| `node harness/validate-completions.mjs` | `Completion validation passed (19 completed WI)`, exit 0 |
| `git diff --check` | sin salida, exit 0 |
| `pnpm lint` | `oxlint src`, exit 0 |
| `pnpm test` | 21 archivos, 254 pruebas en verde, exit 0 |
| `pnpm build` | `nest build`, exit 0 |
| `pnpm contracts:check` | exit 0 |

## Hallazgos

- **P2 — la prueba "cada variante cae en su kind" no cubre lo que dice.** Solo comprueba `TEAM` e `IGNORED`; la verificación de `PULL_REQUEST`, `REPOSITORY`, `INSTALLATION`, `INSTALLATION_REPOSITORIES`, `ORGANIZATION`, `MEMBERSHIP` y `MEMBER` queda implícita (la unión oneOf valida cualquier variante). Un normalizador que emitiera un kind equivocado pero estructuralmente válido para otra rama pasaría. Sugerencia: añadir la columna `kind` esperado a la tabla `it.each` y afirmarla. El `sdd-analyst` lo pedía («cada variante cae exactamente en su kind»). No bloquea: el esquema discrimina por `kind` y los ejemplos canónicos lo cubren.
- **P3 — falta la aserción opcional de ejemplo adulterado** (campo extra, `schemaVersion: 2`). Está compensada por los dos casos negativos existentes.
- **P3 — el informe de implementación no lista `tasks.md` entre los archivos tocados**, aunque el cambio previo es de ST-GH-022 y es coherente. El cierre (T-DONE, `[x]`) corresponde al leader.
- **P3 — el implementer afirma "sin cambios en state.json/work-items.json"** mientras el árbol los muestra modificados. Son cambios del leader, previos al implementer; sin impacto.

## Handoff estructurado

- status: APPROVED
- findings: ver P2 y los P3 anteriores; sin P0/P1.
- blockers: ninguno. Pendiente de proceso: reporte del `contract-reviewer` (gates `contractReviewed` y `canonicalContractSynced`) y las aprobaciones del leader/usuario correspondientes.
- filesAffected: revisados `app/src/github-webhooks/github-webhook-event.contract.spec.ts`, `harness/state.json`, `harness/work-items.json`, `spec/features/006-console-github-api/tasks.md`, informes `wi-gh-020-*`; escrito `harness/reports/wi-gh-020-independent-review.md`.
- evidence: tabla de comandos anterior (salida real) y `git status`/`git diff --stat` sin cambios en producción, `generated/` ni `spec/contracts`.
- recommendedNextStep: el leader puede registrar `independentReviewPassed` tras el reporte del `contract-reviewer`; opcionalmente el implementer endurece la prueba de kind (P2) antes del commit en `feature/jean` con `Refs: HU02, HU14`; luego cerrar ST-GH-022.

## Ciclo 2 (de 2)

Veredicto final: **APPROVED**.

- P2 resuelto: la tabla `it.each` incluye ahora el kind esperado de las 17 variantes y afirma `normalized.data.kind` (se retiró la prueba parcial de TEAM/IGNORED; el total de pruebas sigue en 254).
- P3 resuelto: nuevo caso que clona `github-webhook-event.pull-request.opened.json`, borra `pullRequest.title` y exige `valid:false`; el clon se lee del disco en cada ejecución, sin mutar el archivo.
- Informe del contract-reviewer (`harness/reports/wi-gh-020-contract-review.md`) leído: APPROVED, sin P0-P2; su único P3 (negativo sobre ejemplo canónico) quedó atendido.
- Diff real: `git status` sin cambios en producción, `generated/` ni `spec/contracts`; solo el spec nuevo en `app/`.
- Re-ejecución con salida real, exit 0 en todas: sdd-check OK; validate-work-items (GH, 20 WI) OK; validate-harness OK; validate-completions (19) OK; `git diff --check` limpio; `pnpm lint`, `pnpm test` (21 archivos, 254 pruebas), `pnpm build` y `pnpm contracts:check` OK.

Handoff estructurado (ciclo 2):
- status: APPROVED
- findings: sin P0-P3 abiertos.
- blockers: ninguno.
- filesAffected: `app/src/github-webhooks/github-webhook-event.contract.spec.ts` (nuevo), informes `wi-gh-020-*`, `spec/features/006-console-github-api/tasks.md`, `harness/state.json`, `harness/work-items.json`.
- evidence: lista anterior y `harness/reports/wi-gh-020-contract-review.md`.
- recommendedNextStep: el leader registra `independentReviewPassed`, `contractReviewed` y `canonicalContractSynced`, marca ST-GH-022 `[x]`/T-DONE, y commitea en `feature/jean` con `Refs: HU02, HU14`; sin push/PR/merge salvo orden del usuario.
