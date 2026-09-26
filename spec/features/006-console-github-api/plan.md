# Plan — API Console GitHub

1. Añadir DTOs, controller y pruebas de las cuatro rutas `/v1/github/*`, sin reutilizar rutas privadas ni su guard de servicio.
2. Añadir cliente GH→Core para authorization decisions: tiempo límite acotado, bearer de servicio separado, JWT de usuario solo en `X-Platform-User-Token`, allowlist de hechos y errores neutrales fail-closed.
3. Resolver identidad/permisos GitHub desde el token de proveedor solo en memoria; verificar instalación/owner/permission/branch en Integration y delegar al Core las reglas de Project y la evidencia firmada.
4. Aplicar CORS con allowlist de Console y validar la configuración local sin registrar valores.
5. Limitar el JSON parser de 136 MB a `proposal-blobs`; la ruta de finalización usa 100 KB.
6. Sincronizar el contrato GH-INTEROP-1.1 con Core y Console; correr SDD/Harness, unit tests, lint y build. Sin deploy, secretos externos, cambios de Sandbox ni retiro/cutover de rutas Core.
7. Mantener el ciclo Contract Sync local reproducible y sus snapshots históricos inmutables en los tres Harnesses activos de la migración.
