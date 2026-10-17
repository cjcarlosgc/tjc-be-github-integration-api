# WI-GH-007 — Revisión contractual

**Resultado:** `APPROVED` con una obligación de entrega local al finalizar.  
**Contrato canónico:** `GH-INTEROP-1.2`, propiedad de Core.  
**Espejo:** coincide byte por byte; SHA-256 `9c58c9afa1d2bda201b604d82d606a57e86b3244578d14054f2cb5a9a7f5d9b6`.

La implementación conserva la forma aditiva del union de webhook al agregar `createdAt: string | null`; conserva `receivedAt` con su semántica de recepción; y no expone el payload raw. Para `pull-request-head`, el contrato exige `{ headSha, state, createdAt }` únicamente dentro de un resultado `OK`; una fecha no verificable produce el estado existente `UNVERIFIABLE` y omite `value`, mientras los errores upstream conservan sus estados actuales.

El cambio local no altera rutas ni la API pública Core–Console. Core y Console son consumidores del contrato ampliado, por lo que al terminar la implementación se debe publicar un Contract Sync namespaced desde WI-GH-007 dirigido a ambos. El evento entrante `CS-CORE-20260927-002` queda acusado por compatibilidad, no resuelto hasta que la implementación y su evidencia estén listas.
