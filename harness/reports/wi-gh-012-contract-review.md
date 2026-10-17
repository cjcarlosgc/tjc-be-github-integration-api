# WI-GH-012 — Revisión contractual

**Veredicto:** `DECISION_REQUIRED`.

`GH-INTEROP-1.3` exige que `POST /internal/v1/github/checks` cree o actualice un Check y devuelva el mismo `checkId` para el mismo `headSha` y nombre. Sin embargo, el request no incluye `checkId` y el contrato no define cómo seleccionar un Check existente de esta GitHub App, cómo resolver varios candidatos ni la conducta ante creación concurrente. La API de GitHub requiere el identificador del Check run para actualizarlo.

No es seguro inferir esa identidad ni convertir un reintento en una nueva creación. Se requiere que Core, propietario canónico del contrato, precise la selección, la concurrencia y la semántica de duplicados. Los espejos SYSTEM-2.6, INTEROP-2.7 y GH-INTEROP-1.3 sí coinciden byte por byte con Core en `3f06f44543b5899d98232b757310ce6d481624ea`:

- SYSTEM: `670a1ef035d7c60be0a3385ca5f88e2a458b91f8ded2317e9dbbb97c58b07dc2`
- INTEROP: `fcfbd6d6301e7d15ad508b7745bd73c54a3ca06cba03f9372bd3fe9801ec109a`
- GH-INTEROP: `d1779bbdc2445be8760c6b3eea3b73da4663618bab8d471f4d6e932fd7d0b964`

No se modificó `app/`.

## Addendum — Contract Sync de Core (2026-10-11 UTC)

Se importaron y acusaron `CS-CORE-20261010-001` y `CS-CORE-20261010-002`. Sus espejos `SYSTEM-2.6`, `INTEROP-2.7` y `GH-INTEROP-1.4` coinciden byte por byte con Core en `46c7046d015d18e49b0e737f6b61cceef1d6889c` (SHA-256: `52f98f596c3d4efe900739b68cdb43f30716cbfe681edbd87ffae3a6c903ccf8`, `20adb87240b479b801f57febd18d3b8020efffaa6749b3157ebb7211a9835143`, `24ba51156cf3d98edbbca836cc4563981a6f5df2b9adf2df9d0c3bd84f605e0a`).

La precisión define identidad, actualización, concurrencia y el error `GITHUB_CHECK_IDENTITY_AMBIGUOUS`; resuelve el vacío técnico detectado. Sin embargo, la fuente declara `WI-CORE-034` aún `W-READY`. Un Contract Sync pendiente no sustituye la aprobación/cierre del WI del dueño canónico, por lo que el cambio de producto permanece detenido hasta esa evidencia y una re-revisión contractual local.

## Revisión renovada — GH-INTEROP-1.4

`WI-CORE-034` está cerrado con todos sus gates aprobados. La revisión contractual independiente aprueba este corte: `GH-INTEROP-1.4` define la identidad `(repository GitHub estable, GitHub App, headSha, name exacto)`, la convergencia concurrente y `409 GITHUB_CHECK_IDENTITY_AMBIGUOUS` sin escribir ante más de un candidato.

La implementación debe mantener un índice técnico durable con unicidad y serialización por esa clave, reconciliar de forma segura con GitHub antes de crear o reintentar, y usar el ID existente para actualizar. Es índice operacional del adaptador, no persistencia de dominio Core. No hay blocker contractual restante.
