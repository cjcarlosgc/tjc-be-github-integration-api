# WI-GH-007 — Verificación SDD

**Resultado:** `APPROVED` para el alcance aprobado y paso a implementación.  
**Historias:** HU02, HU14.  
**Subtareas:** ST-GH-008 y ST-GH-009.  
**Dependencias:** WI-GH-006 está `W-DONE`; Core WI-014 está `W-DONE` y su Contract Sync de entrada está importado y acusado por WI-GH-007.

Se contrastaron los criterios con `GH-INTEROP-1.2`, las features 003 y 005, el backlog, el roadmap y las reglas de entrega. El webhook debe incluir siempre el campo normalizado `createdAt`; solo una fecha original verificable se convierte a ISO-8601 UTC, y la ausencia o invalidez aislada produce `null` sin sustituir `receivedAt` ni rechazar el resto del evento. La lectura histórica requiere fecha verificable para responder `OK`; si no, devuelve `UNVERIFIABLE` sin `value`. `NOT_FOUND` y `NOT_INSTALLED` conservan su semántica.

La puerta revisó DEC-INF-001 (solo aprovisionamiento remoto), DEC-VAL-001 (solo ingestión/despliegue con código empresarial) y DEC-EXP-FK-001 (solo experimentos que usan Functional Knowledge). Ninguna decisión bloquea normalización o lectura local con fixtures; no hay IDs bloqueantes.

No se cambia autorización, persistencia, lógica de elegibilidad ni comportamiento de Core/Console. Las respuestas upstream de GitHub permanecen allowlisted. El corte es implementable sin decisiones pendientes y pasa a implementación con el alcance ya aprobado por el usuario.
