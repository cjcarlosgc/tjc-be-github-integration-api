# WI-GH-016 — Acuse de Contract Sync

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

Un evento de Core importado a `harness/contract-sync/inbox/` apunta a `github-integration` y su `scopePaths` coincide con `syncScopePaths` de `WI-GH-016`:

- `CS-CORE-20261021-002` (fuente `WI-CORE-074`, INTEROP-2.18, revisión fuente `5c82853c36a419e9839d5474ad9657f714aba4cb`, `breaking=false`): pide re-espejar `interoperability-contract.md` y `spec/contracts/schemas/` byte a byte (`github-integration-contract.md` y `system-contract.md` sin cambio), conservar la política `INVALID_REQUEST` propia, sin impacto de §6.6 (no usa WebSocket), tolerar `code` abierto y los códigos genéricos de §4.1 en los errores recibidos de Core, y ejecutar `contracts:check`, lint, build y test.

El acuse significa que GitHub Integration lo acepta y lo enlaza a `WI-GH-016`; no afirma que los espejos ya coincidan. Los eventos `-001` (probable destino console) y `-003` (probable sandbox) llegaron con el `import` y no se acusan aquí.
