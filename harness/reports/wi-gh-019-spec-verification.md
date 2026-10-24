# WI-GH-019 — Verificación SDD

Modelo: sdd-analyst · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo low

Estado: `SUFFICIENT`.

- Alcance: importar/acusar `CS-CORE-20261024-001` y `-004` (ambos `C-ACKNOWLEDGED`), re-espejar byte a byte `system-contract.md` (SYSTEM-2.16), `interoperability-contract.md` (INTEROP-2.21), `github-integration-contract.md` (GH-INTEROP-1.9) y `spec/contracts/schemas/` desde Core, regenerar tipos, citas vigentes. STANDARD, `contractImpact=true`. Sin cambio de wire ni de comportamiento; sin push/PR/merge.
- IDs: `HU02`, `HU14` y `ST-GH-021` (`T-READY`, WI-GH-019, `tasks.md:13`) coinciden con `harness/work-items.json` (WI-GH-019, línea 905) y con `harness/state.json` (activo, línea 4097).
- Decisiones: no hay DEC local propia. Las DEC citadas por Core (`DEC-EXP-004/005`, prosa neutralizada en SYSTEM-2.16) son del flujo de Core; `DEC-VAL-001` sigue `PENDING` y es ajena. Ningún `Blocks` alcanza WI-GH-019 (no se cambia ingestión, código empresarial ni comportamiento de Integration).
- Core: HEAD `8ea4e99`. `git diff 2318b9df HEAD -- spec/contracts` vacío: los contratos no cambiaron después de la `sourceRevision` de `-004`.
- Hashes (local vs Core):
  - `system-contract.md`: local `f60d6c4b...6ce3` (SYSTEM-2.14) vs Core `d0a492b4...ea77` (SYSTEM-2.16, coincide con el esperado). Difiere.
  - `interoperability-contract.md`: local `f9866d16...c6f9` (INTEROP-2.19) vs Core `7f946d55...d29d` (INTEROP-2.21, coincide). Difiere.
  - `github-integration-contract.md`: local `6c553ee8...5565a` (GH-INTEROP-1.8) vs Core `dedf00fa...c6e4` (GH-INTEROP-1.9, coincide). Difiere.
  - árbol `schemas`: local `a1ba9a19...9091` vs Core `8079ab73...9718` (coincide). Difiere.
- Diff local → Core:
  - GH-INTEROP-1.8 → 1.9: aditiva y documental. Cita el esquema CT-01 como forma canónica del payload del webhook; regla `eventName`↔`kind`; tope de `action` de 100 caracteres (informativo para Integration, sin obligación nueva de emisión); párrafo de brechas esquema vs parser de Core y notas de que Integration es más estricto (`deliveryId` ≤128, sin caracteres de control, rechaza `title`/`ref`/`sha` vacíos). «Sin cambio de wire ni de rutas».
  - Schemas: nuevo `github-webhook-event.schema.json` y 15 ejemplos `github-webhook-event.*`; `examples/manifest.json` con 15 entradas nuevas; además `examples/sandbox-result.failed.json` cambia `code` de `COMPOSER_INSTALL_FAILED` a `DEPENDENCY_INSTALL_FAILED` (no estaba en el resumen del alcance; es un ejemplo, no un esquema).
  - INTEROP 2.19 → 2.21 (41 líneas de diff): versión/fecha/«Compatible con SYSTEM-2.16»; §6.5/6.5.1 neutralizan el LLM como comportamiento del adaptador (INTEROP-2.21); INTEROP-2.20: `ExperimentResultsResponse` emite `targetId` en vez de `analysisRunId`/`symbol` (errata E-01, alineación con el servidor de Core); lista de esquemas en §10 incluye el webhook; ajuste de prosa en webhooks (§ línea ~703) y tabla de roles (~1081).
  - SYSTEM 2.14 → 2.16 (27 líneas): prosa neutral de `DEC-EXP-004/005`, cambio de redacción del E2E, historial 2.15 y 2.16.
- Rutas/DTO/enums/códigos/wire: confirmado, ninguno que Integration deba implementar. `-004` declara no incompatible y sin cambio de rutas, DTO, enums, códigos ni esquemas; GH-INTEROP-1.9 declara sin cambio de wire. El `targetId` de resultados de experimento y los códigos del Sandbox (ejemplo) pertenecen a Core/Sandbox, no al alcance de Integration (no hay uso en `app/`; grep de `COMPOSER_INSTALL` en `app/src` vacío).
- Tipos generados: `scripts/generate-contract-types.mjs` lee todos los `*.schema.json`; añadirá a `contract-types.ts` y `contract-schemas.ts` las definiciones de `github-webhook-event` (`GithubWebhookEvent`, `GitHubWebhookAcceptedResponse`, etc.) y el bundle del esquema. `contracts:check` fallará hasta regenerar (cambio esperado; sin cambio en los demás esquemas). Nota: `-004` dice «generated/ sin cambio» respecto de INTEROP/SYSTEM, pero `-001` (webhook schema) sí lo cambia; no hay contradicción.
- Tests: ningún test recorre `examples/manifest.json` (solo `error-envelope.contract.spec.ts` usa `contract-validator`). Riesgo a confirmar al ejecutar: `contract-validator.ts` registra todos los esquemas en `Ajv2020({ strict: true })` con `ajv-formats`; si `github-webhook-event.schema.json` usa palabras clave o `format` no soportados, la carga fallaría para todos los tests. Se resuelve en implementación (ajuste de validador, no de runtime); si exige cambio de `app/` más allá de lo generado, `W-DECISION_REQUIRED`.
- Referencias documentales VIGENTES a pasar (SYSTEM-2.14 → 2.16, INTEROP-2.19 → 2.21, GH-INTEROP-1.8 → 1.9):
  - `AGENTS.md:19` (versiones vigentes) y `:41` (`GH-INTEROP-1.8 rige…`).
  - `spec/README.md:5, 13, 14` (cabecera, espejos, «Core es dueño canónico de GH-INTEROP-1.8»; mantener la historia de WI-GH-007/012 intacta).
  - `README.md:11`.
  - `spec/constitution/project-context.md:13` (diagrama).
  - `app/src/github/check-coordination.store.ts:82` (comentario; opcional, `GH-INTEROP-1.8` sigue siendo cierto históricamente para la regla de Checks, preferible actualizar a 1.9).
  - Comentarios en `app/src/contract-validator.ts:5` y `error-envelope.ts:14`, `error-envelope.contract.spec.ts:10` (`INTEROP-2.18`, ya desfasados; opcional).
  - `CHANGELOG.md` (nueva entrada WI-GH-019 sobre `Unreleased`); `tasks.md` (ST-GH-021 `T-DONE` al cerrar).
  - Historia que NO se toca: `harness/reports/wi-gh-0*.md`, eventos `CS-CORE-*`, `harness/state.json`/`work-items.json` de WIs previos, `CHANGELOG.md` previo, y los copias de contratos (se reemplazan completas).
- Riesgos: (1) árbol de trabajo con cambios sin commit (`state.json`, `work-items.json`, `tasks.md`, inbox, reportes de WI-GH-019): cuidar al commitear. (2) Se mantiene el espejo directo a SYSTEM-2.16/INTEROP-2.21 (sin pasar por 2.15/2.20), como exige `-004`. (3) Los 15 ejemplos y el cambio de `sandbox-result.failed.json` entran con el árbol completo.

## Handoff

- status: SUFFICIENT
- findings: IDs y ST-GH-021 coinciden; ningún Blocks alcanza el WI; los cuatro hashes de Core coinciden con los esperados de `-004` y no hay cambios de contrato posteriores a `2318b9df`; diff documental/aditivo sin cambios de wire para Integration; `contracts:generate` añadirá tipos/esquema de `github-webhook-event`; ningún test recorre el manifest; riesgo acotado: Ajv `strict` con el esquema nuevo.
- blockers: ninguno.
- filesAffected: `spec/contracts/system-contract.md`, `interoperability-contract.md`, `github-integration-contract.md`, `spec/contracts/schemas/**` (1 esquema nuevo, 15 ejemplos nuevos, `manifest.json` y `sandbox-result.failed.json` modificados), `app/src/contracts/generated/contract-types.ts` y `contract-schemas.ts`, `AGENTS.md`, `spec/README.md`, `README.md`, `spec/constitution/project-context.md`, comentarios en `app/src/` (opcional), `CHANGELOG.md`, `spec/features/006-console-github-api/tasks.md`, reporte de implementación `harness/reports/wi-gh-019-*.md`.
- evidence: `shasum -a 256` de los tres contratos y receta del árbol `schemas` (local y Core); `diff -rq` de schemas; `diff` de los tres contratos; `git diff 2318b9df HEAD -- spec/contracts` vacío en Core; lectura de `scripts/generate-contract-types.mjs`, `contract-validator.ts`, `CS-CORE-20261024-004.yaml`; grep de versiones vigentes.
- recommendedNextStep: leader pasa a `W-SPEC_VERIFIED`; copiar desde Core los tres contratos y `schemas/` (reemplazo completo) verificando `cmp` y los hashes; `pnpm contracts:generate`, luego `contracts:check`, lint, test y build (vigilar la carga de Ajv strict); actualizar referencias a SYSTEM-2.16/INTEROP-2.21/GH-INTEROP-1.9; validadores del harness; derivar a contract-reviewer y reviewer (máx. 2 ciclos).
