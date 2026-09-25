# Convenciones

- API interna REST/JSON; DTOs explícitos, validación de entrada y respuestas normalizadas de contrato.
- No devolver stacks ni errores crudos de GitHub.
- IDs estables y timestamps ISO-8601.
- Configuración centralizada; validar y fallar de forma segura si falta configuración local obligatoria.
- Redactar `Authorization`, `X-GitHub-Provider-Token`, firma/header secreto, payload crudo de webhook y URLs firmadas.
- No registrar ni persistir tokens, claves privadas o body webhook crudo.
- Los webhooks validan la firma sobre body crudo antes de parsear; enviar a Core solo el evento normalizado.
- No efectuar operaciones de GitHub desde health/readiness.
- Pruebas separan la semántica de contrato de una conexión real a GitHub; no presentar mocks como evidencia live.
