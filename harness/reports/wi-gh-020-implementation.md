Modelo: implementer · configurado claude-haiku-5-5 · atendido unknown · esfuerzo low

# WI-GH-020 — Implementación (solo pruebas)

## Estado

`IMPLEMENTADO` (pendiente de revisión independiente por `reviewer` y `contract-reviewer`, contractImpact=true). No se hizo commit, push ni cambios en `harness/state.json` ni `harness/work-items.json`.

## Archivos

- Nuevo: `app/src/github-webhooks/github-webhook-event.contract.spec.ts`.
- Tarea de seguimiento: `spec/features/006-console-github-api/tasks.md`, ST-GH-022 (WI-GH-020). No se cierra aquí; el cierre (T-DONE) corresponde al leader.
- Sin cambios en producción, `generated/`, `spec/contracts/**` ni wire.

## Contenido de la prueba nueva

- (a) Lee `spec/contracts/schemas/examples/manifest.json` por ruta derivada de `import.meta.url` y valida los ejemplos `github-webhook-event.*` con `validateContract` usando el `definition` del manifest. Afirma 15 entradas (13 `GithubWebhookEvent`, 2 `GitHubWebhookAcceptedResponse`).
- (b) Alimenta `normalizeGithubWebhook` con payloads GitHub mínimos para pull_request (opened, synchronize, closed con merged, con nulls), repository (con y sin owner), installation (con y sin account), installation_repositories (vacía y con cambios), organization (con y sin membership), membership, member, team, y eventos ignorados (`ping`, `push` sin action). Valida cada salida contra `GithubWebhookEvent`. Incluye una prueba de que cada variante cae en su kind.
- (c) Caracterización: `action` de 101 caracteres pasa el normalizador sin cambio y falla el esquema con error en `/action`. Documentado como brecha informativa, sin cambiar producción. Caso negativo: un evento sin `deliveryId` no valida.

## Decisiones

- Los payloads de GitHub se construyen inline en el spec, sin reutilizar fixtures del `github-webhook-normalizer.spec.ts` (que no exporta fixtures).
- Nombres de pruebas en español, sin comentarios extra.

## Desvíos

- Ninguno que requiera cambio de producción. La salida del normalizador es válida contra el esquema para todos los payloads GitHub legítimos probados, así que no hay `W-DECISION_REQUIRED`.
- Brecha conocida (no corregida, según diseño): `action` sin tope en el normalizador frente a `maxLength: 100` del esquema. Queda cubierta por la prueba de caracterización.

## Verificación (salida real en `app/`)

- `pnpm exec vitest run src/github-webhooks/`: 6 archivos, 77 pruebas en verde.
- `pnpm lint` (oxlint src): exit 0.
- `pnpm test`: 21 archivos, 254 pruebas en verde, exit 0.
- `pnpm build` (nest build): exit 0.
- `pnpm contracts:check`: exit 0.
- `git diff --check`: sin salida, exit 0.
- `git status`: solo `app/src/github-webhooks/github-webhook-event.contract.spec.ts` nuevo dentro de código; los demás cambios (`harness/state.json`, `harness/work-items.json`, `tasks.md`, informe de verificación) son previos y no se tocaron.

## Handoff estructurado

- status: IMPLEMENTED
- findings: prueba de contrato añadida; normalizador compatible con el esquema para los 13 kinds/acciones probados; único desvío es el tope de `action` (informativo, documentado).
- blockers: ninguno.
- filesAffected: `app/src/github-webhooks/github-webhook-event.contract.spec.ts` (nuevo), `harness/reports/wi-gh-020-implementation.md`.
- evidence: salida de verificación en la sección anterior.
- recommendedNextStep: revisión independiente del `reviewer` y `contract-reviewer` (contractImpact) antes de `W-DONE`; el leader decide commit en `feature/jean`.

## Ciclo 2

Motivo: P2 de `harness/reports/wi-gh-020-independent-review.md` (la prueba de kind solo afirmaba TEAM e IGNORED) y P3 (ejemplo adulterado).

- La tabla `it.each` de salida del normalizador ahora incluye el `kind` esperado para las 17 variantes y afirma `normalized.data.kind === kind` antes de validar contra el esquema. Se elimina la prueba antigua «cada variante cae en su kind».
- Nuevo caso negativo: clon de `github-webhook-event.pull-request.opened.json` sin `data.pullRequest.title` → `valid: false`.
- Sin cambios en producción, `generated/`, `spec/contracts`, `state.json` ni `work-items.json`. Sin commit.

Verificación (salida real en `app/`, ciclo 2):
- `pnpm lint`: exit 0.
- `pnpm test`: 21 archivos, 254 pruebas en verde, exit 0.
- `pnpm build`: exit 0.
- `pnpm contracts:check`: exit 0.
- `git diff --check`: exit 0.
