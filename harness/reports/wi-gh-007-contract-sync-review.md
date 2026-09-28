# WI-GH-007 — Revisión de Contract Sync de entrada

**Evento:** `CS-CORE-20260927-002`  
**Origen:** `WI-CORE-014`, RAG Core  
**Estado del WI origen:** `W-DONE`  
**Revisión:** compatible con el alcance local de WI-GH-007.

Core publicó la extensión aprobada de `GH-INTEROP-1.2`: el webhook transmite `pullRequest.createdAt` derivado solo de `pull_request.created_at`; los valores ausentes o inválidos se representan como `null`, sin usar `receivedAt` como reemplazo. La lectura `pull-request-head` solo devuelve `OK` con una fecha verificable y, si no puede verificarla, devuelve `UNVERIFIABLE` sin `value`.

El evento exige importar el contrato canónico byte por byte y registrar la recepción antes de implementar. La copia local `spec/contracts/github-integration-contract.md` tiene SHA-256 `9c58c9afa1d2bda201b604d82d606a57e86b3244578d14054f2cb5a9a7f5d9b6`, igual a la fuente de Core. El evento identifica como revisión de origen `40a93bead66e7eac15f515065ec204e3526b78df`.

La recepción se acusa por WI-GH-007. Este ACK confirma importación y compatibilidad de alcance; la implementación, las pruebas y la disponibilidad local permanecen pendientes hasta completar este WI. Los demás eventos importados en esta bandeja se dirigen a `console` y no alcanzan `github-integration`.
