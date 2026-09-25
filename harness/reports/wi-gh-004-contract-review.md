# WI-GH-004 — Revisión contractual de pre-tarea

**Fecha:** 2026-09-25
**Reviewer:** `oauth_contract_review`, en rol `contract-reviewer`.
**Veredicto:** `APPROVED` para implementar el DTO vigente; no revisa código ni cierra el WI.

## Resultado

- La ruta y el tipo normativos definen `PublicationPreflight.READY` como `{ status: 'READY' }`; GH no agregará `branch` ni `base` a la respuesta.
- La frase descriptiva “READY con branch/base actuales” se interpreta como precondición de verificación. Se publicará Contract Sync para que Core la aclare antes del cutover; cualquier campo nuevo exige cambio aprobado al contrato canónico.
- Checks crea el resultado para el `headSha` y la conclusión que Core envía. La decisión de freshness/conclusión y la elegibilidad del PR permanecen en Core.
- Preflight/blob/finalize verifican freshness y companion PR cerrado; stale no publica refs/PR y un companion PR cerrado no se reabre. La rama companion apunta a `sourceHeadRef`; no se permite merge.
- La decisión de excluir forks del primer incremento sigue siendo de Core; GH no incorpora una regla de elegibilidad.
- Errores directos de GitHub se devuelven mediante el envelope neutral existente; no se exponen cuerpos upstream, tokens ni secretos.

## Scope contractual

No cambia `GH-INTEROP-1.0`, los DTOs ni la API pública Core–Console. La aprobación se limita a la interpretación local explícita en `spec/features/004-checks-publication/` y no autoriza modificar Core, desplegar ni hacer cutover.
