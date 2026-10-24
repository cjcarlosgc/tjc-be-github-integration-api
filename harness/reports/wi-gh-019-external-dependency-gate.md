# WI-GH-019 — Puerta de dependencia externa

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

- **Resultado:** `G-PASSED`.
- **Revisado por:** leader, verificación manual en el repositorio fuente (solo lectura).
- **WI fuente requerido:** `WI-CORE-079` (emisor de `-001`) y `WI-CORE-089` (emisor de `-004`), `W-DONE` en Core.

## Revisión fuente

Core `tjc-be-rag-core-api`, rama `feature/jean`. Contratos fijados en `2318b9df292b337db4998f04b66b0457f1df8e3f` (`sourceRevision` de `-004`, que supera a `-001`, `208c3bdf…`); `git diff 2318b9d HEAD -- spec/contracts` está vacío en el HEAD de Core al verificar.

| Contrato | Versión | SHA-256 |
| --- | --- | --- |
| `system-contract.md` | SYSTEM-2.16 | `d0a492b4484c8883d65e709f76d8c7ff2462b0eb8c832649cf75723b9543ea77` |
| `interoperability-contract.md` | INTEROP-2.21 | `7f946d55b24cf13dad180927108cf777b8dde036ce2185d37590e6c072d0d29d` |
| `github-integration-contract.md` | GH-INTEROP-1.9 | `dedf00fa2f0f5be928cfaf1e5a12ff19f96e7579524a0a689757f1077bfc6e4e` |
| `spec/contracts/schemas/` (árbol) | — | `8079ab73887e3a74b2dba57fa5ae5c146e47eb21231f9965718a85a3a2619718` |

`CS-CORE-20261024-001` y `-004` acusados en `wi-gh-019-contract-sync-acknowledgement.md`; `-002` (sandbox) y `-003` (console) no apuntan a este componente.
