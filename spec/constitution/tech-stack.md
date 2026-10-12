# Stack tecnológico

**Estado:** baseline del servicio aprobado por reutilización del backend existente; dependencias concretas se fijan al implementar `WI-GH-001`.

- Backend: NestJS + TypeScript, alineado con Core y compatible con el código GitHub que se extraerá.
- Package manager: pnpm.
- Llamadas HTTP a GitHub/Core detrás de adaptadores para permitir pruebas contractuales sin fakes presentados como integración productiva.
- Configuración por entorno y validación al arrancar; no se versionan secretos ni `.env`.
- No se añade base de datos de dominio ni técnica para la coordinación de Checks. `DEC-CHECK-003` y `GH-INTEROP-1.7` fijan una única instancia activa y mutex efímero en proceso; no hay proveedor ni provisión/despliegue de un recurso adicional.
- Los SDK y librerías GitHub reutilizados se fijan mediante lockfile y revisión de licencias/compatibilidad antes de su incorporación.
- Liveness/readiness y pruebas se integran en el bootstrap NestJS; readiness no depende de conectividad externa.
