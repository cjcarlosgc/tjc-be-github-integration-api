# WI-GH-005 — Verificación SDD

**Resultado:** aprobado para implementación local de GH; no constituye aprobación del código ni autorización de cutover.

## Alcance y fuentes

**Nota histórica:** este informe registra la revisión previa a la implementación del código. Las referencias a sincronía contractual describen el estado en ese checkpoint, no el estado posterior de WI-GH-005.

- WI local `WI-GH-005`, enlazado a `ST-GH-005` y HU02/HU14/HU16. Su dependencia `WI-GH-004` está `W-DONE`.
- Leídos backlog, casos operacionales, contratos aplicables, constituciones, y `spec.md` + `plan.md` + `tasks.md` de feature 005.
- `GH-INTEROP-1.0` define el ingress GitHub→GH→Core y los campos allowlisted. La sección de webhooks de este espejo coincide con la sección correspondiente del archivo canónico presente en Core. El espejo completo difiere solo en aclaraciones de publicación de WI-GH-004, notificadas en `CS-GH-20260925-003` y `CS-GH-20260925-004`, aún pendientes de Core; no afectan webhooks ni impiden el trabajo local de WI-GH-005.

## Criterios y decisiones

- El body raw se limita a 25 MB, máximo de payload que GitHub documenta entregar. Firma HMAC-SHA256 validada antes de parsear; un body excedido se rechaza antes del parseo. Se añadirá prueba de límite exacto y de exceso.
- La matriz evento→`data.kind`, headers requeridos, campos escalares opcionales (`null`), listas opcionales (`[]`) y datos requeridos están definidos en la feature. Eventos desconocidos con nombre no vacío se normalizan a `IGNORED`; nombre ausente/vacío o estructura requerida inválida se rechaza como `400 INVALID_REQUEST`.
- GH solo devuelve `200`/`202` después de validar la aceptación de Core y el `deliveryId`; respuestas, IDs o status inconsistentes y fallos/timeout upstream se vuelven `503` neutral sin reenviar el body de Core.
- El receptor `/internal/v1/github/webhook-events` aún no está en el Core actual. Su autenticación servicio-a-servicio y consumo de evento normalizado están asignados a `WI-CORE-003`; el WI GH se probará con un doble HTTP. Esto bloquea integración/cutover, no la implementación local de GH. No se cambiará Core desde este WI.
- `DEC-GHI-001` está aprobada. `DEC-VAL-001` es no bloqueante para código/datos de demostración y validación local; continúa bloqueando ingestión/despliegue con código empresarial y evidencia empresarial. DEC de Sandbox/Functional Knowledge no alcanzan este WI.
- La aprobación humana individual de cada corte se difiere por la instrucción expresa del usuario: revisión final del conjunto de migración GH al acabar. Continúan obligatorias la revisión independiente por agente, revisión contractual, pruebas y gates Harness; esta excepción no autoriza push, deploy, cambio de URL/secreto ni cutover.

## Revisión

- `sdd-analyst`: **APPROVED**, sin blockers; recomendó cubrir límite exacto/excedido.
- `contract-reviewer`: **APPROVED** para límite, matriz y respuesta segura; identificó además un P2 sobre nombre de evento ausente/vacío, resuelto ahora en la spec (debe ser `400`). El receptor Core ausente es dependencia futura ya asignada, no bloqueo local.
- Pendientes Contract Sync `CS-GH-20260925-003/004`: coordinación de Core para publicación; no son cambios entrantes relevantes a webhooks.

**Siguiente paso:** implementar exclusivamente `WI-GH-005` en `app/`; Core y la configuración externa permanecen intactos.
