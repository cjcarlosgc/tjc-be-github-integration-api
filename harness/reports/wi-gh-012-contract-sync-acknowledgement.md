# WI-GH-012 — Acuse de Contract Sync

Los eventos `CS-CORE-20261008-004`, `CS-CORE-20261008-006`, `CS-CORE-20261008-007`, `CS-CORE-20261009-012` (fuentes `WI-CORE-019`, `WI-CORE-020` y `WI-CORE-026`) están importados en `harness/contract-sync/inbox/` y dirigidos a GitHub Integration. Este WI los cubre: su alcance (`system-contract.md`, `interoperability-contract.md` y `github-integration-contract.md`) coincide con `syncScopePaths`. El acuse significa que GitHub Integration aceptó hacerse cargo y enlazó `WI-GH-012`; no afirma que los espejos ni `checkId` estén implementados.

Acción requerida: refrescar byte a byte los espejos SYSTEM, INTEROP y GH-INTEROP-1.3 desde la revisión canónica de Core; implementar la respuesta `200 { checkId }` de `POST /internal/v1/github/checks`; probar creación, actualización con el mismo id y errores sin cambio; y avisar a Core con un `CS-GH-…` para que persista el id. Nada más debe cambiar.

## Addendum — GH-INTEROP-1.4

Los eventos `CS-CORE-20261010-001` y `CS-CORE-20261010-002`, publicados por Core desde `WI-CORE-034`, fueron importados el 2026-10-11 UTC y se acusan para su revisión local. Fijan la identidad de Check por repositorio estable, GitHub App, `headSha` y nombre, la convergencia concurrente y el error `GITHUB_CHECK_IDENTITY_AMBIGUOUS` ante candidatos múltiples.

El acuse no declara resuelto el cambio ni autoriza por sí solo la implementación: `WI-CORE-034` todavía figura `W-READY` en la fuente, por lo que GitHub Integration conserva `WI-GH-012` en `W-DECISION_REQUIRED` hasta contar con una evidencia de cierre/aprobación canónica del WI fuente y una nueva revisión contractual local.

## Addendum — CS-CORE-20261011-004 / GH-INTEROP-1.5

Importado `CS-CORE-20261011-004`, publicado desde `WI-CORE-038`, en la revisión canónica `0adbede3e89b154dc720115189822333748c1d2a`. Por delegación expresa del usuario, Core resolvió el bloqueo de topología eligiendo PostgreSQL administrado, dedicado y propiedad exclusiva de GitHub Integration para la reserva compartida entre réplicas; no se comparte la base de dominio Core/Supabase ni se restringe el servicio a una instancia.

Se sincronizaron byte por byte los tres espejos con Core. SHA-256: SYSTEM-2.7 `50d9dcc03f2af0337c3b11824df8a2c9fdee4c189e8df84bccea3e85cc827f76`; INTEROP-2.8 `755c3357ca047ede9fb318a40a594cc68a63fc63f2b9f4c58af93c28f51a8d90`; GH-INTEROP-1.5 `fbbda9603c0ac4f881287a713603246e69c7518875b3d8a2e0631842cedf37bc`.

El evento se acusa bajo WI-GH-012 para continuar revisión/implementación; permanece sin resolver hasta que exista evidencia local de implementación. El trabajo exige unicidad/claim PostgreSQL, reconciliación fail-closed sin POST/PATCH ciego ante resultado incierto, migración aditiva, pruebas multi-instancia y operación/retención según GH-INTEROP-1.5. El Contract Sync no declara implementada la base ni autoriza su selección de proveedor, provisión, despliegue o cutover.

## Addendum — CS-CORE-20261011-003 / INTEROP-2.8

También se importó y acusó `CS-CORE-20261011-003` (fuente `WI-CORE-036`, revisión `187b0383817e341aa7c82e91cb36d7dcce343479`). El evento confirma que el refresco de SYSTEM-2.7 e INTEROP-2.8 no requiere cambio de producto, API, comportamiento de GitHub tree/blob ni política Composer/PHPUnit en GitHub Integration. Queda asociado al mismo WI-GH-012 y al reporte de revisión contractual refresh.
