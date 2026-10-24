# WI-GH-016 — Verificación SDD

Modelo: sdd-analyst · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo low

Estado: `SUFFICIENT`.

- Alcance: importar/acusar `CS-CORE-20261021-002` (ya `C-ACKNOWLEDGED`, evidencia `wi-gh-016-contract-sync-acknowledgement.md`), re-espejar `interoperability-contract.md` (INTEROP-2.18) y `spec/contracts/schemas/` byte a byte desde Core, regenerar tipos, confirmar tolerancia a `code` abierto. STANDARD, `contractImpact=true`, `publishesContract=false`; alcance aprobado en `wi-gh-016-scope-approval.md`. Sin cambio de comportamiento ni de GH-INTEROP, sin push/PR/merge.
- IDs: `HU02`, `HU14` y `ST-GH-018` (`T-READY`, WI-GH-016, `tasks.md:10`) coinciden con `harness/work-items.json` (WI-GH-016, `W-SELECTED`, component GH, `taskIds [ST-GH-018]`). ST-GH-017 ya está `T-DONE`.
- Decisiones: no hay DEC local propia. Aplicables solo por cita desde Core: `DEC-ERR-001` (PROPOSED, `Blocks: NONE`) y `DEC-RT-001` (APPROVED; solo afecta WebSocket de Core). `DEC-VAL-001` sigue `PENDING` (ingestión/despliegue con código empresarial), ajena. Ningún `Blocks` alcanza WI-GH-016.
- Core: HEAD real `aa0dcc7` (el prompt citaba `c4d1731`, que existe y es ancestro). `5c82853` es ancestro de HEAD y `git diff 5c82853 HEAD -- spec/contracts` está vacío: los contratos son idénticos en ambos puntos y en `sourceRevision`.
- Hashes (local vs Core):
  - `system-contract.md` `b70f9358...0444`: idéntico (SYSTEM-2.13).
  - `github-integration-contract.md` `6c553ee8...5565a`: idéntico (GH-INTEROP-1.8).
  - `interoperability-contract.md`: local `b9ed40dc...0a05` (INTEROP-2.17) vs Core `22b880d1...e311` (INTEROP-2.18, coincide con el esperado). Difiere.
  - árbol `schemas`: local `c45e4513...1b31` vs Core `a1ba9a19...9091` (coincide con el esperado). Difiere.
- Cambios 2.17 → 2.18 (diff de 129 líneas en el contrato):
  - §4 / §4.1 (nuevo, DEC-ERR-001, aditivo): 12 códigos genéricos (UNAUTHORIZED 401, FORBIDDEN 403, NOT_FOUND 404, METHOD_NOT_ALLOWED 405, NOT_ACCEPTABLE 406, CONFLICT 409, PAYLOAD_TOO_LARGE 413, UNSUPPORTED_MEDIA_TYPE 415, UNPROCESSABLE_ENTITY 422, TOO_MANY_REQUESTS 429 retryable, SERVICE_UNAVAILABLE 503 retryable, HTTP_ERROR otro 4xx) más INTERNAL_ERROR para 500/502/504/5xx sin código. Mensaje fijo en español, `details: null`; el código explícito de la aplicación prevalece; `code` es string abierto; 400 sigue `INVALID_REQUEST`; Core emite `retryable` solo en genéricos. La nota declara que GitHub Integration conserva su política propia (4xx no previstos → `INVALID_REQUEST`) y no se modifica.
  - §6.6 (tiempo real, DEC-RT-001): suscripciones `analysis-run` y `experiment`, eventos `analysis-run:update` y `experiment:update`, throttle 1500 ms, post-commit, best-effort sin replay; handshake WebSocket sin sesión rechazado con `AUTH_REQUIRED` (único cambio incompatible, solo WebSocket de Core). Fila Reader de §6.13 ampliada.
  - §6.5 / §6.10: `targetId` reemplaza `analysisRunId`/`symbol` en el experimento; `history?` opcional/pendiente.
  - Esquemas: `error-envelope.schema.json` solo cambian descripciones de `code`, `message`, `retryable` (forma idéntica); nuevo `realtime-events.schema.json`; `examples/manifest.json` +6 entradas; 6 ejemplos nuevos (`error-envelope.generic.json` y 5 `realtime-*`).
- Impacto en `app/` (sin cambio de código):
  - `github-ui-core-client.ts` lee `code` como `unknown` y lo limita a una lista cerrada de 6 códigos (`knownCoreErrorCode`/`mapCoreError`, exige además coincidencia de estado). Cualquier otro código —abierto, genérico de §4.1 (p. ej. 401 `UNAUTHORIZED`, 429, 503 `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`) o ausente— cae en `coreAuthorizationUnavailable()` (falla cerrada, log `UNRECOGNIZED`). Se tolera hoy sin cambio y coincide con la política propia. Efecto aceptable: los genéricos reintentables de Core se degradan al error propio, sin reintento específico (no hay exigencia contractual de lo contrario).
  - `ErrorEnvelope.code` ya es `string` en los tipos generados; `retryable?` ya existe. No hay uso de WebSocket en `app/` (§6.6 sin impacto).
  - `contracts:generate`/`contracts:check` (en `app/package.json`) leen todos los `*.schema.json`: tras el re-espejo regenerarán `contract-types.ts` y `contract-schemas.ts` DISTINTOS (comentarios JSDoc de `code`/`message`/`retryable` y nuevos tipos y esquema de `realtime-events`). Es cambio generado esperado, sin efecto de comportamiento; `contracts:check` fallará hasta regenerar. Revisar que los contract tests que recorren `examples/manifest.json` acepten los 6 ejemplos nuevos (si el validador no soporta `realtime-events`, sería ajuste de test/script, no de runtime; confirmar al ejecutar).
- Referencias documentales a actualizar (hoy en 2.17): `AGENTS.md:19`, `spec/README.md:5,13` (y fecha/estado de espejo), `README.md:11` (si cita versión), `spec/constitution/project-context.md:13`, `CHANGELOG.md` (entrada WI-GH-016 sobre `Unreleased`; no tocar historia), `tasks.md` (marcar ST-GH-018 `T-DONE` al cerrar). Verificar con grep `INTEROP-2.17` que no queden citas vigentes.
- Riesgos: (1) `tasks.md` ya figura modificado sin commit y el inbox tiene eventos sin rastrear (`-001`, `-003`): no mezclarlos; `CS-CORE-20261021-001/003` no están en este alcance. (2) El prompt citó HEAD `c4d1731`; HEAD real es `aa0dcc7` sin diferencia contractual. (3) El generador absorbe `realtime-events` aunque GH no lo use; alcance aceptado.
- `W-DECISION_REQUIRED`: no necesario; no hace falta código ni DEC. Se activaría solo si `contracts:check`/tests exigieran cambios de `app/` más allá de los archivos generados.

## Handoff

- status: SUFFICIENT
- findings: IDs y ST-GH-018 coinciden; ningún Blocks alcanza el WI; `system` y `github-integration` idénticos a Core; `interoperability` y árbol de esquemas difieren y coinciden con los esperados de Core; `code` abierto y genéricos de §4.1 se toleran hoy (lista cerrada, falla cerrada a 503 propio) sin cambio de código; `contracts:generate` producirá tipos/esquemas distintos (esperado).
- blockers: ninguno.
- filesAffected: `spec/contracts/interoperability-contract.md`, `spec/contracts/schemas/**` (2 modificados, 7 nuevos), `app/src/contracts/generated/contract-types.ts` y `contract-schemas.ts` (regenerados), `AGENTS.md`, `spec/README.md`, `README.md` (si aplica), `spec/constitution/project-context.md`, `CHANGELOG.md`, `spec/features/006-console-github-api/tasks.md`, reporte de implementación `harness/reports/wi-gh-016-*.md`; resolución de `CS-CORE-20261021-002` vía leader.
- evidence: sha256 locales/Core arriba; `diff -rq` de `schemas`; `diff` del contrato; `git diff 5c82853 HEAD -- spec/contracts` vacío en Core; lectura de `github-ui-core-client.ts` (líneas 82-88, 143-165), `contract-types.ts:28-40`, `scripts/generate-contract-types.mjs:14`.
- recommendedNextStep: leader pasa a `W-SPEC_VERIFIED`; copiar desde Core `interoperability-contract.md` y `schemas/` (reemplazo completo, incluidos archivos nuevos), verificar `cmp` y hashes; `pnpm contracts:generate` luego `contracts:check`, lint, test y build; actualizar referencias a INTEROP-2.18; validadores del harness; derivar a contract-reviewer y reviewer (máx. 2 ciclos).
