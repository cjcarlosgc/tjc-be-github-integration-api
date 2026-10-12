# WI-GH-012 — Implementación y gates técnicos

La implementación usa una reserva PostgreSQL compartida por `(repositoryId, appId, headSha, name)` con unicidad bytewise, claim/lease y fencing. Devuelve `200 { checkId }`, adopta/actualiza un candidato único, rechaza varios con `409 GITHUB_CHECK_IDENTITY_AMBIGUOUS`, conserva resultados inciertos sin repetir POST/PATCH y reconcilia un `checkId` podado mediante la identidad completa.

`CREATE_REJECTED` solo se persiste si un `422` y una búsqueda completa posterior confirman cero candidatos; el mismo hash responde `422 GITHUB_CHECK_CREATE_REJECTED`, `retryable: false`, sin otro POST ni body crudo. Si hay candidato, múltiples candidatos, fallo de búsqueda o fallo de persistencia, conserva el estado incierto y falla cerrado.

Evidencia ejecutada: `pnpm test -- --run src/github/check-coordination.store.integration.spec.ts` pasó con **182/182**, incluida la migración idempotente y dos stores sobre PostgreSQL temporal aislada; `pnpm lint`, `pnpm build`, `git diff --check`, `node harness/validate-work-items.mjs` y `node harness/validate-harness.mjs` pasaron. No hubo GitHub real, push, provisión, despliegue ni cutover.

Los gates de implementación y checks técnicos están completos. El WI no se cierra: la revisión independiente ya consumió su máximo y `CS-GH-20261011-002` queda pendiente de la revisión canónica de Core.
