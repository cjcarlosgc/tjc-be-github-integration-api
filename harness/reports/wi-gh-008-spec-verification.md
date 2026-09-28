# WI-GH-008 — Verificación SDD

**Resultado:** `APPROVED` para actualizar el estado documental de GH; la sincronización contractual permanece pendiente del Contract Sync dirigido a GH.
**Historias:** HU02, HU14.
**Subtarea:** ST-GH-010.
**Dependencia local:** WI-GH-007 está `W-DONE`; WI-CORE-011 está `W-DONE`.

Se revisaron el backlog, el roadmap, AGENTS.md, el contexto, la arquitectura y las features 003/005. Las afirmaciones vigentes que describen WI-GH-007 en presente o en `W-IN_REVIEW` contradicen su snapshot `W-DONE`; su corrección no modifica comportamiento. La diferencia contractual también fue verificada: SYSTEM-2.5 es byte idéntico a Core/Console; el archivo local INTEROP sigue en 2.5, mientras las fuentes Core/Console están en 2.6. No se encontró una excepción aprobada que autorice a GH a mantener INTEROP-2.5 como espejo.

La actualización del espejo INTEROP requiere recibir un Contract Sync dirigido a GitHub Integration. Los eventos existentes `CS-CORE-20260927-001` (WI-CORE-012) y `CS-CORE-20260927-003` (WI-CORE-011) tienen como único target a Console; `CS-CORE-20260927-002` (WI-CORE-014) cubre únicamente `spec/contracts/github-integration-contract.md` y fue resuelto por WI-GH-007. Por lo tanto, ninguno autoriza importar el espejo INTEROP-2.6 en este WI.

Se comprobaron las decisiones pendientes relevantes: `DEC-INF-001`, `DEC-VAL-001` y `DEC-EXP-FK-001` tienen Blocks limitados a aprovisionamiento remoto, ingestión/despliegue empresarial y experimentos con Functional Knowledge, respectivamente. Ninguna bloquea esta corrección documental ni la copia byte por byte de INTEROP. No hay decisiones bloqueantes.

WI-GH-008 pasa a implementación para corregir los documentos locales autorizados; no puede pasar a revisión hasta que Core emita el Contract Sync correcto y la copia INTEROP quede sincronizada. No se modifica Sandbox ni se declara deploy/cutover.
