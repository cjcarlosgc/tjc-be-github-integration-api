Modelo: implementer · configurado claude-haiku-5-5 · atendido unknown · esfuerzo low

# WI-GH-021 — Implementación: motivos de UNVERIFIABLE en logs

## Archivos
- `app/src/github/github-app-auth.service.ts`: Logger propio (`private readonly logger = new Logger(GithubAppAuthService.name)`, constructor sin cambios), tipo `UnverifiableReason`, helper privado `warnUnverifiable(reason, extra?)` y WARN en los siete retornos `{status:'UNVERIFIABLE'}` de `listOrganizationInstallations()`. El valor devuelto, el wire y la lógica no cambian.
- `app/src/github/github-app-auth.service.spec.ts`: pruebas por motivo, prueba de no fuga con sentinelas y prueba de camino OK sin WARN.

## Decisiones
- Formato del mensaje en texto plano: `listOrganizationInstallations UNVERIFIABLE motivo=<motivo>`, con ` duracionMs=<n>` solo en `GITHUB_SIN_RESPUESTA` (medido con `Date.now()` alrededor de `api.request`) y ` error=<nombre>` solo en los errores lanzados (`JWT_NO_FIRMABLE`, `GITHUB_SIN_RESPUESTA`), usando `errorName()` de `process-safety.ts` (ya exportado; valida el nombre). Nunca se usa `error.message`.
- Estatus fuera de rango: si `response.status` no es entero en 100..599 se registra `GITHUB_HTTP_DESCONOCIDO` (añadido al tipo). En la práctica `!response.ok` garantiza un estatus válido.
- `<tipo>` de `INSTALACION_INVALIDA`: sin `account` -> `AUSENTE`; tipo distinto de Organization/User -> `OTRO`; Organization con ids no enteros seguros o login no string -> `Organization`. Nunca se registra login, id ni el valor crudo del tipo. Los ids inválidos de tipo User no aplican porque los User se saltan antes (como en el código original).
- Como el retorno del helper es el mismo literal, cada `return` queda equivalente al original.

## Limitaciones
- Sin `correlationId`: `listOrganizationInstallations()` no recibe ese dato y su firma no cambia. Core correlaciona por su propio log de la llamada.
- Las pruebas de INSTALACION_INVALIDA usan `vi.restoreAllMocks()` entre casos del bucle.
- Fuera de alcance y no tocado: `getOrganizationMembership`, `listOrganizationOwners`, `/health`, arranque en frío, contratos, `generated/`, módulo y controladores.
- Sin commit, push ni cambios en `harness/state.json` ni `work-items.json` (por instrucción).

## Verificación (salida real, en `app/`)
- `pnpm lint` -> `$ oxlint src`, sin avisos tras eliminar un helper de prueba sin uso, exit 0.
- `pnpm test` -> `Test Files 21 passed (21)`, `Tests 265 passed (265)`. El spec de auth: 16 pruebas en verde, incluidas las nuevas por motivo, de no fuga y de camino OK.
- `pnpm build` -> `nest build`, exit 0.
- `pnpm contracts:check` -> `generate-contract-types.mjs --check`, exit 0.
- `git diff --check` (en la raíz del repo) -> sin salida, exit 0.
- Los WARN que aparecen en la salida de test son los del propio spec (p. ej. GITHUB_HTTP_404 del test previo que no mockea logger) y los de otros suites; ninguno contiene secretos de los sentinelas.

## Ciclo 2 (respuesta a revisión independiente, P3-1 y P3-2)
- P3-1: la prueba de no fuga usa ahora la clave válida en la llamada que rechaza con `Error` cuyo mensaje contiene token, clave, login e id sentinela; afirma que `api.request` se llamó una vez y que hay un WARN con `motivo=GITHUB_SIN_RESPUESTA`. La variante de JWT con clave sentinela (inválida) sigue en la misma prueba: `signAppJwt` reemplaza cualquier error por `appConfigurationUnavailable`, así que el mensaje original nunca llega al servicio.
- P3-2: `INSTALACION_INVALIDA:User` se retira del tipo `UnverifiableReason`. Verificado contra el código: los `account.type === 'User'` hacen `continue` antes de cualquier WARN, y la rama de ids inválidos siempre registra `Organization`. Queda alcanzable solo `AUSENTE`, `Organization` y `OTRO`.
- Sin cambio en valor devuelto, wire, firma ni en `state.json`/`work-items.json`; sin commit.

Verificación ciclo 2 (app/):
- `pnpm lint` -> `oxlint src` sin avisos, exit 0.
- `pnpm test` -> `Test Files 21 passed (21)`, `Tests 265 passed (265)`.
- `pnpm build` -> exit 0.
- `pnpm contracts:check` -> exit 0.
- `git diff --check` -> sin salida, exit 0.
