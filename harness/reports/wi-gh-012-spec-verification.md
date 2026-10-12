# WI-GH-012 — Verificación SDD

**Resultado:** aprobado para implementación local. La instrucción del usuario de implementar los WI pendientes autoriza seleccionar este corte; no autoriza push, despliegue, cutover ni cambios en Core, Console o Sandbox.

## Alcance y dependencias

- `WI-GH-012` está enlazado a `ST-GH-014` y a HU14/HU16.
- Solo cambia la respuesta de `POST /internal/v1/github/checks` a `200 { checkId: string }`. Core sigue decidiendo contenido, conclusión y vigencia; no cambia request, autenticación, errores ni las demás rutas.
- La puerta externa es `G-PASSED`: `WI-CORE-019`, `WI-CORE-020` y `WI-CORE-026` están cerrados. Los Contract Sync `CS-CORE-20261008-004`, `-006`, `-007` y `CS-CORE-20261009-012` están importados y acusados; deben resolverse con la implementación y la sincronización de los espejos.

## Decisiones

No hay decisiones `PENDING` o `PROPOSED` que bloqueen este alcance. `DEC-INF-001` y `DEC-VAL-001` no bloquean un cambio local probado; continúan bloqueando, respectivamente, aprovisionamiento remoto y despliegue/ingestión de evidencia empresarial.

## Gates siguientes

Antes de tocar producto se refrescan byte por byte los espejos SYSTEM-2.6, INTEROP-2.7 y GH-INTEROP-1.3 desde la revisión canónica de Core. La implementación debe probar creación, actualización con el mismo `checkId` y errores sin regresión; luego se requieren lint, pruebas, build, validadores SDD/Harness, revisión contractual, Contract Sync saliente a Core y revisión independiente humana.
