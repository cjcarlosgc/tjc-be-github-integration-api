# Feature 004 — Checks y publicación companion PR

**Estado:** planificada para `WI-GH-004`; no implementada.

## Valor relacionado

Habilita HU16: presentar validación y publicar una propuesta vigente en un companion PR controlado, sin merge autónomo.

## Alcance

- Crear Checks según contrato.
- Implementar la publicación sin estado server-side en tres pasos: preflight, un blob de propuesta por llamada, y finalización con `{ path, blobSha }`.
- Revalidar freshness/HEAD y estado de PR cerrado antes de cada paso con efecto GitHub.
- Mantener errores y resultados neutrales y redactados.

## Fuera de alcance

El consumidor y aprobación de producto siguen en Core; no se añade límite de cantidad de propuestas, no se reabre PR cerrado y no se permite merge automático.
