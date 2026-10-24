Modelo: reviewer · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

# WI-GH-015 — Revisión independiente (ciclo 1 de 2)

**Esta revisión es de un WI retroactivo.** Los commits e6beb06, b457533, ffc890b y a3ebecf (base 6a3ef5c) los ejecutó cross (`implementationAgent: cross`) antes de que existiera el WI. El revisor es independiente de cross y del leader. No se editó código, `state.json` ni `work-items.json`. Solo cubre comportamiento, pruebas, seguridad y alcance; el análisis contractual detallado corresponde a `contract-reviewer`.

**Veredicto: CHANGES_REQUESTED** (dos hallazgos menores de higiene y un gate del Harness aún sin pasar; ningún bloqueo funcional).

## Ejecución real (2026-10-18)

| Comando | Resultado |
| --- | --- |
| `node scripts/sdd-check.mjs` | `SDD check OK` |
| `node harness/validate-work-items.mjs` | `Work item validation passed (GH, 15 WI)` |
| `node harness/validate-harness.mjs` | **FALLA:** `interopSyncChecked must pass before review` (rc=1) |
| `node harness/validate-completions.mjs` | `Completion validation passed (14 completed WI)` |
| `pnpm lint` | oxlint sin errores |
| `pnpm test` | 19 archivos, 201 pruebas pasan |
| `pnpm build` | `nest build` sin errores |
| `pnpm contracts:check` | sin diferencias |
| `git diff --check` | limpio |
| `cmp` de los 3 contratos y `diff -r` de `schemas` frente a `../tjc-be-rag-core-api` | idénticos (SHA-256 `system b70f9358…`, `interop b9ed40dc…`, `github 6c553ee8…`) |

El estado del Contract Sync es coherente: `CS-CORE-20261018-001` figura `C-RESOLVED` con ambas evidencias.

## Hallazgos

### P2-1 — Gate `interopSyncChecked` en `G-NOT_RUN` con el WI en `W-IN_REVIEW`
`harness/state.json` tiene `interopSyncChecked: G-NOT_RUN` y existe el checkpoint `before-review` (2026-10-18T23:51:49Z) sin eventos pendientes, por lo que el gate debería pasarse con evidencia. El validador, que sigue siendo exigente, lo rechaza correctamente. Acción del leader: pasar el gate con evidencia del checkpoint y volver a ejecutar `validate-harness`. Es proceso, no defecto de código.

### P2-2 — e6beb06 deja una huella de token en HEAD
`harness/reports/e2e-production-runbook-2026-10-12.md:18` conserva la huella sha256 corta del `SANDBOX_SERVICE_TOKEN` del Sandbox (valor de 8 hex; no se reproduce aquí). El commit solo redactó el host/IP, y el objetivo declarado era higiene para repos públicos. Una huella corta no permite recuperar el token, pero identifica el secreto, reduce su costo de verificación y no aporta valor operativo. Acción: reemplazarla por un marcador. El valor del host/IP ya no está en HEAD (confirmado con `git grep`), pero sigue en el historial (7982f0c, 88bb881); eso exige reescritura o rotación y es decisión del usuario, no del WI (ver P3-1).

### P3-1 — Host/IP del Sandbox sigue en el historial de git
e6beb06 solo limpia el árbol de trabajo. Si el repo es público o se publica, el host sigue recuperable. Documentarlo como riesgo aceptado o decidir sobre reescritura o rotación del token y cambio de host. Requiere decisión del usuario.

### P3-2 — 4xx del framework se normaliza a 400, no solo a `INVALID_REQUEST`
En `internal-error.filter.ts` un 405, 415 o 406 se devuelve con status 400 (probado en `error-envelope.contract.spec.ts`). Es coherente con el contrato aditivo (no reintentable) pero pierde la semántica HTTP original (por ejemplo 405 con `Allow`). Aceptable; conviene que `contract-reviewer` confirme que INTEROP-2.17 §4 lo admite. Los 401/403 distintos de los ya mapeados caen también a 400; un 403 de framework sería más natural como 403. No bloqueante.

### P3-3 — Red de seguridad de proceso: dos puntos débiles
(a) `registerProcessSafetyNets` registra `error.message` en `unhandledRejection` y `uncaughtException`; un mensaje de error de librería podría arrastrar fragmentos de URL o cabeceras. El filtro HTTP sí evita loguear texto de excepción, así que la política es inconsistente. Sugerencia: loguear solo el nombre del error o el código. (b) `main.ts` hace `await app.close()` y luego `process.exit(exitCode)` sin tope de tiempo: si el cierre se cuelga, el proceso no termina y la plataforma no lo reinicia. Sugerencia: temporizador de respaldo. Además, mantener vivo el proceso ante `unhandledRejection` es una decisión de diseño explícita y documentada; correcta para este servicio, aunque puede ocultar fallos si no hay alertas sobre ese log.

### P3-4 — Cobertura de pruebas
La eviction del store está probada (TTL, estados de incertidumbre, entrada bloqueada) y no hay condición de carrera: la barrida es síncrona, descarta solo entradas `ACTIVE` sin bloqueo ni esperas, y `transition` exige la entrada bloqueada. Falta una prueba de que el barrido periódico dispara tras 200 claims (solo se prueba `evictIdleActive()` directo) y una de que un `claim` posterior a la expulsión vuelve a `RESERVED`. La prueba de `process-safety` no ejercita `main.ts`. Débil pero no engañosa.

### P3-5 — Inconsistencia documental menor
`wi-gh-015-external-dependency-gate.md` cita el HEAD de Core `2b8ac52`; `wi-gh-015-spec-verification.md` señala que el HEAD real era `71cb9b4` y hoy es `4e1227d`. Los contratos son idénticos en todos esos puntos, sin impacto. Corregir o aclarar el texto.

## Revisión por área

**app/ (ffc890b, a3ebecf).** `buildErrorEnvelope` emite `path` sin query y nunca texto crudo de GitHub/token (probado con `secret=abc` y `ghs_...`). El filtro conserva el orden correcto (error propio, 400, 401, 404, 413, otros 4xx, desconocido→503 reintentable) y los parsers de body usan el mismo constructor. Validador Ajv con `strict: true` y mensajes que no incluyen valores del payload. Contract test valida las salidas reales contra el esquema espejado. Sin regresiones detectadas: 201 pruebas pasan. CI (`.github/workflows/ci.yml`): permisos `contents: read`, `--frozen-lockfile`, versiones de acciones fijadas por tag mayor (no por SHA; P3 de cadena de suministro, no bloqueante). `engines` Node >=22 <23 y `@types/node` ^22 coherentes con `.nvmrc`.

**SDD 3.1 (b457533).** Sin referencias rotas a `awayMode` como campo o gate: `grep` solo encuentra el texto de rechazo en `state-schema.md` y `validate-harness.mjs`, más menciones históricas «Modo fuera de casa» en reportes de WI-GH-013/014 y dos `recommendedNextStep` de `state.json` (históricos, inofensivos). Los validadores no relajan gates: `validate-harness` ahora rechaza `awayMode`, y pasar a 3.1 se exige en `sdd-check` y `validate-harness`; la lista de siete gates de `W-DONE` y la validación previa a la revisión siguen intactas (la prueba es que fallan ahora por P2-1). `validate-work-items` rechaza `lane: FAST` con impacto de contrato. El carril FAST conserva lint/test/build, Contract Sync, revisión independiente y `noBlockingDecisions`. El mensaje de `sdd-check` perdió el nombre del componente («GitHub Integration requiere…»); trivial. Cambios de formato en `contract-sync-id.mjs` y `contract-sync-lifecycle.mjs` son solo estilo, sin cambio lógico. La eliminación de ~430 líneas de `state.json` es `archivedActiveWorkItem` huérfano y `validate-completions` sigue pasando.

**e6beb06.** Ver P2-2 y P3-1.

**Diff sin commitear.** `interoperability-contract.md` coincide byte a byte con Core. El cambio de 2 líneas es exactamente el descrito. `CHANGELOG.md`, `spec/README.md` y `tasks.md` (ST-GH-017 marcado `T-IN_PROGRESS`, `[ ]`) son coherentes; cerrar la casilla al `W-DONE`. Los reportes declaran la retroactividad y que cross fue `implementationAgent`. Los 16 eventos antiguos del inbox no pertenecen al WI; no deben incluirse en su commit. `app/` sin cambios en este diff.

**Alcance.** No se amplía el envelope (INTEROP-2.18), sin tiempo real ni push/PR. No se identifican decisiones `DEC` abiertas que bloqueen; la falta de DEC local para ffc890b y a3ebecf queda registrada por el sdd-analyst y la cobertura de «decisión del usuario» citada en CHANGELOG corresponde a la ratificación humana, que debe constar en el cierre del WI.

## Handoff

- status: CHANGES_REQUESTED
- findings: P2-1 gate `interopSyncChecked`; P2-2 huella de token en el runbook; P3-1 host en historial; P3-2 normalización 4xx→400; P3-3 logging y cierre de la red de seguridad; P3-4 huecos de pruebas; P3-5 hash de Core en reporte.
- blockers: ninguno de código. P2-1 debe resolverse antes de `W-DONE`. P3-1 requiere decisión del usuario.
- filesAffected: `harness/state.json` (gate, leader); `harness/reports/e2e-production-runbook-2026-10-12.md` (huella); `app/src/process-safety.ts` y `app/src/main.ts` (opcional, P3-3); `harness/reports/wi-gh-015-external-dependency-gate.md` (P3-5).
- evidence: salidas de comandos de la tabla; `cmp` e `diff -r` contra Core; `git grep` sin host/IP en HEAD y con huella presente; diffs `6a3ef5c..HEAD` de `app/` y `harness/`.
- recommendedNextStep: el leader pasa `interopSyncChecked` con evidencia del checkpoint `before-review`, redacta la huella del runbook (cambio mínimo de texto) y registra P3-1 como riesgo para el usuario; luego un ciclo 2 breve del reviewer para confirmar P2-1/P2-2 y `validate-harness` en verde. Los P3 pueden diferirse. `contract-reviewer` debe cerrar su parte (P3-2).
