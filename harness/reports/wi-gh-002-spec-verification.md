# WI-GH-002 — Verificación de especificación

**Fecha:** 2026-09-25
**Estado:** SDD verificada; la aprobación humana de la extracción ya está registrada por la autorización previa del usuario para iniciar la implementación; no es aprobación de cierre.

## Alcance y trazabilidad

- `WI-GH-001` figura `W-DONE` en `completedWorkItems`; la dependencia local está satisfecha.
- `ST-GH-002` enlaza `WI-GH-002` y `HU02`; el WI es local al componente GH y no crea HU nueva.
- Feature, plan, task y `GH-INTEROP-1.0` cubren App info, discovery efímero, instalación, owner/metadata, permisos, organizaciones y ramas.
- Se extraen llamadas y autenticación GitHub, no `RepositoryBinding`, autorización de Project/workspace, identidad Supabase, persistencia ni efectos de dominio Core.
- Se preservan login, flujo, scope, DTO y respuestas exitosas del discovery; las rutas públicas Core–Console tampoco cambian porque el consumidor Core no se migra en este WI.
- GH distingue `401` de `403`/`429` ambiguos (estos últimos son `GITHUB_UPSTREAM_UNAVAILABLE` reintentable). El mapeo interno `403 → 503` no está escrito literalmente en GH-INTEROP-1.0; Contract Sync solicitará ratificación a Core. Antes del futuro cutover, el WI de Core debe confirmar la traducción pública frente al `401` actual.
- El contrato espejo coincide byte por byte con el canónico de Core; el WI implementa sus rutas ya aprobadas, no cambia el contrato canónico.

## Decisiones y riesgo

- `DEC-GH-001`, `DEC-WEB-AUTH-001`, `DEC-ORG-001` y `DEC-ORG-002` están aprobadas y delimitan el flujo.
- No hay decisión bloqueante para implementar con pruebas aisladas. `DEC-VAL-001` queda registrada como no bloqueante: reserva ingestión/despliegue con código empresarial y evidencia de producción, que no forman parte de este WI.
- Discovery clasifica solo `401` como `GITHUB_USER_TOKEN_INVALID`; `403`/`429` se tratan como `GITHUB_UPSTREAM_UNAVAILABLE` reintentable para no confundir rate limits o permisos ambiguos con sesión vencida. Esta interpretación del `403` es una decisión local que se somete a Contract Sync, no un cambio aprobado al contrato canónico. Los cuerpos/mensajes crudos de GitHub no se registran ni se devuelven.

## Revisión y checkpoints

- `gh002_spec_audit` revisó la consistencia de spec/plan/tasks y confirmó que la extracción no cambia OAuth ni la API pública; tras corregir una contradicción inicial, la reauditoría no encontró blockers.
- El chequeo `CONTRACT_SYNC start` para `WI-GH-002` registró cero eventos relevantes pendientes.
- La aprobación de alcance/arquitectura para extraer GH-INTEROP y comenzar implementación procede de la instrucción explícita previa del usuario “empieza a implementar”, reiterada en esta continuación con “ya lo revisé todo ok, sigue”.

Este reporte verifica SDD y autorización inicial únicamente. No certifica implementación, pruebas, revisión independiente final ni cierre del WI.
