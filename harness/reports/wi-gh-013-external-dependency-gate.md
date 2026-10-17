# WI-GH-013 — Puerta de dependencia externa

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

- **Resultado:** `G-PASSED`.
- **Revisado por:** leader, verificación manual en el repositorio fuente (solo lectura).
- **WI fuente requeridos:** `WI-CORE-045` (emisor de `CS-CORE-20261012-006`) y `WI-CORE-047` (emisor de `CS-CORE-20261012-008`), ambos `W-DONE` en Core (`closedAt` 2026-10-12T22:12:24Z y 2026-10-12T22:23:56Z).

## Revisión fuente

Core `tjc-be-rag-core-api`, rama `feature/jean`, árbol limpio, HEAD `17642e0d554bc0cefad8a0d438eb9c5263f00c0d` (un commit documental posterior a `origin/develop` `284bd5abcc6f64867d3cd0060b61b446088b2fe6`). El último commit que toca `spec/contracts/` es `4b0f34a3a73d50df1c2b88934e8a2350732067a9`; el contenido de `spec/contracts/` es el mismo en ambos.

## Contratos canónicos de Core (SHA-256)

| Contrato | Versión | SHA-256 |
| --- | --- | --- |
| `system-contract.md` | SYSTEM-2.12 | `d180d4b171d80ed79e3ead1ec67036d34635da9f974288d817b21a797f94f507` |
| `interoperability-contract.md` | INTEROP-2.15 | `1c793c6f2d6cb9e1c647b1ba6815e4634be55b55370be4dbba1a998ef0a8dfd9` |
| `github-integration-contract.md` | GH-INTEROP-1.7 | `584839c91a088918028bbe80cbf209d8d341246bcf3536288cff1ad0b02c1b34` (sin cambio; ya idéntico a la copia local) |

## Contract Sync

Eventos dirigidos a `github-integration` aún pendientes: `CS-CORE-20261012-006` (INTEROP-2.9) y `CS-CORE-20261012-008` (SYSTEM-2.10 / INTEROP-2.10), ya importados. El outbox de Core no contiene otros eventos con ese destino sin importar; `CS-CORE-20261010-003` apunta solo a `console`. Los eventos de 2.11 a 2.15 (`console`/`sandbox`) no afectan a este componente. La puerta no implica implementación, despliegue ni cutover.
