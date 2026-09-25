# WI-GH-004 — revisión independiente de implementación

**Fecha:** 2026-09-25  
**Reviewer:** `core_sdd_analyst`, distinto del implementer.  
**Veredicto:** `APPROVED` para el código; no cierra el WI ni sustituye la aprobación humana final de la migración.

## Resultado

- Revisó endpoints, validación DTO, transporte GitHub, límites de cuerpo, publicación, revalidaciones, compensación, neutralización de errores y pruebas.
- El parser JSON de 136 MB se monta solo en las rutas privadas de publicación y valida bearer antes de leer el cuerpo. El blob se limita a 100,000,000 bytes UTF-8 decodificados; solo su llamada upstream solicita hasta 180 s y el resto conserva el timeout de 10 s.
- Se probó el PR cerrado antes de publicar y el cierre/stale durante actualización de ref; se restaura solo si la SHA observada sigue siendo la escrita por esa operación. Una lectura no confiable o SHA distinta devuelve 503 sin rollback ciego.
- Residual aceptado para este corte: GitHub no ofrece compare-and-swap en la actualización de ref. Persiste una ventana TOCTOU entre leer la SHA y restaurar con `force: true`; `rag-tests/` queda reservado al servicio. Esto se documenta como saga compensable, no como transacción distribuida.
- Una llamada contractual posterior confirmó que la frase “PR cerrado no se modifica” debe distinguir el cierre previo al write de la compensación ante cierre durante el update; contrato/spec/reporte quedaron alineados.

## Evidencia

- `cd app && pnpm test` — 69/69 aprobadas.
- `cd app && pnpm lint` — aprobado.
- `cd app && pnpm build` — aprobado.
- `node scripts/sdd-check.mjs`, `node harness/validate-work-items.mjs`, `node harness/validate-harness.mjs`, `node harness/validate-completions.mjs` y `git diff --check` — aprobados.

El test número 69 cubre que no se haga rollback si la referencia ya no apunta al SHA de esta operación. No hubo llamadas reales a GitHub. Los Contract Sync salientes siguen requiriendo respuesta de Core antes de cutover.
