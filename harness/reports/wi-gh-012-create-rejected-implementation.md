# WI-GH-012 — Replay de `CREATE_REJECTED`

La decisión autorizada se implementó localmente: `GITHUB_CHECK_CREATE_REJECTED` es un error neutral `422`, `retryable: false`. Tras un `POST` que devuelve `422`, el servicio vuelve a paginar la identidad exacta. Solo cero candidatos permite persistir `CREATE_REJECTED`; uno conserva `CREATE_UNKNOWN` y falla cerrado, varios pasan a `AMBIGUOUS`, y un fallo o respuesta incompleta de búsqueda conserva el resultado incierto.

El mismo hash se reproduce desde la reserva sin un segundo `POST` y sin conservar ni devolver el body upstream. Una huella distinta queda sujeta a la reserva y a una nueva búsqueda completa antes de crear.

Evidencia local: `pnpm test -- --run src/github/github-publication.service.spec.ts src/github/check-coordination.store.spec.ts` — 180 pruebas aprobadas, 2 omitidas (incluida la integración PostgreSQL opt-in); `pnpm lint`, `pnpm build` y `git diff --check` aprobados. No se contactó GitHub, no se aplicaron migraciones y no se provisionó infraestructura.

El WI no se cierra: sigue bloqueado por la prueba real contra una PostgreSQL dedicada, vacía y acreditada de GitHub Integration.
