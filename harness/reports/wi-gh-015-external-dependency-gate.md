# WI-GH-015 — Puerta de dependencia externa

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

- **Resultado:** `G-PASSED`.
- **Revisado por:** leader, verificación manual en el repositorio fuente (solo lectura).
- **WI fuente requerido:** `WI-CORE-069` (emisor de `CS-CORE-20261018-001`), `W-DONE` en Core.

## Revisión fuente

Core `tjc-be-rag-core-api`, rama `feature/jean`. Los contratos y esquemas fueron fijados en el commit `67519a20a5e061bd81a880fe539693c9a364bba3` (`sourceRevision` del evento); los archivos de `spec/contracts/` en el HEAD de Core al verificar (`71cb9b4` y posteriores sin cambios en `spec/contracts/`) tienen los mismos SHA-256 que en ese commit.

## Contratos canónicos de Core (SHA-256)

| Contrato | Versión | SHA-256 |
| --- | --- | --- |
| `system-contract.md` | SYSTEM-2.13 | `b70f9358fabdaa6d8ac61d07e25258ec5256f9dacd31049edb4f08e6879a0444` (ya idéntico a la copia local) |
| `interoperability-contract.md` | INTEROP-2.17 | `b9ed40dc8d15a414b7cca4ccee4f320ba9da8f7444ef426b8321d17bdc0dea05` (difiere de la copia local `4bab54e8…`, editada a mano) |
| `github-integration-contract.md` | GH-INTEROP-1.8 | `6c553ee856d0c53420a75d2bde5a9eb04cce2e029ffae1bf4194dcbc7a25565a` (ya idéntico a la copia local) |
| `spec/contracts/schemas/` (árbol) | — | `c45e4513f4f8b3e8f2649f5b1c8f63fc4a187ddfb5fa0fb1232f85fb29fa1b31` (ya idéntico a la copia local) |

Receta del árbol: `cd spec/contracts/schemas && find . -type f | LC_ALL=C sort | xargs shasum -a 256 | shasum -a 256`.

## Contract Sync

`CS-CORE-20261018-001` (destino `github-integration`) es el único evento relevante; se acusó en `wi-gh-015-contract-sync-acknowledgement.md`. `-002` (console) y `-003` (sandbox) no aplican.
