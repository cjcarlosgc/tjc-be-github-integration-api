# WI-GH-016 — Puerta de dependencia externa

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

- **Resultado:** `G-PASSED`.
- **Revisado por:** leader, verificación manual en el repositorio fuente (solo lectura).
- **WI fuente requerido:** `WI-CORE-074` (emisor de `CS-CORE-20261021-002`), `W-DONE` en Core.

## Revisión fuente

Core `tjc-be-rag-core-api`, rama `feature/jean`. Contratos y esquemas fijados en `5c82853c36a419e9839d5474ad9657f714aba4cb` (`sourceRevision` del evento); `git diff 5c82853 HEAD -- spec/contracts` está vacío en el HEAD de Core al verificar.

## Contratos canónicos de Core (SHA-256)

| Contrato | Versión | SHA-256 |
| --- | --- | --- |
| `system-contract.md` | SYSTEM-2.13 | `b70f9358fabdaa6d8ac61d07e25258ec5256f9dacd31049edb4f08e6879a0444` (sin cambio) |
| `interoperability-contract.md` | INTEROP-2.18 | `22b880d1d677d7a54fb0f909f05d505e1557b6bbcdcfbb35347e9e3b5947e311` (re-espejado) |
| `github-integration-contract.md` | GH-INTEROP-1.8 | `6c553ee856d0c53420a75d2bde5a9eb04cce2e029ffae1bf4194dcbc7a25565a` (sin cambio) |
| `spec/contracts/schemas/` (árbol) | — | `a1ba9a199d0035de85b807fa9ae26b9afb09f8af340a22f1cb34096547dc9091` (re-espejado) |

## Contract Sync

`CS-CORE-20261021-002` es el único evento relevante; acusado en `wi-gh-016-contract-sync-acknowledgement.md`. `-001` y `-003` no apuntan a este componente.
