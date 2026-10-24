Modelo: contract-reviewer · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo unknown

# WI-GH-020 — Revisión contractual

Veredicto: **APPROVED**

## Verificación por punto
- (a) El spec lee manifest.json, filtra 15 entradas `github-webhook-event.*` (13 GithubWebhookEvent, 2 GitHubWebhookAcceptedResponse; coincide con el manifest) y valida cada una con el `definition` del propio manifest vía `validateContract` (Ajv2020 strict, sobre el esquema canónico generado). No es tautológico: hay negativos reales (action de 101 y falta de deliveryId producen `valid:false`). Re-ejecutado: 36 pruebas en verde.
- (b) Las 17 variantes (pull_request opened/synchronize/closed-merged/nulls, repository con/sin owner, installation con/sin account, installation_repositories vacía/con cambios, organization con/sin membership, membership, member, team, ping, push sin action) normalizan y validan contra GithubWebhookEvent. Payloads GitHub mínimos pero realistas (snake_case, forma de GitHub); alineados con los ejemplos canónicos (p. ej. nulls: installationId/createdAt/userLogin null).
- (c) Brecha de `action` bien caracterizada: el normalizador no topa a 100; el esquema (WebhookAction maxLength 100, descripción "informativa") rechaza 101. CS-CORE-20261024-001 declara el límite informativo, sin obligación nueva ni cambio de wire. No exige cambio de producción.
- (d) `git diff -- app spec/contracts` vacío; solo `app/.../github-webhook-event.contract.spec.ts` nuevo. Sin cambios en producción, generated/ ni spec/contracts.

## Findings
- P0/P1/P2: ninguno.
- P3: (i) no hay caso negativo que mute un ejemplo canónico (la no-tautología se apoya en negativos sobre salida del normalizador); opcional. (ii) El esquema cuenta puntos de código y Core UTF-16; la caracterización usa ASCII, suficiente.

## Handoff
- status: APPROVED
- blockers: ninguno
- filesAffected: app/src/github-webhooks/github-webhook-event.contract.spec.ts (nuevo), harness/reports/wi-gh-020-contract-review.md
- evidence: vitest del spec 36/36; git diff app spec/contracts vacío; manifest 15 entradas.
- recommendedNextStep: revisión del `reviewer` y cierre por el leader (commit en feature/jean); atender CS-CORE-20261024-001 como cumplido en este WI.
