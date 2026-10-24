# WI-GH-021 — Verificación SDD

Modelo: sdd-analyst · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo low

Estado: `SUFFICIENT`.

## Hallazgos
- IDs: `HU02`, `HU14` y `ST-GH-023` (`T-READY`, última línea de `spec/features/006-console-github-api/tasks.md`) coinciden con `harness/work-items.json` (WI-GH-021, `W-SELECTED`, STANDARD, `contractImpact=false`, `publishesContract=false`, `taskIds [ST-GH-023]`) y con `spec/backlog.md`. Spec dueña: `006-console-github-api` (tarea) con `002-repository-access` como comportamiento relacionado; ninguna spec necesita edición (precedente: ST-GH-011/WI-GH-009 de logging por etapa).
- Decision gate: sin DEC local aplicable; ningún `Blocks` alcanza el WI. El campo opcional `message` de GitHub (indicación de Core) queda FUERA: no se registra (ver 3).
- Contratos y constitución: nada impide ni contradice el WARN. `GH-INTEROP-1.9`/spec 002 solo prohíben registrar cuerpos o mensajes crudos de GitHub (002 línea 14); `architecture.md` línea 21: los logs redactan tokens, firma, body y URLs firmadas. El cambio no toca el valor devuelto (`{status:'UNVERIFIABLE'}`) ni el wire. Política WI-GH-017: `process-safety.ts` nunca loguea `error.message`/stack, solo `errorName()` (validado por `SAFE_NAME`) y `code` corto. No hay regla específica sobre ids/logins: se aplica la minimización del alcance aprobado (ni ids ni logins).

## Puntos UNVERIFIABLE en `app/src/github/github-app-auth.service.ts`
| Línea | Motivo |
|---|---|
| 126 | `catch` de `signAppJwt()` -> `JWT_NO_FIRMABLE` |
| 135 | `catch` de `api.request` -> `GITHUB_SIN_RESPUESTA` (+ duración) |
| 137 | `!response.ok` -> `GITHUB_HTTP_<response.status>` |
| 139 | `!Array.isArray(data)` -> `RESPUESTA_NO_ES_LISTA` |
| 141 | sin `account` o tipo distinto de Organization/User -> `INSTALACION_INVALIDA:<tipo>` |
| 143 | ids no enteros seguros o `login` no string -> `INSTALACION_INVALIDA:<tipo>` |
| 154 | tras `MAX_PAGES` (10) páginas -> `DEMASIADAS_PAGINAS` |
Son siete retornos para los seis motivos (141 y 143 comparten motivo).

## Logger hoy y patrón del repo
El servicio NO tiene Logger (constructor `(config, api)`; los specs lo construyen con `new GithubAppAuthService(config as never, api as never)`). Patrón del repo: `private readonly logger = new Logger(X.name)` (p. ej. `github-user-api.service.ts:25`) y `this.logger.warn(JSON.stringify({event, correlationId, stage, outcome, errorCode, durationMs}))` en `logDiscoveryFailure` (líneas 92-109). `listOrganizationInstallations()` no recibe `correlationId` y su firma no cambia; no se propaga (cambiaría llamadores): el evento queda sin correlationId (limitación anotada; Core correlaciona por su propio log de la llamada).

## Diseño mínimo
- `private readonly logger = new Logger(GithubAppAuthService.name);` (sin cambiar el constructor ni el módulo).
- Constante tipada: `type UnverifiableReason = 'JWT_NO_FIRMABLE' | 'GITHUB_SIN_RESPUESTA' | 'RESPUESTA_NO_ES_LISTA' | 'DEMASIADAS_PAGINAS' | \`GITHUB_HTTP_${number}\` | \`INSTALACION_INVALIDA:${SafeAccountType}\``, con `SafeAccountType = 'Organization' | 'User' | 'AUSENTE' | 'OTRO'`.
- Helper privado `warnUnverifiable(reason, extra?: {errorName?: string; durationMs?: number})` que emite `this.logger.warn(\`listOrganizationInstallations UNVERIFIABLE motivo=${reason}\` + (durationMs !== undefined ? \` duracionMs=${n}\` : '') + (errorName ? \` error=${n}\` : ''))`; formato texto plano (o JSON al estilo de discovery; el implementer elige uno y lo fija en la prueba). `duracionMs` solo en `GITHUB_SIN_RESPUESTA` (medida con `performance.now()` alrededor de `api.request`).
- `<estatus>`: `response.status` solo si `Number.isInteger` y 100..599; si no, `GITHUB_HTTP_DESCONOCIDO`.
- `<tipo>` de INSTALACION_INVALIDA: derivar de `entry.account?.type` mapeado a un set cerrado (`AUSENTE` si no hay account; `Organization`/`User` literales; cualquier otro valor -> `OTRO`). Nunca login, id ni el valor crudo. Para el punto 143 el tipo es `Organization`.
- Errores lanzados (126, 135): NO loguear `error.message`; opcionalmente `errorName(error)` importado de `process-safety.ts` (ya sanitiza). Recomendado incluirlo solo si no complica; si no, omitirlo.
- Los `return` siguen idénticos: log y luego `return { status: 'UNVERIFIABLE' }`.

## Pruebas (en `github-app-auth.service.spec.ts`, `vi.spyOn(Logger.prototype, 'warn')`)
1. Una por motivo (6 + variantes): sin variables/clave inválida -> `JWT_NO_FIRMABLE`; `request` rechaza -> `GITHUB_SIN_RESPUESTA` con `duracionMs=` numérico; respuesta 401/403/429/404 -> `GITHUB_HTTP_<n>`; cuerpo objeto -> `RESPUESTA_NO_ES_LISTA`; entrada sin account y con tipo `Bot` -> `INSTALACION_INVALIDA:AUSENTE`/`:OTRO`, e ids/login inválidos -> `INSTALACION_INVALIDA:Organization`; 10 páginas llenas de 100 entradas `User` -> `DEMASIADAS_PAGINAS`. Cada una afirma `toEqual({status:'UNVERIFIABLE'})` (valor sin cambios) y una sola llamada WARN.
2. No fuga: con key/JWT/ids/login/cuerpo/`message` de error "sentinela" (p. ej. login `secret-org-login`, id `987654321`, cuerpo con `message: 'Bad credentials'`, error con mensaje que incluya la clave), el texto de todos los WARN no contiene token/JWT (`eyJ`), clave/base64, login, id, ni el cuerpo ni `error.message`.
3. Caminos OK y existentes siguen sin WARN (el test de listado correcto afirma 0 llamadas a `warn`).

## Archivos a tocar
- `app/src/github/github-app-auth.service.ts`
- `app/src/github/github-app-auth.service.spec.ts`
- Evidencia/cierre a cargo del leader: `harness/reports/wi-gh-021-implementation.md`, `tasks.md` ST-GH-023 y `state.json`.
- No tocar: `spec/contracts/**`, `generated/`, `github.module.ts`, controladores, `getOrganizationMembership`/`listOrganizationOwners`, `/health`.

## Gates
`pnpm lint`, `pnpm test`, `pnpm build`, `pnpm contracts:check` y los validadores del harness. Rama `feature/jean`; commit con `Refs: HU02, HU14`. Revisión independiente con `reviewer` (sin `contract-reviewer`: `contractImpact=false`).

## Handoff estructurado
- status: SUFFICIENT
- findings: ids y spec dueña coherentes; sin DEC bloqueante; ningún requisito impide el WARN; el servicio no tiene Logger (se añade con el patrón Nest del repo, sin tocar el constructor); siete retornos, seis motivos; tipo y estatus acotados; sin `error.message`; sin correlationId disponible en esta función.
- blockers: ninguno.
- filesAffected: `app/src/github/github-app-auth.service.ts`, `app/src/github/github-app-auth.service.spec.ts`, informes de harness.
- evidence: este informe; lecturas de `github-app-auth.service.ts` (líneas 118-156), su spec, `github-user-api.service.ts` (logDiscoveryFailure), `process-safety.ts` (`errorName`), `architecture.md` línea 21, spec 002 línea 14, indicación de Core WI-CORE-087.
- recommendedNextStep: pasar a `W-SPEC_VERIFIED` y delegar al `implementer`; revisión independiente con `reviewer`.
