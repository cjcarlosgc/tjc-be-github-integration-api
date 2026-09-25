# Plan — Checks y publicación

## Corte

1. Reutilizar el cliente App/instalación, autenticación de Core y cliente GitHub existentes; no introducir otra credencial ni SDK.
2. Crear Checks con el `headSha` y la conclusión entregados por Core y responder `204`; no inferir estado del Run ni hacer una consulta de freshness.
3. Implementar preflight con respuesta wire exacta (`READY` sin branch/base), lectura del PR fuente y detección de un companion PR cerrado.
4. Revalidar PR fuente abierto/head y companion PR no cerrado antes de crear cada blob y antes de finalización; enviar un archivo Base64 por llamada, sin tope de producto agregado nuevo.
5. En finalización, revalidar antes de cada cambio visible, construir el árbol/commit desde la rama derivada del SHA y crear o actualizar el companion PR hacia `sourceHeadRef`; reutilizar uno abierto y nunca reabrir uno cerrado.
6. Probar con transporte simulado que stale o cerrado no publique ramas, refs ni PRs, que los DTOs/errors sean exactos y que los fallos de GitHub sean neutrales y redactados.
7. Publicar Contract Sync namespaced ligado a `WI-GH-004`, incluyendo la aclaración de preflight READY para que Core resuelva la frase ambigua antes del cutover.

## Dependencias y restricciones

`WI-GH-003` debe estar `W-DONE`. Core conserva los límites actuales de producto y envía un archivo por llamada interna. No modificar rutas públicas Core→Console, proveedor OAuth, Sandbox ni infraestructura externa.
