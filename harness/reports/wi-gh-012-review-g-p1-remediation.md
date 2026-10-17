# Remediación de P1 de revisión G — WI-GH-012

Fecha: 2026-10-11

Se corrigió el bypass identificado por la revisión G. Incluso con estado local `ACTIVE`, cada `POST /internal/v1/github/checks` pagina ahora la identidad completa bajo el mutex antes de decidir:

- varios candidatos: `409 GITHUB_CHECK_IDENTITY_AMBIGUOUS`, sin POST ni PATCH;
- candidato único: se adopta y actualiza por su `checkId`;
- cero candidatos desde `ACTIVE`, o búsqueda incompleta: se conserva bloqueo en memoria y se devuelve `503 GITHUB_CHECK_COORDINATION_UNAVAILABLE`.

La regresión añade un `ACTIVE` con `checkId` guardado y dos candidatos de identidad exacta; verifica 409 y cero POST/PATCH.

Verificación posterior: `cd app && pnpm test` aprobó 17 archivos y 183 pruebas; `pnpm lint`, `pnpm build`, `git diff --check`, `node harness/validate-work-items.mjs` y `node harness/validate-harness.mjs` aprobaron. No se ejecutó un sexto reviewer, no se hizo push, despliegue ni provisión externa.
