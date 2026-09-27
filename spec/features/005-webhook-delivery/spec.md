# Feature 005 — Webhooks verificados y entrega normalizada

**Estado:** `WI-GH-005` cerrado localmente; el receptor Core está implementado y sus checkpoints de integración pasaron. La exclusión temporal de PRs anteriores al binding está planificada por separado en `WI-GH-007`/`WI-CORE-011`; cualquier cutover externo sigue fuera de alcance.

## Valor relacionado

Habilita HU02, HU14 y HU16 al mantener actualizado el binding de repositorio y disparar análisis de PR sin confiar en eventos falsos ni perder reintentos.

## Alcance

- Recibir el webhook público en GitHub Integration, verificar HMAC-SHA256 sobre bytes crudos y normalizar campos allowlisted conforme a `GH-INTEROP-1.2`.
- Limitar el body crudo a 25 MB, máximo de payload documentado por GitHub; rechazar un body mayor antes de parsear JSON. Este es un límite de transporte del proveedor, no un nuevo límite de producto. [GitHub Docs: Webhook events and payloads](https://docs.github.com/en/webhooks/webhook-events-and-payloads#payload-cap).
- Entregar a Core con credencial GH→Core independiente; responder a GitHub solo tras confirmación de Core.
- La llamada GH→Core tiene un timeout máximo de 8 s; fallo, timeout o respuesta inválida produce 503 neutral para habilitar retry de GitHub. El margen conserva el objetivo documentado por GitHub de responder a webhooks antes de 10 s. [GitHub Docs: Best practices for using webhooks](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks#respond-within-10-seconds).
- No se crea un dominio persistente duplicado en GH.

## Normalización y confirmación

`x-github-event` debe ser un string no vacío; si falta o es inválido, se responde `400 INVALID_REQUEST`. El nombre identifica el `data.kind`: `pull_request` → `PULL_REQUEST`; `installation` → `INSTALLATION`; `installation_repositories` → `INSTALLATION_REPOSITORIES`; `repository` → `REPOSITORY`; `member` → `MEMBER`; `membership` → `MEMBERSHIP`; `organization` → `ORGANIZATION`; `team` → `TEAM`; un nombre de evento desconocido pero no vacío → `IGNORED`. `deliveryId` proviene de `x-github-delivery`, `action` es string o `null`, y `receivedAt` se genera al recibir el evento.

Solo los campos del union `NormalizedWebhookEvent` de `GH-INTEROP-1.2` se envían a Core. IDs GitHub numéricos se convierten a string y `pullRequestNumber` permanece integer. `pullRequest.createdAt` siempre está presente: se obtiene exclusivamente de `pull_request.created_at`, se valida como instante inequívoco y se serializa en ISO-8601 UTC; si falta o es inválido/ambiguo, vale `null`. `receivedAt` conserva la hora en que Integration recibió el webhook y no se usa como sustituto. Esta fecha faltante o inválida no rechaza el webhook ni se considera por sí sola payload malformado; los demás campos requeridos por el union siguen produciendo `400 INVALID_REQUEST` cuando falten o sean inválidos. Core no procesa un Run elegible con `createdAt: null`; mantiene ocultos los Runs afectados y reintenta su clasificación mediante recuperación durable.

Core responde `200` únicamente para un delivery de PR duplicado persistido (`duplicate: true`) y `202` para aceptación nueva o no-op (`duplicate: false`). GH valida que `accepted` sea `true`, el `deliveryId` coincida y la respuesta tenga forma contractual; solo entonces devuelve el resultado a GitHub con el status correspondiente. Una respuesta inválida, `accepted: false`, timeout o cualquier fallo de Core se convierte en `503` neutral, sin reenviar su body, envelope ni ruta interna.

## Fuera de alcance

La idempotencia durable, AnalysisRun, jobs y efectos de dominio permanecen en Core. El receptor normalizado `/internal/v1/github/webhook-events` está presente en el código fuente de Core y autentica GH con credencial servicio-a-servicio. La verificación de la integración entre ambos WIs y sus checkpoints se completa antes de revisión; cambios de URL registrada, secretos productivos, deploy y cutover no están autorizados por este WI.
