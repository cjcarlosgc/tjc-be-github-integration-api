# WI-GH-019 — Acuse de Contract Sync

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

Un evento de Core importado a `harness/contract-sync/inbox/` apunta a `github-integration` y su `scopePaths` coincide con `syncScopePaths` de `WI-GH-019`:

- `CS-CORE-20261024-001` (fuente `WI-CORE-079`, SYSTEM-2.15 / INTEROP-2.20 / GH-INTEROP-1.9, revisión fuente `208c3bdfe21bfc4b294da118d8ab1318f0432ca5`, `breaking=false`): esquema canónico `github-webhook-event.schema.json` con 15 ejemplos, documentación en INTEROP §6.5 y revisión de los contratos; pide re-espejar los tres contratos y `spec/contracts/schemas/` byte a byte, regenerar tipos (cambia `generated/`) y, en un WI propio (`WI-GH-020`), validar lo que emite el normalizador contra `GithubWebhookEvent`. Sin cambio de wire.

El acuse significa que GitHub Integration lo acepta y lo enlaza a `WI-GH-019`; la validación del normalizador se enlaza a `WI-GH-020`. Los eventos `20261021-001/003` y `20261024-002/003` (otros destinos) llegaron con el `import` y no se acusan aquí.

## Evento superador (`-004`)

- `CS-CORE-20261024-004` (fuente `WI-CORE-089`, SYSTEM-2.16 / INTEROP-2.21, revisión fuente `2318b9df292b337db4998f04b66b0457f1df8e3f`, `breaking=false`): prosa de INTEROP §6.5/§6.5.1 y SYSTEM neutral respecto del proveedor del LLM; supera a `-001` en `system-contract.md` e `interoperability-contract.md`; `github-integration-contract.md` (GH-INTEROP-1.9) y `schemas` sin cambio. Se acusa en este WI por decisión del usuario («Re-espejar a 2.21/2.16»); se espeja directamente la versión vigente de Core.
