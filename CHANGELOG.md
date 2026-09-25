# Changelog

Los cambios relevantes de comportamiento, contratos y línea base se registran aquí. El detalle de cambios previos permanece en Git.

## Unreleased

- Inicializado el SDD 3.0 y Harness V3 local para el componente GitHub Integration, sin implementación productiva ni despliegue.
- Registrado `WI-GH-001` para bootstrap, health y configuración del servicio; queda en `W-READY` hasta seleccionar y verificar el corte.
- Dividida la extracción funcional en `WI-GH-002` (discovery/acceso), `WI-GH-003` (lecturas PR), `WI-GH-004` (Checks/publicación) y `WI-GH-005` (webhooks), con subtareas locales, dependencias y Contract Sync.
- El espejo local `GH-INTEROP-1.0` se sincroniza byte a byte con Core tras revisión independiente aprobada. Se especifican OAuth/provider-token transitorio, errores neutrales y publicación por archivo sin añadir límite de producto.
