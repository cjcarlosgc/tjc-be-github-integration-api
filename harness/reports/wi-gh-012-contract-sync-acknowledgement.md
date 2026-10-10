# WI-GH-012 — Acuse de Contract Sync

Los eventos `CS-CORE-20261008-004`, `CS-CORE-20261008-006`, `CS-CORE-20261008-007`, `CS-CORE-20261009-012` (fuentes `WI-CORE-019`, `WI-CORE-020` y `WI-CORE-026`) están importados en `harness/contract-sync/inbox/` y dirigidos a GitHub Integration. Este WI los cubre: su alcance (`system-contract.md`, `interoperability-contract.md` y `github-integration-contract.md`) coincide con `syncScopePaths`. El acuse significa que GitHub Integration aceptó hacerse cargo y enlazó `WI-GH-012`; no afirma que los espejos ni `checkId` estén implementados.

Acción requerida: refrescar byte a byte los espejos SYSTEM, INTEROP y GH-INTEROP-1.3 desde la revisión canónica de Core; implementar la respuesta `200 { checkId }` de `POST /internal/v1/github/checks`; probar creación, actualización con el mismo id y errores sin cambio; y avisar a Core con un `CS-GH-…` para que persista el id. Nada más debe cambiar.
