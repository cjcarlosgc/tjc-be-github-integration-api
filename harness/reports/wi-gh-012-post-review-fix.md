# WI-GH-012 — Corrección posterior a revisión E

La revisión E detectó que un `POST` con HTTP 422 seguido de una reconciliación completa con un único Check candidato dejaba la reserva en `CREATE_UNKNOWN` y respondía 503. Se corrigió el flujo: adopta el `checkId` exacto como `ACTIVE`, entra al flujo de actualización `UPDATE_UNKNOWN → PATCH → ACTIVE` y devuelve ese id. Mantiene un único POST inicial y nunca crea otro Check.

La prueba verifica el id adoptado, un solo POST y un PATCH al candidato. La suite local pasó con 180 pruebas y 2 PostgreSQL opt-in omitidas; `pnpm lint`, `pnpm build`, `git diff --check`, `validate-work-items` y `validate-harness` pasan.

La prueba PostgreSQL temporal que antes pasó 182/182 no se pudo repetir porque su base desechable ya no está disponible; no se provisionó ni modificó infraestructura. La revisión E fue `CHANGES_REQUESTED` y agotó la excepción explícita del tercer ciclo, por lo que esta corrección espera revisión humana antes de cualquier cierre.
