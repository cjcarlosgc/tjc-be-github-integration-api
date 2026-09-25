# WI-GH-005 — sincronización canónica

**Fecha:** 2026-09-25 21:27 UTC  
**WI:** `WI-GH-005`  
**Resultado:** aprobado.

El `GH-INTEROP-1.0` local de GitHub Integration coincide byte por byte con la copia canónica Core después de importar, revisar y aceptar `CS-GH-20260925-005`. La verificación `sha256sum` en ambos repositorios produjo:

`98662fa978968e14265ba9d6d208f5f2cc87015a6f8d58d47086cc7ce7262d9`

Core importó y dejó en `C-ACKNOWLEDGED` los eventos `CS-GH-20260925-001`–`005`. El ACK habilita la planificación/implementación y no afirma que Core ya completó sus acciones; la integración del receptor normalizado y el cutover siguen bloqueados por `WI-CORE-003`. El outbox GH conserva sus eventos como `C-PENDING`, pues las transiciones del consumidor no se escriben en el repositorio productor.

Checkpoint Contract Sync `before-done`: aprobado, sin eventos entrantes relevantes pendientes. Sin despliegue, cambio de URL/secretos, webhook registrado, acceso a GitHub real ni push.
