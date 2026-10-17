# WI-GH-012 — Evidencia de resolución Contract Sync entrante

## Refrescos SYSTEM/INTEROP

`CS-CORE-20261008-004`, `CS-CORE-20261008-006`, `CS-CORE-20261008-007`, `CS-CORE-20261010-002` y `CS-CORE-20261011-003` quedan satisfechos por los espejos vigentes importados de Core: `SYSTEM-2.7` SHA-256 `50d9dcc03f2af0337c3b11824df8a2c9fdee4c189e8df84bccea3e85cc827f76` e `INTEROP-2.8` SHA-256 `755c3357ca047ede9fb318a40a594cc68a63fc63f2b9f4c58af93c28f51a8d90`. `spec/README.md` registra que ambos, junto con `GH-INTEROP-1.5`, fueron comparados byte a byte contra la revisión de Core `0adbede3e89b154dc720115189822333748c1d2a`. Los tres eventos 20261008 son refrescos textuales supersedidos por esa línea vigente; sus estados globales no cambian.

## Check `checkId` e identidad durable

`CS-CORE-20261009-012` está satisfecho por `POST /internal/v1/github/checks` con `200 { checkId }`, reutilización del id y errores neutrales; `CS-GH-20261010-001` ya notificó a Core la necesidad de persistir el id.

`CS-CORE-20261010-001` está satisfecho por la identidad `(repositoryId, appId, headSha, name)`, la reserva PostgreSQL con clave única, tests de creación/actualización/concurrencia y `409 GITHUB_CHECK_IDENTITY_AMBIGUOUS` ante múltiples candidatos.

## Coordinación GH-INTEROP-1.5

`CS-CORE-20261011-004` está satisfecho localmente por la migración, estado persistido previo a mutaciones remotas, reconciliación fail-closed, replay seguro, runbook y la prueba de dos instancias sobre PostgreSQL temporal aislada (182/182). La evidencia no declara provisión, despliegue ni cutover.

La nueva semántica neutral `GITHUB_CHECK_CREATE_REJECTED` se notificó separadamente en `CS-GH-20261011-002`, que permanece `C-PENDING` hasta que Core publique su revisión canónica; no se confunde con la resolución de los eventos entrantes anteriores.
