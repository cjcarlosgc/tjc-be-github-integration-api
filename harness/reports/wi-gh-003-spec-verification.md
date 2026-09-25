# WI-GH-003 — Verificación de especificación

**Fecha:** 2026-09-25  
**Estado:** `APPROVED` para continuar la implementación local; no es aprobación de cierre ni resolución del gate contractual.

## Alcance y trazabilidad

- `WI-GH-002` está `W-DONE`; `WI-GH-003` depende de él y cubre `HU06`, `HU14` mediante `ST-GH-003` local a GitHub Integration.
- La feature, plan y subtarea especifican compare, tree, files:batch y pull-request-head conforme a `GH-INTEROP-1.0`; el runtime no depende de Core.
- GitHub pagina commits en Compare, pero devuelve `files` solo en la primera página y con tope de 300. El servicio consulta esa respuesta una vez y devuelve `UNVERIFIABLE` al llegar al tope porque la completitud es ambigua.
- Compare y files:batch no devuelven resultados parciales. Tree lista blobs y preserva `truncated`; el batch admite hasta ocho paths fijados al SHA solicitado.
- Los estados `NOT_FOUND`, `NOT_INSTALLED` y `UNVERIFIABLE` conservan la semántica del contrato; los fallos de página, timeout y respuestas inválidas no se confunden con ausencia.
- No se cambia autorización de Project, persistencia, análisis/RAG, la API pública Core–Console, Sandbox, ni el contrato canónico.

## Decisiones y verificación

- No hay decisiones bloqueantes para las pruebas locales de este WI. `DEC-VAL-001` queda registrada como no bloqueante; no se hará ingestión, despliegue ni producción de evidencia con código empresarial.
- La revisión de `core_sdd_analyst` aprobó continuar la implementación con el criterio fail-closed al tope. Documentación primaria: [GitHub REST API — Compare two commits](https://docs.github.com/en/rest/commits/commits#compare-two-commits).
- Existe una discrepancia con la frase del GH-INTEROP canónico que dice “all pages are combined”. No se modifica el espejo canónico desde GH; se publicará Contract Sync para que Core ratifique/documente la interpretación antes de dar por resuelto el gate contractual o iniciar el cutover.
- `node harness/validate-work-items.mjs` y `node harness/validate-harness.mjs` pasan; el espejo local `GH-INTEROP-1.0` coincide byte por byte con el contrato canónico de Core.
- `CONTRACT_SYNC start` quedó registrado sin eventos entrantes relevantes pendientes.

Este reporte acredita únicamente la preparación SDD. No certifica código, revisión técnica ni cierre del WI.
