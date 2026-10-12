# Plan — Checks y publicación

## Corte

1. Reutilizar el cliente App/instalación, autenticación de Core y cliente GitHub existentes; no introducir otra credencial ni SDK.
2. Mantener request/respuesta `200 { checkId }` y buscar todos los candidatos por repositorio GitHub estable/App/`headSha`/`name` exacto. Serializar solo la única instancia activa mediante mutex en memoria, sensible a mayúsculas/minúsculas.
3. Conservar en memoria `CREATE_UNKNOWN` o `UPDATE_UNKNOWN` antes de la llamada remota. Crear solo tras búsqueda completa sin candidatos y sin incertidumbre viva; adoptar un candidato único, devolver `409 GITHUB_CHECK_IDENTITY_AMBIGUOUS` ante varios. Un 422 inequívoco más búsqueda completa cero conserva `CREATE_REJECTED` y reproduce `422 GITHUB_CHECK_CREATE_REJECTED` durante la vida del proceso; ante resultado incierto no repetir POST/PATCH a ciegas y fallar cerrado con `503 GITHUB_CHECK_COORDINATION_UNAVAILABLE`.
4. Retirar store, configuración, health/readiness, dependencia y migración PostgreSQL exclusivas de coordinación. No habilitar réplicas, workers duplicados ni rolling overlap; no hacer backfill ni tocar Core/Supabase.
5. Cubrir carreras dentro del proceso, fallos antes/después de cada llamada remota, `CREATE_REJECTED`, reconciliación e inicio con memoria vacía tras reinicio. No provisionar recursos ni cambiar infraestructura externa desde este WI.
6. Implementar preflight con respuesta wire exacta (`READY` sin branch/base), lectura del PR fuente y detección de un companion PR cerrado.
7. Revalidar PR fuente abierto/head y companion PR no cerrado antes de crear cada blob y antes de finalización; enviar un archivo Base64 por llamada hasta el límite nativo de 100 MB por blob de GitHub, con deadline GitHub de hasta 180 s para uploads, sin tope de cantidad de producto agregado nuevo. Autenticar antes de parsear cuerpos grandes y limitar ese parser a las rutas privadas de publicación.
8. En finalización, revalidar antes de cada cambio visible, construir el árbol/commit desde la rama derivada del SHA y crear o actualizar el companion PR hacia `sourceHeadRef`; la búsqueda compara head y base; reutilizar uno abierto y nunca reabrir uno cerrado.
9. Probar con transporte simulado que stale o cerrado no publique ramas, refs ni PRs, que los DTOs/errors sean exactos, que los fallos ambiguos no desencadenen rollback ciego, que el parser acepte propuestas mayores a 100 KB solo tras autenticar y que los fallos de GitHub sean neutrales y redactados.
10. Publicar Contract Sync namespaced ligado a `WI-GH-004`, incluyendo la aclaración de preflight READY para que Core resuelva la frase ambigua antes del cutover.

## Dependencias y restricciones

`WI-GH-003` debe estar `W-DONE`. Core conserva los límites actuales de producto y envía un archivo por llamada interna. No modificar rutas públicas Core→Console, proveedor OAuth, Sandbox ni infraestructura externa.
