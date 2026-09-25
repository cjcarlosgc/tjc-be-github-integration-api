# WI-GH-005 — Contract Sync saliente

**Evento:** `CS-GH-20260925-005`  
**Destino:** Core (`core`)  
**Estado:** publicado en el outbox local como `C-PENDING`.

El evento informa a Core que GH implementó el ingress verificado y la entrega normalizada, documenta el máximo de 25 MB, timeout de 8 s, respuesta de error y regla de duplicados exclusiva para PR. Solicita que el dueño canónico revise/sincronice `GH-INTEROP-1.0` y confirme/implemente `POST /internal/v1/github/webhook-events` mediante `WI-CORE-003` antes del cutover.

`sourceRevision: 3ff7e1b` identifica el commit local de implementación que originó el evento. Publicar en el outbox no modifica Core ni equivale a ACK. La salida no bloquea pruebas locales GH; la puerta `canonicalContractSynced` y el cutover quedan pendientes de respuesta/acción del dueño canónico.
