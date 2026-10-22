# WI-GH-016 — Implementación

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

Cambio documental/contractual del leader sin tocar lógica de producto (los únicos cambios en `app/` son los archivos generados).

- `interoperability-contract.md` y `spec/contracts/schemas/` copiados completos desde Core (`5c82853`, sin ediciones, `rsync --delete` del árbol de esquemas). Entran `realtime-events.schema.json`, seis ejemplos nuevos y entradas en `examples/manifest.json`; cambian descripciones de `error-envelope.schema.json`.
- `pnpm contracts:generate` regeneró `app/src/contracts/generated/contract-types.ts` y `contract-schemas.ts`; `contracts:check` pasa.
- Tolerancia de `code` abierto: `github-ui-core-client.ts` acepta solo los códigos conocidos de Core y trata cualquier otro (abierto, genérico de §4.1 o ausente) como `coreAuthorizationUnavailable()`, que falla cerrado. Sin cambio de código; la política `INVALID_REQUEST` propia se conserva.
- §6.6 (WebSocket de Core): el repo no usa WebSocket; sin impacto.
- `AGENTS.md`, `spec/README.md`, `CHANGELOG.md` y `tasks.md` (ST-GH-018) actualizados a INTEROP-2.18.

## Verificación (2026-10-21)

| Comprobación | Resultado |
| --- | --- |
| `cmp` de `system`, `interoperability`, `github-integration` y `diff -r` de `schemas` frente a Core | idénticos |
| SHA-256 | `b70f9358…`, `22b880d1…`, `6c553ee8…`, árbol `a1ba9a19…` |
| `pnpm contracts:check` | pasa |
| `pnpm lint` | pasa |
| `pnpm test` | 19 archivos, 201 pruebas pasan |
| `pnpm build` | pasa |

Se omite la regla de «cambio de código esperado»: no hubo. Los eventos `CS-CORE-20261021-001` y `-003` (otros destinos) llegaron en el `import` y no se acusan.
