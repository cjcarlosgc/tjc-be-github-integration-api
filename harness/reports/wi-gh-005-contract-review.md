# WI-GH-005 — revisión contractual de implementación

**Fecha:** 2026-09-25  
**Reviewer:** `oauth_contract_review`, rol `contract-reviewer`.  
**Veredicto final:** `APPROVED` tras resolver el único hallazgo P2.

## Resultado

- Implementación comparada con `spec/features/005-webhook-delivery` y `GH-INTEROP-1.0` local.
- El header `x-github-event` ausente/inválido se rechaza como `400`; un evento desconocido válido se acepta como `IGNORED` sin reenviar payload raw.
- Core solo puede confirmar `200 + duplicate: true` para un evento `PULL_REQUEST`; otras aceptaciones nuevas/no-op requieren `202 + duplicate: false`. Una combinación inválida o mismatched se vuelve `503 CORE_WEBHOOK_UNAVAILABLE` neutral.
- El body crudo se limita a 25 MB, HMAC se valida antes de parsear y GH no refleja cuerpos/campos extra de Core.
- `WI-CORE-003` mantiene el trabajo del receptor `/internal/v1/github/webhook-events`; integración y cutover continúan bloqueados hasta ese trabajo y la coordinación Contract Sync.

**Hallazgo resuelto:** inicialmente se aceptaba un `200 + duplicate: true` para eventos no PR. El cliente ahora valida el tipo normalizado y una prueba de regresión demuestra que rechaza esa respuesta con 503. El reviewer re-aprobó el delta y confirmó 106 pruebas.

**Sincronización:** los detalles de body máximo, deadline 8 s y errores webhook de `CS-GH-20260925-005` quedaron incorporados al canónico Core y el espejo GH es byte por byte idéntico. El evento saliente permanece `C-PENDING` en el outbox productor hasta que el consumidor lo resuelva; Core lo importó y aceptó localmente como `C-ACKNOWLEDGED`. La implementación Core y el cutover siguen en `WI-CORE-003`.
