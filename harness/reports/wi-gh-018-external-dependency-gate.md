# WI-GH-018 — Puerta de dependencia externa

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

- **Resultado:** `G-PASSED`.
- **Revisado por:** leader, verificación manual en el repositorio fuente (solo lectura).
- **WI fuente requerido:** `WI-CORE-076` (emisor de `CS-CORE-20261021-004`), `W-DONE` en Core.

## Revisión fuente

Core `tjc-be-rag-core-api`, rama `feature/jean`. Contratos fijados en `3d2383e4b6efc20162b77945261fe08d384094a8` (`sourceRevision` del evento); `git diff 3d2383e HEAD -- spec/contracts` está vacío en el HEAD de Core al verificar.

| Contrato | Versión | SHA-256 |
| --- | --- | --- |
| `system-contract.md` | SYSTEM-2.14 | `f60d6c4b19e2bfbce232894614667e5898197a8677eb80db284d96b9f2b96ce3` (re-espejado) |
| `interoperability-contract.md` | INTEROP-2.19 | `f9866d16e8c738001d7a9dd664599cd542d857b676d17723fa9c3a25bd2cc6f9` (re-espejado) |
| `github-integration-contract.md` | GH-INTEROP-1.8 | `6c553ee856d0c53420a75d2bde5a9eb04cce2e029ffae1bf4194dcbc7a25565a` (sin cambio) |
| `spec/contracts/schemas/` (árbol) | — | `a1ba9a199d0035de85b807fa9ae26b9afb09f8af340a22f1cb34096547dc9091` (sin cambio) |

`CS-CORE-20261021-004` es el único evento relevante; acusado en `wi-gh-018-contract-sync-acknowledgement.md`.
