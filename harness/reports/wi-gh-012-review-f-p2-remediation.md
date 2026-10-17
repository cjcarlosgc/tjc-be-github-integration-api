# Remediación de P2 de revisión F — WI-GH-012

Fecha: 2026-10-11

La inconsistencia indicada por la revisión F era válida para la evidencia histórica de PostgreSQL: un selector del archivo de integración de dos casos no podía acreditar 182 pruebas. `GH-INTEROP-1.7` reemplazó esa topología y eliminó dicho archivo, store durable y migración; no se afirma que aquel selector haya ejecutado la suite completa.

La evidencia del corte vigente se volvió a ejecutar con el comando exacto que sí selecciona toda la suite actual:

```text
cd app && pnpm test
Test Files  17 passed (17)
Tests       182 passed (182)
```

También pasaron `cd app && pnpm lint` y `cd app && pnpm build`. El resultado cubre las pruebas de mutex intra-proceso, sensibilidad de identidad, replay terminal en memoria, reinicio de estado y reconciliación de publicación que reemplazan la evidencia multi-instancia PostgreSQL. La revisión F se conserva como evidencia histórica de 1.6, pero su P2 no bloquea el contrato 1.7.

No se provisionó una base ni se hicieron cambios externos.
