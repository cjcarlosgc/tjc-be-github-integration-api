# WI-GH-003 — Evidencia de implementación

**Fecha:** 2026-09-25  
**Estado:** `WI-GH-003` quedó `W-DONE` con revisión independiente aprobada. La aprobación humana se difiere al cierre conjunto de WI-GH-003–005 por excepción temporal del usuario.

## Cambios

- Se añadieron rutas internas protegidas Core→GH para compare, tree, files:batch y pull-request-head, con DTOs estrictos.
- Las lecturas usan el installation token de GitHub App y devuelven `GithubLookup<T>`; `NOT_FOUND`, `NOT_INSTALLED` y `UNVERIFIABLE` se mantienen distintos.
- Compare consulta la primera respuesta para obtener `files`; la paginación de GitHub es de commits y no de archivos. Si la lista alcanza 300 elementos, devuelve `UNVERIFIABLE` porque la API no permite demostrar si se truncó. No se devuelven resultados parciales. Referencia primaria: [GitHub REST API — Compare two commits](https://docs.github.com/en/rest/commits/commits#compare-two-commits).
- Tree conserva `truncated` y devuelve solo paths de blobs. files:batch valida hasta ocho paths, fija cada consulta al SHA y falla como unidad. Pull-request-head valida y normaliza SHA/estado.
- No hubo llamadas live a GitHub ni cambios a Core, Console, Sandbox, credenciales, permisos o despliegue. El contrato espejo sigue byte-identical al canónico; `CS-GH-20260925-002` está publicado en el outbox con estado `C-PENDING` para que Core ratifique/documente la interpretación. No se hizo push.

## Verificación reproducible

En `app/`:

- `pnpm lint` — correcto.
- `pnpm test` — 49 pruebas en 7 archivos; todas aprobadas, incluyendo cap de 300, errores/timeout, JSON inválido, árbol truncado, lote sin parciales y DTOs.
- `pnpm build` — correcto.

En la raíz:

- `node scripts/sdd-check.mjs`, `node harness/validate-work-items.mjs`, `node harness/validate-harness.mjs` y `git diff --check` — correctos.
- `CONTRACT_SYNC start`, `implementation-delivery` y `before-review` — sin eventos entrantes relevantes pendientes.

## Revisión y límites

- `oauth_contract_review` aprobó el código como contract-reviewer. `core_sdd_analyst`, actuando como reviewer independiente distinto del implementer, aprobó el WI sin hallazgos bloqueantes; ver `wi-gh-003-independent-review.md`.
- El espejo canónico es byte a byte igual al contrato de Core, por lo que `canonicalContractSynced` puede pasar con esa evidencia. `CS-GH-20260925-002` continúa `C-PENDING`: Core debe ratificar/documentar el límite antes del cutover, pero esa respuesta no es gate de cierre local GH.
- El usuario autorizó que su aprobación humana se recoja una sola vez al finalizar WI-GH-005; esta excepción no cambia los demás gates ni autoriza push o cutover.
- No se han hecho llamadas live a GitHub ni cambios a Core, Console, Sandbox, credenciales o despliegue. No se ha hecho push.
