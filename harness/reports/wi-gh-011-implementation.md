# WI-GH-011 — Implementación

Agente: `implementer` (Haiku 5.5 / low); sin escalamiento a `implementer-high`. Resultado: **corrección** (la brecha reproducía; no fue `YA CUMPLE`).

## Brecha confirmada
- `toPermissionLevel` evaluaba el campo legacy `permission` antes de los booleanos y nunca evaluaba `triage`, por lo que reportaba menos privilegio del real.
- `getRepositoryPermission` solo leía el nivel superior de `GET /repos/{o}/{r}/collaborators/{u}/permission`; los booleanos vienen en `user.permissions`.

## Cambio (`app/src/github/github-access.service.ts`, `app/src/github/github-access.service.spec.ts`)
- Orden: `role_name` conocido, booleanos `admin > maintain > push (write) > triage > pull (read)`, legacy `permission`, `null`.
- `triage` añadido al tipo interno; lectura tolerante de `user.permissions`; `none` sigue dando `NOT_FOUND` antes de derivar.
- Sin cambios en el DTO `RepositoryPermissionLevel`, en el objeto público `permissions` del listado, en rutas ni en contratos.

## Evidencia (pruebas primero)
Los fixtures se escribieron antes del arreglo; fallaron 6: legacy `write` + `maintain`, legacy `read` + `triage`, `user.permissions` `{pull, triage}`, `{push, maintain}` y `{push, pull}`, y la lista con `{pull, triage}`. El resto (`role_name`, legacy sin booleanos, rol personalizado `write`/`read`/`unknown`) quedó como regresión.

## Checks (re-ejecutados por el leader)
`pnpm lint` sin hallazgos; `pnpm test` 16 archivos y 157/157 pruebas; `pnpm build` correcto.

## Documentación consultada
Context7 no estuvo disponible; se usó la documentación oficial de la API REST de GitHub (Collaborators).
