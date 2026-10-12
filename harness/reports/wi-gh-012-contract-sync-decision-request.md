# WI-GH-012 — Solicitud de precisión contractual

Se publicó `CS-GH-20261010-001` para Core, propietario canónico de `GH-INTEROP-1.3`.

La solicitud no propone una conducta nueva: pide definir cuál Check run existente corresponde a la misma pareja `headSha + name`, cómo se actualiza, cómo se trata más de un candidato y qué sucede cuando dos llamadas concurrentes no encuentran ninguno. Hasta esa precisión, GitHub Integration no implementa una selección implícita ni crea duplicados por reintento.

El evento está en `harness/contract-sync/outbox/CS-GH-20261010-001.yaml` con estado `C-PENDING`. No se ha modificado Core ni se ha realizado despliegue, push o cutover.
