# Plan — Webhooks y entrega a Core

## Corte

1. Montar un parser raw solo para el ingress de webhook, limitarlo a 25 MB (el máximo que GitHub entrega) y validar la firma en tiempo constante antes de parsear JSON; la readiness comprueba configuración local, sin llamadas de red.
2. Normalizar solo los campos enumerados; para PR derivar `createdAt` de `pull_request.created_at` como ISO-8601 UTC o `null`, sin rechazar la entrega por la fecha sola. Probar familias instalación, repositorio, acceso, PR e ignorados sin persistir cuerpos crudos.
3. Implementar cliente saliente a Core con bearer independiente, deadline de 8 s y mapeo seguro de respuestas (Core acepta con `200`/`202`; GH no espera el análisis asíncrono final).
4. Probar aceptación, respuesta inválida/mismatch de Core, duplicado/repetición idempotente, payload malformado, firma inválida, body en el límite de 25 MB y body excedido, timeout y 5xx de Core.
5. Publicar Contract Sync namespaced ligado a `WI-GH-005`.
6. Para `WI-GH-007`, cubrir fecha válida, ausente, inválida y ambigua; verificar que `receivedAt` no se use como reemplazo y que no se comparta payload raw.

## Dependencias y operación

`WI-GH-004` debe estar `W-DONE` (precondición satisfecha). El receptor normalizado GH→Core está implementado; Contract Sync y `before-review` del consumidor Core pasaron. El WI Core sigue abierto para revisión humana. El webhook actual continúa registrado y activo mientras no exista autorización separada para cutover; no cambiar config externa en este WI.
