# WI-GH-004 — publicación Contract Sync 004

**Fecha:** 2026-09-25
**Evento:** `CS-GH-20260925-004`
**Estado:** `C-PENDING`, publicado a Core.

El evento se publicó desde el commit `bc392d9`, que contiene el contrato local y la implementación correspondiente. Notifica el máximo nativo de 100 MB por blob, autenticación antes del parser JSON/Base64 ampliado de 136 MB, deadline upstream de 180 s para la carga y semántica best-effort para compensación de refs. No cambia el DTO ni autoriza cutover.

Core debe confirmar que el cliente interno puede enviar cuerpos de ese tamaño y mantener un timeout compatible antes de migrar su consumidor. La respuesta pendiente bloquea el cutover coordinado; no bloquea el cierre local de `WI-GH-004`.
