# Tareas — Webhooks y entrega normalizada

- [x] **ST-GH-005 [T-DONE] (WI-GH-005; HU02, HU14, HU16):** verificar y normalizar webhooks GitHub y entregar a Core solo tras aceptación confirmada. El corte local pasa pruebas y revisiones; la integración end-to-end/cutover permanecen fuera de este WI y dependen de WI-CORE-003.
- [x] **ST-GH-008 · T-DONE · WI-GH-007 · HU02, HU14:** incluir siempre `pullRequest.createdAt` en el webhook normalizado como fecha original ISO-8601 UTC o `null`; validar instante y zona explícita, la fecha faltante/inválida no rechaza el evento y no se sustituye por `receivedAt`.
