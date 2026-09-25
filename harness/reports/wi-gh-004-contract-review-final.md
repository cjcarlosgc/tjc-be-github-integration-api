# WI-GH-004 — revisión contractual de implementación

**Fecha:** 2026-09-25  
**Reviewer:** `oauth_contract_review`, rol `contract-reviewer`.  
**Veredicto:** `APPROVED` para implementación local; Contract Sync pendiente bloquea cutover, no cierre local.

## Resultado

- `READY` mantiene la respuesta exacta `{ status: 'READY' }`; no se agregan campos a GH-INTEROP-1.0.
- La búsqueda del companion PR coincide con `head` y `base`; Checks, Git blobs, refs y PR usan los parámetros y rutas esperados.
- Solo las rutas privadas de publicación reciben JSON de hasta 136 MB y validan bearer antes del parseo. Cada blob UTF-8 tiene límite de 100 MB, límite documentado por GitHub; la llamada de blob admite hasta 180 s, sin cambiar el timeout de 10 s para otras llamadas.
- La finalización revalida después de mover una ref. Si un PR se cierra durante el update, puede ejecutarse la restauración compensatoria; no se reabre ni se crea el PR y la propuesta no queda publicada. La saga y la carrera residual SHA-read/force-restore están explicitadas en contrato y feature spec.
- No se cambió el espejo byte a byte de `GH-INTEROP-1.0` ni la API pública Core–Console. La interpretación de prosa `READY` sigue pendiente de ratificación por `CS-GH-20260925-003`; una aclaración separada de tamaño, parser y deadline debe publicarse en `CS-GH-20260925-004`.

## Evidencia

- `cd app && pnpm test` — 69/69 aprobadas.
- `cd app && pnpm lint` — aprobado.
- `cd app && pnpm build` — aprobado.
- La revisión se limita al contrato/comportamiento de WI-GH-004; no aprueba el cutover ni cierra la migración de los demás WIs.
