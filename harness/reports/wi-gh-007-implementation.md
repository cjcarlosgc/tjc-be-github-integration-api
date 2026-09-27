# WI-GH-007 — Evidencia de implementación

**Estado:** implementación local terminada, pendiente de revisión independiente del usuario.  
**Rama:** `feature/jean`.

Se agregó un validador compartido para timestamps originales de GitHub. Acepta fechas calendáricas válidas con hora y zona explícitas, rechaza valores ambiguos o fuera del formato representable y serializa instantes válidos a ISO-8601 UTC. El webhook siempre incluye `pullRequest.createdAt`; fechas ausentes o no verificables quedan como `null`, sin afectar la aceptación por sí solas ni usar `receivedAt`. `pull-request-head` devuelve `OK` solo cuando `headSha`, `state` y `createdAt` son verificables; de lo contrario omite `value` con `UNVERIFIABLE`.

Las pruebas cubren conversión de offsets a UTC, ausencia, formato inválido, día de calendario inválido, timestamp sin zona, fecha sin hora y offset `-00:00` (desconocido). También comprueban el DTO enviado a Core y la respuesta HTTP interna de `pull-request-head`.

## Verificaciones

- `npm test`: 16 archivos y 136 pruebas aprobados.
- `npm run lint`: aprobado.
- `npm run build`: aprobado.
- `node harness/validate-work-items.mjs`: aprobado.
- `node harness/validate-harness.mjs`: aprobado.
- `node harness/validate-completions.mjs`: aprobado.
- `node scripts/sdd-check.mjs`: aprobado.
- `git diff --check`: aprobado.
- SHA-256 del contrato local y de Core coincide: `9c58c9afa1d2bda201b604d82d606a57e86b3244578d14054f2cb5a9a7f5d9b6`.

El evento entrante `CS-CORE-20260927-002` quedó `C-RESOLVED` con esta evidencia. El checkpoint Contract Sync `implementation-delivery` se registró sin pendientes relevantes el `2026-09-27T21:48:09Z`. La publicación GH→Core/Console se registra después de crear el commit de implementación, para que su `sourceRevision` apunte a un commit verificable.
