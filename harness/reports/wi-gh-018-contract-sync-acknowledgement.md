# WI-GH-018 — Acuse de Contract Sync

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

Un evento de Core importado a `harness/contract-sync/inbox/` apunta a `github-integration` (entre otros destinos) y su `scopePaths` (`system-contract.md`, `interoperability-contract.md`) coincide con `syncScopePaths` de `WI-GH-018`:

- `CS-CORE-20261021-004` (fuente `WI-CORE-076`, SYSTEM-2.14 / INTEROP-2.19, revisión fuente `3d2383e4b6efc20162b77945261fe08d384094a8`, `breaking=false`, informativo): `DEC-EXP-005` enmienda `DEC-EXP-004` (configuración única del LLM). Pide a GitHub Integration re-espejar los dos contratos byte a byte, sin cambio de código ni de `GH-INTEROP-1.8`.

El acuse significa que GitHub Integration lo acepta y lo enlaza a `WI-GH-018`; no afirma que los espejos ya coincidan.
