# Feature 002 — Acceso a repositorio para vinculación

**Estado:** planificada, `W-PLANNED`; no seleccionable ni implementable hasta `WI-GH-001` en `W-DONE`.
**Historia relacionada:** HU02, sin crear una HU adicional.

Esta feature prepara la primera operación GitHub de dominio que Core delegará al servicio: verificar acceso de la App, resolver metadatos/permiso vigentes y obtener ramas para vincular un repositorio. Core conserva la autorización de Project y el ciclo de vida de `RepositoryBinding`.

## Límite

- Implementar solo operaciones ya descritas por el GH-INTEROP vigente después de revisión independiente y sincronización final del espejo.
- No cambiar contratos, rutas públicas Core-Console, discovery OAuth, publicación ni webhooks en este WI.
- No aceptar operaciones GitHub desde Console ni persistir dominio/tokens en GH.
- Depender de `WI-GH-001` completado; el Harness y las dependencias prohíben seleccionarlo antes.

## Criterio de preparación

El corte puede ser seleccionado después de que WI-GH-001 cierre, el contrato aplicable tenga revisión independiente y un nuevo pase SDD confirme criterios/datos de extracción. Hasta entonces sus criterios son una intención de backlog, no autorización para implementar.
