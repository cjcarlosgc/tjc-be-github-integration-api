# WI-GH-007 — Contract Sync de disponibilidad

**Evento publicado:** `CS-GH-20260927-001`  
**Destinos:** Core y Console  
**WI origen:** WI-GH-007  
**Commit de implementación:** `35bd9f2006240ebcd12ce0c3353d3a43bb1c1d0c`.

El evento comunica que GitHub Integration implementó localmente `GH-INTEROP-1.2`: el webhook normaliza `createdAt` a UTC o `null`; la fecha ausente o inválida por sí sola no rechaza el webhook; y `pull-request-head` exige una fecha verificable para responder `OK`, sin `value` cuando retorna `UNVERIFIABLE`.

Core y Console deben importar el evento y registrar la compatibilidad desde sus WIs locales. La publicación no cambia configuración externa, despliegue ni cutover.
