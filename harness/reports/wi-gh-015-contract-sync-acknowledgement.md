# WI-GH-015 — Acuse de Contract Sync

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

Un evento de Core importado a `harness/contract-sync/inbox/` está dirigido a `github-integration` y su `scopePaths` (`spec/contracts/*` y `spec/contracts/schemas`) coincide con `syncScopePaths` de `WI-GH-015`:

- `CS-CORE-20261018-001` (fuente `WI-CORE-069`, SYSTEM-2.13 / INTEROP-2.17 / GH-INTEROP-1.8, revisión fuente `67519a20a5e061bd81a880fe539693c9a364bba3`, `breaking=false`): pide re-espejar los tres contratos y `spec/contracts/schemas/` byte a byte, emitir el ErrorEnvelope completo con `retryable` siempre presente y ejecutar `contracts:check`, lint, build y test, sin cambio de comportamiento adicional.

El acuse significa que GitHub Integration lo acepta y lo enlaza a `WI-GH-015`; no afirma que los espejos ya coincidan. Estado previo verificado: `system-contract.md`, `github-integration-contract.md` y el árbol `schemas` ya coinciden con Core; `interoperability-contract.md` difiere (hash `4bab54e8…` frente a `b9ed40dc…`) y se re-espeja en este WI.

Los otros 16 archivos nuevos en el inbox llegaron con `import` por no estar aún copiados; sus destinos son otros componentes o ya estaban cubiertos. `CS-CORE-20261018-002` (console) y `-003` (sandbox) no se acusan aquí.
