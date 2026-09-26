# WI-GH-006 — Verificación SDD

**Fecha:** 2026-09-26
**Resultado:** SDD revisado para implementación local; no aprueba el código, la revisión independiente, el cutover ni el cierre del WI.

## Fuentes revisadas

- `spec/features/006-console-github-api/spec.md`, `plan.md` y `tasks.md`.
- `spec/contracts/github-integration-contract.md`, `spec/contracts/interoperability-contract.md` y `spec/contracts/system-contract.md`.
- `spec/backlog.md` para las historias relacionadas HU01, HU02, HU14 y HU16.
- `harness/work-items.json` y `harness/state.json` para alcance, subtareas, dependencias y decisiones registradas.

## Resultado

- Las cuatro capacidades de Console tienen rutas de usuario distintas a las privadas internas.
- La autorización síncrona Integration→Core, la evidencia firmada del binding y la propiedad de dominio/persistencia Core están especificadas sin enviar credenciales de servicio al navegador.
- Parser de 136 MB está acotado a publicación privada de blobs; webhook raw tiene límite propio y el JSON general conserva 100 KB.
- Los criterios prohíben modificar Sandbox y realizar despliegue, cambio de secretos externos o cutover.
- El Harness local incluye dos subtareas enlazadas a `WI-GH-006`; las pruebas/validación y visto bueno final continúan pendientes de gates propios.

No se encontró una decisión `PENDING`/`PROPOSED` registrada como bloqueante para este WI. La aprobación de arquitectura `GH-INTEROP-1.1` permite la implementación fuente, no la aprobación final del producto.
