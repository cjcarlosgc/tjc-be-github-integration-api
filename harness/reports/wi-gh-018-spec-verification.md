# WI-GH-018 — Verificación SDD

Modelo: sdd-analyst · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo low

Estado: `SUFFICIENT`.

- Alcance: importar/acusar `CS-CORE-20261021-004` (ya `C-ACKNOWLEDGED`, evidencia `wi-gh-018-contract-sync-acknowledgement.md`) y re-espejar byte a byte `system-contract.md` (SYSTEM-2.14) e `interoperability-contract.md` (INTEROP-2.19) desde Core. STANDARD, `contractImpact=true`, documental; alcance aprobado en `wi-gh-018-scope-approval.md`. Sin código, sin cambio de GH-INTEROP-1.8, sin push/PR/merge.
- IDs: `HU02`, `HU14` y `ST-GH-020` (`T-READY`, WI-GH-018, `tasks.md:12`, línea ya añadida sin commit) coinciden con `harness/work-items.json` (WI-GH-018, `W-SELECTED`, component GH, `taskIds [ST-GH-020]`). ST-GH-019 ya está `T-DONE`.
- Decisiones (decision gate): no hay DEC local. `DEC-EXP-005` (APROBADO 2026-10-21, enmienda `DEC-EXP-004`) trae `Blocks: NONE`; `DEC-EXP-004` (APROBADO 2026-10-08) afecta solo la configuración del LLM de Core. Ambas son internas de Core (variables `LLM_*`, experimentos); Integration no tiene LLM ni experimentos. Ningún `Blocks` alcanza WI-GH-018.
- Core (solo lectura): HEAD real `d0a10de`; `3d2383e4` es ancestro y `git diff 3d2383e4 HEAD -- spec/contracts` está vacío, sin cambios sin commitear en `spec/` de Core. Los contratos son los de `sourceRevision`.
- Hashes (local vs Core):
  - `system-contract.md`: local `b70f9358...0444` (SYSTEM-2.13) vs Core `f60d6c4b...6ce3` (SYSTEM-2.14, coincide con el esperado). Difiere.
  - `interoperability-contract.md`: local `22b880d1...e311` (INTEROP-2.18) vs Core `f9866d16...c6f9` (INTEROP-2.19, coincide con el esperado). Difiere.
  - `github-integration-contract.md`: `6c553ee8...5565a` idéntico (GH-INTEROP-1.8); no se recopia.
  - árbol `spec/contracts/schemas`: local = Core = `a1ba9a19...9091` (coincide con el esperado); `diff -rq` vacío. Sin cambios.
  - `git status` de `app/` y `spec/contracts/` limpio: nada tocado aún.
- Diff local -> Core:
  - `system-contract.md`: cabecera (SYSTEM-2.13/2026-10-18 -> SYSTEM-2.14/2026-10-21); nota de enmienda bajo `DEC-EXP-004` y nueva sección `DEC-EXP-005` (configuración única del LLM: `LLM_MODEL` por defecto `gpt-6-luna`, `LLM_REASONING_EFFORT` obligatorio, sin lista de combinaciones, esfuerzo rechazado = fallo `UNKNOWN` sin reintento, 422 solo por temperatura con `supportedEfforts ['none']`, variables retiradas); línea «Sin cambio de rutas, DTO, enums ni códigos de error»; párrafo de historial de versión SYSTEM-2.14.
  - `interoperability-contract.md`: cabecera (INTEROP-2.19, compatible con SYSTEM-2.14); párrafo de versión vigente (§1) con 2.19 y 2.18 pasada a historia; §6.5.1 (cita de `DEC-EXP-004` enmendada, modelo/esfuerzo de la configuración única, `422 REASONING_EFFORT_UNSUPPORTED` solo por temperatura, rechazo de esfuerzo = repetición fallida `UNKNOWN`, precedencia del 422). Todo es de experimentos/OE5 de Core (`POST /experiments`).
  - Confirmación: es puramente documental. No toca GH-INTEROP, el error envelope (§4/§4.1, esquema), rutas de Integration, Checks ni el límite UI GitHub (§6.14). El 422 de experimentos no pasa por Integration; el código `REASONING_EFFORT_UNSUPPORTED` no está en `app/src` (grep de `LLM_MODEL`, `gpt-4o`, `REASONING_EFFORT` sin resultados en `app/src`, `AGENTS.md`, `README.md`, `spec/README.md`).
  - Esquemas y `app/src/contracts/generated/`: no cambian (esquemas idénticos); `contracts:generate` no debe producir diff. No se editan a mano.
- Citas documentales a INTEROP-2.18 / SYSTEM-2.13:
  - VIGENTES, a pasar a SYSTEM-2.14 / INTEROP-2.19: `AGENTS.md:19` («Actualmente rigen ...»); `spec/README.md:5` (cabecera de espejos) y `spec/README.md:13` (primera mención, «son copias espejo ...»; revisar también fecha/estado del espejo en esa línea). `CHANGELOG.md`: añadir entrada WI-GH-018 arriba (no editar entradas previas).
  - HISTORIA, no tocar: segunda mención en `spec/README.md:13` («homologación a SYSTEM-2.13 / INTEROP-2.18 / GH-INTEROP-1.8» con WI-GH-016, WI-GH-013/014); `CHANGELOG.md` entradas WI-GH-013..017; `tasks.md:7-11` (ST-GH-016..019, texto de tareas cerradas).
  - Sin cita versionada: `README.md` y `spec/constitution/project-context.md` (grep sin coincidencias; no tocar; la nota de WI-GH-016 que los mencionaba ya no aplica).
  - Comentarios de `app/src` con «INTEROP-2.18»: `error-envelope.ts:14`, `error-envelope.contract.spec.ts:10`, `contracts/contract-validator.ts:5`. Son citas de §4/§10, secciones que 2.19 no cambia: siguen siendo verdaderas. Recomendación: NO tocarlas (documental, sin código; ST-GH-020 y el alcance aprobado no incluyen `app/src`; evita ruido y diff de código en un WI sin código). Si el usuario las quiere en 2.19, sería ampliación de alcance, no necesaria. Solo comentarios, pero igualmente fuera de alcance.
  - `app/src/contracts/generated/contract-types.ts` y `contract-schemas.ts` (citas INTEROP-2.18/2.17/2.16): provienen de las descripciones de los esquemas JSON, que no cambian; no se editan a mano y no procede tocarlos.
- Riesgos: (1) `tasks.md` (ST-GH-020), `state.json`, `work-items.json`, el inbox `-004` y los reportes 018 figuran sin commit: no mezclar con otros cambios. (2) El prompt cita `3d2383e4` y el HEAD de Core es `d0a10de`: sin diferencia contractual. (3) Al cerrar, marcar ST-GH-020 `T-DONE` (`[x]`). (4) Opcional del inbox para Console (`errors.ts`), no aplica a Integration.
- `W-DECISION_REQUIRED`: no necesario.

## Handoff

- status: SUFFICIENT
- findings: IDs y ST-GH-020 coinciden; ningún Blocks alcanza el WI (`DEC-EXP-005` Blocks NONE, `DEC-EXP-004` interna de Core); `system` e `interoperability` difieren y coinciden con los hashes esperados de Core; `github-integration` y el árbol de esquemas idénticos; el diff es documental (configuración del LLM/experimentos de Core) y no toca nada que Integration implemente; citas vigentes: `AGENTS.md:19`, `spec/README.md:5,13`; comentarios de `app/src` y generados no se tocan.
- blockers: ninguno.
- filesAffected: `spec/contracts/system-contract.md`, `spec/contracts/interoperability-contract.md` (reemplazo desde Core), `AGENTS.md`, `spec/README.md`, `CHANGELOG.md`, `spec/features/006-console-github-api/tasks.md` (ST-GH-020 a `T-DONE`), reporte de implementación `harness/reports/wi-gh-018-*.md`; resolución de `CS-CORE-20261021-004` vía leader. Sin cambios en `app/` ni en `spec/contracts/schemas/`.
- evidence: sha256 locales/Core arriba; `diff` de ambos contratos; `diff -rq` de `schemas` vacío y receta del árbol igual en ambos lados; `git diff 3d2383e4 HEAD -- spec/contracts` vacío en Core; greps de citas versionadas en AGENTS.md, README.md, spec/, app/src, harness.
- recommendedNextStep: leader pasa a `W-SPEC_VERIFIED`; copiar desde Core ambos contratos con `cp`, verificar `cmp` y los 4 hashes; actualizar `AGENTS.md:19`, `spec/README.md:5,13` y CHANGELOG sin reescribir historia; marcar ST-GH-020; `contracts:check`, lint, test y build (esperado sin cambios generados); validadores del harness; derivar a contract-reviewer y reviewer independiente (máx. 2 ciclos).
