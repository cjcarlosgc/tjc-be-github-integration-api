# Feature 005 — Webhooks verificados y entrega normalizada

**Estado:** `WI-GH-005` cerrado localmente; la integración end-to-end y el cutover siguen pendientes de `WI-CORE-003`.

## Valor relacionado

Habilita HU02, HU14 y HU16 al mantener actualizado el binding de repositorio y disparar análisis de PR sin confiar en eventos falsos ni perder reintentos.

## Alcance

- Recibir el webhook público en GitHub Integration, verificar HMAC-SHA256 sobre bytes crudos y normalizar campos allowlisted conforme a `GH-INTEROP-1.0`.
- Limitar el body crudo a 25 MB, máximo de payload documentado por GitHub; rechazar un body mayor antes de parsear JSON. Este es un límite de transporte del proveedor, no un nuevo límite de producto. [GitHub Docs: Webhook events and payloads](https://docs.github.com/en/webhooks/webhook-events-and-payloads#payload-cap).
- Entregar a Core con credencial GH→Core independiente; responder a GitHub solo tras confirmación de Core.
- La llamada GH→Core tiene un timeout máximo de 8 s; fallo, timeout o respuesta inválida produce 503 neutral para habilitar retry de GitHub. El margen conserva el objetivo documentado por GitHub de responder a webhooks antes de 10 s. [GitHub Docs: Best practices for using webhooks](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks#respond-within-10-seconds).
- No se crea un dominio persistente duplicado en GH.

## Normalización y confirmación

`x-github-event` debe ser un string no vacío; si falta o es inválido, se responde `400 INVALID_REQUEST`. El nombre identifica el `data.kind`: `pull_request` → `PULL_REQUEST`; `installation` → `INSTALLATION`; `installation_repositories` → `INSTALLATION_REPOSITORIES`; `repository` → `REPOSITORY`; `member` → `MEMBER`; `membership` → `MEMBERSHIP`; `organization` → `ORGANIZATION`; `team` → `TEAM`; un nombre de evento desconocido pero no vacío → `IGNORED`. `deliveryId` proviene de `x-github-delivery`, `action` es string o `null`, y `receivedAt` se genera al recibir el evento.

Solo los campos del union `NormalizedWebhookEvent` de `GH-INTEROP-1.0` se envían a Core. IDs GitHub numéricos se convierten a string y `pullRequestNumber` permanece integer. Un campo escalar opcional ausente se normaliza a `null`; `repositories_added`/`repositories_removed` ausentes se normalizan a arreglos vacíos. Si falta un dato requerido por el union para el evento identificado, el payload firmado se rechaza con `400 INVALID_REQUEST` y no se envía a Core.

Core responde `200` únicamente para un delivery de PR duplicado persistido (`duplicate: true`) y `202` para aceptación nueva o no-op (`duplicate: false`). GH valida que `accepted` sea `true`, el `deliveryId` coincida y la respuesta tenga forma contractual; solo entonces devuelve el resultado a GitHub con el status correspondiente. Una respuesta inválida, `accepted: false`, timeout o cualquier fallo de Core se convierte en `503` neutral, sin reenviar su body, envelope ni ruta interna.

## Fuera de alcance

La idempotencia durable, AnalysisRun, jobs y efectos de dominio permanecen en Core. El receptor normalizado `/internal/v1/github/webhook-events` del lado Core corresponde a `WI-CORE-003`; hasta implementarlo y coordinar el Contract Sync, GH puede probarse localmente contra dobles, pero la ruta no queda integrada end-to-end. Cambios de URL registrada, secretos productivos, deploy y cutover no están autorizados por este WI.
