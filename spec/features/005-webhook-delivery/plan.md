# Plan — Webhooks y entrega a Core

## Corte

1. Configurar recepción raw-body con límites explícitos y validación de firma constante-time.
2. Normalizar solo los campos enumerados; probar familias instalacion, repositorio, acceso, PR e ignorados sin persistir cuerpos crudos.
3. Implementar cliente saliente a Core con bearer independiente, timeout acotado y mapeo seguro de respuestas.
4. Probar aceptación, duplicado/repetición idempotente, payload malformado, firma inválida, timeout y 5xx de Core.
5. Publicar Contract Sync namespaced ligado a `WI-GH-005`.

## Dependencias y operación

`WI-GH-004` debe estar `W-DONE`. El webhook actual continúa registrado y activo mientras no exista autorización separada para cutover; no cambiar config externa en este WI.
