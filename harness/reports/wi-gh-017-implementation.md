Modelo: implementer · configurado claude-haiku-5-5 · atendido unknown · esfuerzo low

# WI-GH-017 — Implementación (estabilidad de proceso)

Alcance aprobado: `harness/reports/wi-gh-017-scope-approval.md`. Análisis: `harness/reports/wi-gh-017-spec-verification.md`. Sin cambio de contrato, de rutas ni de respuestas públicas. No hay commit, push ni cambios en `harness/state.json` ni `harness/work-items.json` por esta implementación.

## Archivos cambiados

- `app/src/process-safety.ts`: `describe()` ya no devuelve `error.message`. Para Error registra el nombre (validado con regex, si no `Error`) y, si existe, un `code` corto alfanumérico (p. ej. `TypeError (ECONNRESET)`). Para no-Error registra solo `typeof`. Nunca texto ni stack.
- `app/src/process-safety.spec.ts`: las pruebas ya no esperan `boom` en el log. Ahora comprueban que el mensaje no aparece, que aparece el nombre, que un `code` se registra, que un mensaje con ruta no se escribe y que un valor string solo registra `string`.
- `app/src/graceful-shutdown.ts` (nuevo): `createShutdown({ close, exit, timeoutMs, logger, setTimer?, clearTimer? })` devuelve `(exitCode) => Promise<void>`. Usa `Promise.race` contra un temporizador `unref()`. Cierre normal sale con `exitCode`. Tope vencido o `close()` que lanza sale con `exitCode` o con 1 si era 0, y registra solo un mensaje fijo o el nombre del error. `exit` se llama una sola vez (la ejecución se memoriza). El temporizador se limpia siempre.
- `app/src/graceful-shutdown.spec.ts` (nuevo): 8 pruebas con `vi.useFakeTimers`: cierre normal (0 y 1), cierre colgado (0 y 3), error al cerrar (solo nombre, sin mensaje) y con código 2, llamada repetida y limpieza del temporizador.
- `app/src/main.ts`: cablea `createShutdown` con `app.close()`, `process.exit` y `SHUTDOWN_TIMEOUT_MS` desde `ConfigService`. `registerProcessSafetyNets` recibe el nuevo cierre. `app.enableShutdownHooks()` se mantiene.
- `app/src/config/runtime-config.ts`: `SHUTDOWN_TIMEOUT_MS` añadido a `RuntimeConfig`. Nueva función exportada `parseShutdownTimeoutMs`: ausente o cadena vacía usa 10000; entero entre 1000 y 60000 se acepta; cualquier otro valor usa el default sin lanzar error ni hacer eco. `validateEnvironment` devuelve el campo siempre.
- `app/src/config/runtime-config.spec.ts`: prueba del default, aceptación y valores inválidos.
- `app/.env.example`: `SHUTDOWN_TIMEOUT_MS=10000`.
- `README.md` (línea de configuración, párrafo de `PORT`): documenta `SHUTDOWN_TIMEOUT_MS`.
- `app/src/github/check-coordination.store.spec.ts`: dos pruebas nuevas al final, en español. (a) Barrido automático: 200 identidades ACTIVE con reloj antiguo, avance del reloj más allá del TTL, 200 claims más y el claim de la identidad 0 vuelve a `RESERVED` con `checkId` null, sin llamar a `evictIdleActive`. (b) Reclamo tras expulsión: `RESERVED`, `checkId` null y token nuevo. `SWEEP_EVERY_CLAIMS` se documenta como constante local de la prueba. No se exportó nada del store y el comportamiento del store no cambió.
- `app/src/error-envelope.ts`, `app/src/error-envelope.contract.spec.ts`, `app/src/contracts/contract-validator.ts`: `INTEROP-2.17` cambiado a `INTEROP-2.18` solo en comentarios. `app/src/contracts/generated/*` no se tocó.
- `CHANGELOG.md`: entrada «WI-GH-017 (2026-10-21, estabilidad)» al inicio, tras `# Changelog`. Sin tocar la historia.
- `harness/reports/wi-gh-017-implementation.md`: este informe.

## Decisiones

- Valor inválido de `SHUTDOWN_TIMEOUT_MS` usa el default y no lanza, como pide el encargo. Esto difiere del patrón de `PORT` (que lanza). El patrón de `runtime-config.ts` se respeta en lo demás: validación en `validateEnvironment`, sin eco del valor.
- Ruta real de la configuración: `app/src/config/runtime-config.ts` (el encargo decía `app/src/runtime-config.ts`).
- Los comentarios de `contracts/generated/*` siguen diciendo 2.17 porque son generados desde el espejo de Core. Se corrigen cuando Core actualice el esquema.
- `spec/features/006-console-github-api/tasks.md` (ST-GH-019) no se marca como terminado: esa marca pertenece al cierre del leader tras la revisión independiente. Su línea ya estaba modificada en el árbol de trabajo antes de esta implementación y no la toqué.
- No hay DEC nueva ni cambio de contrato. No hizo falta `W-DECISION_REQUIRED`.

## Verificación (salida real)

- `pnpm lint` (en `app/`): `oxlint src`, sin avisos, código de salida 0.
- `pnpm test`: 20 archivos, 215 pruebas, todas pasan, código 0.
- `pnpm build`: `nest build`, código 0.
- `pnpm contracts:check`: `node scripts/generate-contract-types.mjs --check`, código 0, sin diferencias.
- `git diff --check` (raíz del repo): sin salida, código 0.

## Pendiente fuera de este corte

- Revisión independiente del reviewer y aprobación del Human Reviewer.
- Marcar ST-GH-019 en `tasks.md` tras la revisión.
- Los comentarios `INTEROP-2.17` en `app/src/contracts/generated/*` se corrigen con el esquema de Core.

## Ciclo 2 (corrección de la revisión independiente)

Fuente: `harness/reports/wi-gh-017-independent-review.md` (APPROVED con P2-1, P3-1, P3-2 y P3-3). Se corrigen P2-1, P3-1 y P3-2. P3-3 no se toca.

- **P2-1 (tope en SIGTERM/SIGINT):** `main.ts` ya no usa `app.enableShutdownHooks()`. Las señales pasan por `registerSignalShutdown(process, shutdown)` (nuevo en `graceful-shutdown.ts`), que llama `shutdown(0)` una vez por señal, con el mismo tope de tiempo. Se verificó en `app/node_modules/@nestjs/core/nest-application-context.js` que `app.close()` → `shutdown()` ejecuta `callDestroyHook`, `callBeforeShutdownHook` y `callShutdownHook`, así que `onModuleDestroy` y `onApplicationShutdown` siguen disparándose. Doble cierre evitado: `createShutdown` memoiza la ejecución. README y CHANGELOG ahora dicen «SIGTERM, SIGINT o fallos no capturados», que es el alcance real.
- **P3-1 (sanitización de name):** `errorName()` se exporta desde `process-safety.ts` y es el mismo helper que usa `describe()` (regex `SAFE_NAME`). `graceful-shutdown.ts` lo importa. Prueba nueva: un `name` con salto de línea registra `Error`, sin el texto. Prueba adicional en `process-safety.spec.ts`: un `code` con salto de línea no aparece en el log.
- **P3-2 (timer):** las pruebas de cierre colgado, error de close y cierre normal usan un temporizador controlado (`controlledTimer`) que comprueba `unref` llamado y `clearTimer` llamado con el mismo handle. Los fake timers se mantienen para el resto.
- **Pruebas de señales:** `registerSignalShutdown`: SIGTERM dos veces llama `shutdown(0)` una vez; SIGINT llama `shutdown(0)`; la función devuelta quita los manejadores.

### Verificación ciclo 2 (salida real, en app/ salvo indicado)

- `pnpm lint`: exit 0.
- `pnpm test`: 20 archivos, 218 pruebas (antes 215; +3 nuevas: señales, name con salto de línea, code con salto de línea), todas pasan.
- `pnpm build`: exit 0.
- `pnpm contracts:check`: exit 0.
- `git diff --check` (raíz): exit 0.
- No hay commit. `harness/state.json` y `harness/work-items.json` no se tocaron en este ciclo.
