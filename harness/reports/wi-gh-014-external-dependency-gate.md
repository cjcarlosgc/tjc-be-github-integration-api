# WI-GH-014 — Puerta de dependencia externa

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

- **Resultado:** `G-PASSED`.
- **Revisado por:** leader, verificación manual en el repositorio fuente (solo lectura).
- **WI fuente requerido:** `WI-CORE-062` (emisor de `INTEROP-2.16`), `W-DONE` en Core (`closedAt` 2026-10-14T06:52:24Z).

## Revisión fuente

Core `tjc-be-rag-core-api`, rama `feature/jean`, HEAD `bfbaa04ae4f9caafb4f26d55ab12849bb389451f`, árbol limpio en `spec/contracts/`. El último commit que toca `spec/contracts/` es `7f24c169c7d774a2f22a5c74d1869a78d69ab53b` (`INTEROP-2.16`, `WI-CORE-062`); desde `4b0f34a` (`INTEROP-2.15`) solo cambió `interoperability-contract.md`.

## Contratos canónicos de Core (SHA-256)

| Contrato | Versión | SHA-256 |
| --- | --- | --- |
| `system-contract.md` | SYSTEM-2.12 | `d180d4b171d80ed79e3ead1ec67036d34635da9f974288d817b21a797f94f507` (ya idéntico a la copia local) |
| `interoperability-contract.md` | INTEROP-2.16 | `411bd54955ddfea2fa8e058dc59bfc81b5a2ae03e9b8ee5dd9e72f529e0db789` (difiere de la copia local, INTEROP-2.15) |
| `github-integration-contract.md` | GH-INTEROP-1.7 | `584839c91a088918028bbe80cbf209d8d341246bcf3536288cff1ad0b02c1b34` (ya idéntico a la copia local) |

## Contract Sync

El outbox de Core no contiene eventos nuevos con destino `github-integration` posteriores a `CS-CORE-20261012-008` (ya resuelto en `WI-GH-013`). Los eventos `CS-CORE-20261012-009` a `CS-CORE-20261014-001` apuntan a `console` o `sandbox`; `CS-CORE-20261014-001` (INTEROP-2.16) tiene destino `console` y no es relevante para este componente. La puerta no implica implementación, despliegue ni cutover.
