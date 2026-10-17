# WI-GH-013 — Acuse de Contract Sync

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

Dos eventos de Core, ya importados a `harness/contract-sync/inbox/`, están dirigidos a `github-integration` y su `scopePaths` (`spec/contracts/system-contract.md`, `spec/contracts/interoperability-contract.md`) coincide con `syncScopePaths` de `WI-GH-013`:

- `CS-CORE-20261012-006` (fuente `WI-CORE-045`, INTEROP-2.9, revisión fuente `30b9acdfbc063b027ad891799574b4553574559e`): aclaraciones sobre `POST …/answers` y OC11; pide revisar solo la descripción del límite de 300 archivos del compare, sin cambio de código ni de GH-INTEROP, y espejar si se mantiene copia.
- `CS-CORE-20261012-008` (fuente `WI-CORE-047`, SYSTEM-2.10 / INTEROP-2.10, revisión fuente `f501aef7c0bf36c702e8703abf4f522ab29a54b8`): `DEC-VAL-002` aprobada y `resultSummary` genérico de OC11; pide espejar si se mantiene copia, sin cambio de código ni de GH-INTEROP.

El acuse significa que GitHub Integration los acepta y los enlaza a `WI-GH-013`; no afirma que los espejos ya se hayan sincronizado. La acción requerida es sincronizar byte a byte las versiones canónicas vigentes (SYSTEM-2.12 e INTEROP-2.15, que incluyen 2.9 y 2.10) y verificar que `GH-INTEROP-1.7` no cambia.
