Modelo: reviewer · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo low

# WI-GH-017 — Revisión independiente

**Veredicto: APPROVED** (con hallazgos P2/P3 no bloqueantes).

## Evidencia (salida real)

- `node scripts/sdd-check.mjs`: SDD check OK
- `node harness/validate-work-items.mjs`: Work item validation passed (GH, 17 WI)
- `node harness/validate-harness.mjs`: Harness V3 validation passed
- `node harness/validate-completions.mjs`: Completion validation passed (16 completed WI)
- `git diff --check`: sin salida, código 0
- `pnpm lint`: oxlint sin avisos, 0; `pnpm test`: 20 archivos, 215 pruebas OK; `pnpm build`: 0; `pnpm contracts:check`: 0

## Revisión por punto

1. **process-safety**: `describe()` no devuelve `message` ni `stack`; nombre validado con regex, `code` solo `[A-Za-z0-9_]{1,32}`, no-Error solo `typeof`. Las pruebas aseguran ausencia de mensaje, de ruta y de texto. OK. Falta prueba de `code` con salto de línea/espacios (la regex lo rechaza, pero no está probado).
2. **graceful-shutdown/main.ts**: `Promise.race` con timer `unref`, `clearTimer` en `finally`, `exit` una sola vez (memoiza `running`), timeout o error de `close` => código distinto de cero (1 si era 0), rechazo tardío de `close` no genera unhandled (la carrera ya está suscrita). `enableShutdownHooks` se conserva. `uncaughtException` además tiene guarda propia en process-safety. OK.
3. **Config**: default 10000, rango 1000-60000, inválido o vacío => default, sin eco; `.env.example` y README coherentes; prueba cubre 999, 60001, 1.5, texto. OK.
4. **Store spec**: las dos pruebas no son tautológicas. En la primera, sin barrido la reclamación de la identidad 0 devolvería ACTIVE con `checkId` '0'; el barrido ocurre en el claim 200 de la segunda tanda con el reloj avanzado. Store sin cambios (`git status` no lo muestra). La constante 200 está duplicada en la prueba (documentado).
5. **INTEROP-2.18**: solo 3 comentarios en `app/src`; `contracts/generated` sin modificar (solo `contract-validator.ts` en contracts).
6. **Alcance/harness**: sin cambio de rutas, respuestas ni contrato; `contractImpact=false`, gates de contrato NOT_APPLICABLE, independentReviewPassed NOT_RUN a la espera de este veredicto. Sin secretos. `tasks.md` ya estaba modificado antes; ST-GH-019 se marca en el cierre del leader.

## Hallazgos

- **P2-1** `main.ts`: `app.enableShutdownHooks()` hace que SIGTERM/SIGINT cierren vía Nest (`app.close()` y luego re-señal) sin pasar por `createShutdown`; esa ruta no tiene tope de tiempo. El tope solo protege `uncaughtException`. El README dice que el tope limita el cierre «ante SIGTERM o fallos no capturados»: la parte de SIGTERM no se cumple. Corrección sugerida: registrar `process.once('SIGTERM'/'SIGINT', () => shutdown(0))` (y quitar o ajustar el hook) o corregir README/CHANGELOG al alcance real. Acordar con el leader si entra en este WI.
- **P3-1** `graceful-shutdown.ts` `errorName()` registra `value.name` sin la regex `SAFE_NAME` de process-safety (un `name` arbitrario podría inyectar texto en el log). Reutilizar la misma validación.
- **P3-2** Pruebas débiles: no se afirma que `unref` se llame ni que `clearTimer` se invoque en las rutas de timeout/error (solo en cierre normal); no hay prueba del cableado de `main.ts` (el cierre no lo cubre).
- **P3-3** Con timer `unref` y `close()` colgado sin otras manijas, el proceso podría terminar solo con código 0 tras `uncaughtException` (caso borde teórico).

## Handoff

- status: APPROVED
- findings: P2-1, P3-1, P3-2, P3-3 (arriba)
- blockers: []
- filesAffected: harness/reports/wi-gh-017-independent-review.md (único archivo escrito)
- evidence: salidas de validadores, lint, test, build y contracts:check listadas arriba
- recommendedNextStep: el leader decide si corrige P2-1/P3-1 en este WI (ciclo de revisión 1 de 2) o los registra como seguimiento; luego marca ST-GH-019 y cierra tras aprobación del Human Reviewer.

## Ciclo 2

Verificado sobre el diff real:

- **P2-1 resuelto**: `main.ts` ya no llama `enableShutdownHooks()`; `registerSignalShutdown(process, shutdown)` registra SIGTERM/SIGINT con `once` hacia `createShutdown` (con tope). Nest ya no escucha señales por su cuenta, así que no hay doble cierre; `shutdown` memoiza y `app.close()` de Nest (`shutdown()` al menos una vez por ciclo) ejecuta destroy, beforeShutdown y shutdown hooks, por lo que no se pierde ningún hook. En `app/src` no hay servicios con `OnModuleDestroy`/`OnApplicationShutdown`/`BeforeApplicationShutdown` (grep sin resultados), de modo que no hay hook propio en riesgo. Una segunda señal tras la primera recupera el comportamiento por defecto de Node (termina el proceso), aceptable. README y CHANGELOG ya mencionan SIGTERM/SIGINT.
- **P3-1 resuelto**: `errorName` exportado de `process-safety.ts` con `SAFE_NAME`, usado por `graceful-shutdown.ts`; pruebas con `\n` en `name` y en `code`.
- **P3-2 resuelto**: pruebas con temporizador controlado comprueban `unref` y `clearTimer` en cierre normal, timeout y error; hay pruebas de `registerSignalShutdown`. Sigue sin prueba directa del cableado de `main.ts` (menor).
- **P3-3** diferido, aceptado.

Re-ejecución: sdd-check OK; validate-work-items OK (17 WI); validate-harness OK; validate-completions OK (16); `git diff --check` 0; lint 0; test 20 archivos / 218 pruebas OK; build 0; contracts:check 0.

**Veredicto final: APPROVED**

Handoff: status APPROVED; findings: P3-3 diferido, ausencia de prueba de cableado de main.ts (P3); blockers []; filesAffected: harness/reports/wi-gh-017-independent-review.md; evidence: salidas anteriores; recommendedNextStep: el leader registra independentReviewPassed, marca ST-GH-019 y cierra tras aprobación del Human Reviewer.
