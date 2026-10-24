# WI-GH-020 — Verificación SDD

Modelo: sdd-analyst · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo low

Estado: `SUFFICIENT`.

- Alcance: validar con pruebas (sin tocar producción ni wire) lo que emite el normalizador de webhooks y los 15 ejemplos `github-webhook-event.*` contra `github-webhook-event.schema.json` (CT-01-A5, mitad de Integration). STANDARD, `contractImpact=true`, `publishesContract=false`, alcance aprobado en `wi-gh-019-scope-approval.md`; `dependsOn WI-GH-019` (ya `T-DONE`, ST-GH-021).
- IDs: `HU02`, `HU14` y `ST-GH-022` (`T-READY`, WI-GH-020, última línea de `spec/features/006-console-github-api/tasks.md`) coinciden con `harness/work-items.json` (WI-GH-020, `W-SELECTED`, component GH, sprint SMART V3, `taskIds [ST-GH-022]`). Specs dueñas: `spec/features/005-webhook-delivery` (comportamiento del normalizador/webhook) y `006-console-github-api` (tarea del WI); el WI no necesita editar ninguna spec.
- Decisiones: no hay DEC local propia. `DEC-VAL-001` (PENDING) es ajena (ingestión/despliegue); ningún `Blocks` alcanza WI-GH-020.
- Fuentes leídas: esquema (`$defs` completos), `examples/manifest.json` (29 entradas; 15 `github-webhook-event.*`: 13 con `definition: GithubWebhookEvent` y 2 `accepted-response.*` con `GitHubWebhookAcceptedResponse`), INTEROP §6.5 / GH-INTEROP-1.9 (líneas 231-263 del contrato GH), evento `CS-CORE-20261024-001` (C-RESOLVED), normalizador, tipos, `contract-validator.ts`, `generated/contract-schemas.ts` (incluye el esquema nuevo con su `$id`).

## Corte mínimo de pruebas (solo `app/src/**/*.spec.ts`)

(a) Contrato de ejemplos — nuevo `app/src/github-webhooks/github-webhook-event.contract.spec.ts`:
- Cargar `manifest.json` y cada ejemplo con `fs.readFileSync` desde `spec/contracts/schemas/examples` (ruta con `fileURLToPath(import.meta.url)`; `spec/` queda fuera de `app/`, vitest corre con cwd `app`). Ningún test existente lee ejemplos del disco (solo `error-envelope.contract.spec.ts` usa `validateContract`).
- Los esquemas NO se cargan del disco: `contract-validator.ts` ya registra `CONTRACT_SCHEMAS` (generado) en Ajv2020 strict con `ajv-formats`; basta `validateContract('github-webhook-event.schema.json', entry.definition, example)`. El `definition` del manifest distingue payload (`GithubWebhookEvent`) de respuesta aceptada (`GitHubWebhookAcceptedResponse`); filtrar `entry.schema === 'github-webhook-event.schema.json'` (esperar 15; afirmar el conteo y que existan al menos pull_request x4, installation, installation_repositories, repository x2, member, membership, organization, team, ignored, 2 respuestas) y `errors` vacío.
- Opcional: afirmar que un ejemplo adulterado (campo extra, `schemaVersion: 2`, id numérico no string) es rechazado, para demostrar que el esquema no es vacuo.

(b) Salida del normalizador — ampliar `github-webhook-normalizer.spec.ts` (o un `github-webhook-normalizer.contract.spec.ts`) con `it.each` que llame `normalizeGithubWebhook(delivery, evento, payloadGitHub, new Date('2026-10-24T10:00:00.000Z'))` y valide con `validateContract(..., 'GithubWebhookEvent', salida)`:
- `pull_request`: opened, synchronize, closed con `merged: true`, y nulls (sin `user`, `created_at` ausente/ambiguo -> `createdAt: null`, sin `installation` -> `installationId: null`).
- `repository` con owner (id numérico, login/type) y sin owner (o owner sin id -> `owner: null`).
- `installation` (con y sin `account`), `installation_repositories` (added/removed con listas y vacías/ausentes).
- `organization` (con y sin `membership.user`), `membership`, `member`, `team` (ids presentes y null).
- Evento ignorado (p.ej. `ping`, `push`) -> `IGNORED`, y `action` ausente -> `null`.
- Afirmar además que cada variante cae exactamente en su `eventName`/`kind` (oneOf).

(c) Desvíos normalizador vs. esquema (todos documentados en GH-INTEROP líneas 259; ninguno cambia el wire):

| Punto | Normalizador | Esquema | Exige cambio de producción |
|---|---|---|---|
| `deliveryId` | 1..128, sin control/espacio (`<=0x20`, `0x7f`) | 1..255 | No: Integration más estricto, aceptable |
| `eventName` | 1..100, sin control | 1..100 sin regla de control | No: más estricto |
| `title`, `ref`, `sha` | rechaza vacíos (`requiredString`) | acepta vacíos | No: más estricto |
| `action` | sin tope de longitud | `maxLength: 100` (informativo; Core cuenta UTF-16, esquema puntos de código) | No por ahora: una acción >100 que el normalizador emita fallaría el esquema/Core. Cubrir con una prueba que la documente (caracterización: normaliza y el esquema la rechaza) o dejarla como brecha anotada; GitHub no emite acciones tan largas. Si el usuario quiere tope, sería cambio de producción y de comportamiento: fuera de este WI |
| `receivedAt` | siempre `toISOString()` | `date-time` + patrón (admite offsets y segundo 60) | No |
| `createdAt` | UTC con `Z` o `null` | `WebhookCreatedAtUtc` (Z o null) | No |
| `owner` sin id | `owner: null` | `anyOf null/objeto con id` | No |
| `installation_repositories` ausente | lista `[]` | arrays requeridos | No |

Sin desvíos que obliguen a cambio de producción: no hay `W-DECISION_REQUIRED`. Salvedad: si una prueba del normalizador revelara un fallo real (salida inválida para un payload GitHub legítimo), el implementer debe detenerse y reportar `W-DECISION_REQUIRED` en lugar de corregir producción.

## Archivos a crear/tocar
- Crear `app/src/github-webhooks/github-webhook-event.contract.spec.ts` (a) y (b), o repartir (b) en `github-webhook-normalizer.spec.ts`.
- Evidencia: `harness/reports/wi-gh-020-implementation.md` (y revisión independiente del `reviewer`); actualizar `tasks.md` ST-GH-022 y `state.json` en el cierre, a cargo del leader.
- No tocar: `app/src` de producción, `generated/`, `spec/contracts/**`, wire.

## Gates
`pnpm lint`, `pnpm test`, `pnpm build`, `pnpm contracts:check` y los cuatro validadores del harness (`validate-work-items`, `validate-harness`, más los dos del Contract Sync / SDD aplicables). Rama `feature/jean`; sin push/PR/merge salvo la autorización permanente al cerrar. Commit con `Refs: HU02, HU14`.

## Handoff estructurado
- status: SUFFICIENT
- findings: ids y specs dueñas coherentes; sin DEC bloqueante; esquema ya empaquetado en el validador (no hay que cargar esquemas), ejemplos se leen del disco con el manifest; desvíos solo "Integration más estricto" salvo `action` sin tope (informativo, no bloquea).
- blockers: ninguno.
- filesAffected: `app/src/github-webhooks/github-webhook-event.contract.spec.ts` (nuevo) y/o `app/src/github-webhooks/github-webhook-normalizer.spec.ts`; informes de harness.
- evidence: este informe; esquema, manifest, normalizador y validador leídos.
- recommendedNextStep: pasar a `W-SPEC_VERIFIED` y delegar al `implementer` (solo pruebas); revisión independiente con `reviewer` y `contract-reviewer` (contractImpact).
