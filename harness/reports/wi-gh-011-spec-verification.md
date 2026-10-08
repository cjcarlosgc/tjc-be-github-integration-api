# WI-GH-011 — Verificación SDD

Verificación independiente del `sdd-analyst` (`SDD_VERIFIED`, sin bloqueos), consolidada por el leader.

- Alcance: confirmar y, si reproduce, corregir la derivación del nivel de permiso (`toPermissionLevel`) sin cambiar el DTO `RepositoryPermissionLevel` ni el contrato. Autorizado en `smart-v3-scope-approval.md`.
- Decisiones: ninguna `DEC-*` con `Blocks` alcanza este WI.
- Observaciones de precisión: el tipo `ApiPermission` no existe (la función recibe un tipo inline); el tipo interno debe ganar `triage`; en `GET .../collaborators/{u}/permission` los booleanos vienen en `user.permissions`, que hoy no se lee.
- Resultado esperado: corrección, no `YA CUMPLE` (brecha reproducible por lectura de código y marcada PARCIAL en la matriz de WI-GH-010).
- Límites: no ampliar el objeto público `permissions` del listado (`admin, maintain, push, pull`); `none` sigue dando `NOT_FOUND` antes de derivar; tocar solo `github-access.service.ts` y su spec.
- Consulta de documentación: Context7 no está disponible en esta sesión; la forma de la respuesta se confirmó en la documentación oficial de la API REST de GitHub (Collaborators, «Get repository permissions for a user»): `permission` legacy (`admin|write|read|none`; `maintain`→`write`, `triage`→`read`), `role_name` y `user.permissions {pull, triage, push, maintain, admin}`.
