# WI-GH-003 — Evidencia de implementación

**Fecha:** 2026-09-25  
**Estado:** implementación local lista para revisión humana; WI todavía abierto.

## Cambios

- Se añadieron rutas internas protegidas Core→GH para compare, tree, files:batch y pull-request-head, con DTOs estrictos.
- Las lecturas usan el installation token de GitHub App y devuelven `GithubLookup<T>`; `NOT_FOUND`, `NOT_INSTALLED` y `UNVERIFIABLE` se mantienen distintos.
- Compare consulta la primera respuesta para obtener `files`; la paginación de GitHub es de commits y no de archivos. Si la lista alcanza 300 elementos, devuelve `UNVERIFIABLE` porque la API no permite demostrar si se truncó. No se devuelven resultados parciales. Referencia primaria: [GitHub REST API — Compare two commits](https://docs.github.com/en/rest/commits/commits#compare-two-commits).
- Tree conserva `truncated` y devuelve solo paths de blobs. files:batch valida hasta ocho paths, fija cada consulta al SHA y falla como unidad. Pull-request-head valida y normaliza SHA/estado.
- No hubo llamadas live a GitHub ni cambios a Core, Console, Sandbox, credenciales, permisos o despliegue. El contrato espejo sigue byte-identical al canónico; la limitación de Compare se publicará en Contract Sync para que Core ratifique/documente la interpretación.

## Verificación reproducible

En `app/`:

- `pnpm lint` — correcto.
- `pnpm test` — 49 pruebas en 7 archivos; todas aprobadas, incluyendo cap de 300, errores/timeout, JSON inválido, árbol truncado, lote sin parciales y DTOs.
- `pnpm build` — correcto.

En la raíz:

- `node scripts/sdd-check.mjs`, `node harness/validate-work-items.mjs`, `node harness/validate-harness.mjs` y `git diff --check` — correctos.
- `CONTRACT_SYNC start` — sin eventos entrantes relevantes pendientes.

## Revisión y límites

- `oauth_contract_review` aprobó el código tras corregir la paginación de Compare; no sustituye la revisión humana del WI.
- `core_sdd_analyst` aprobó continuar con la regla fail-closed y señaló que la frase de paginación del contrato canónico debe aclararse vía Contract Sync. Este evento queda pendiente del consumidor y es requisito antes del cutover Core.
- No se ha realizado revisión humana final, Contract Sync de entrega/revisión ni cierre del WI.
