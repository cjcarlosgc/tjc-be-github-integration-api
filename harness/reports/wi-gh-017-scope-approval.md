# Autorización de alcance — WI-GH-017, estabilidad de proceso (GitHub Integration)

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

**Fecha:** 2026-10-21 (America/Lima)
**Origen:** hallazgos P3-3 y P3-4 de la revisión independiente de `WI-GH-015`; la sesión [TN]-Cross pidió abrir el WI. El relevo de cross no es aprobación; la dio el usuario en el chat de esta sesión.

## Respuesta del usuario

El usuario respondió literalmente: «Aprobado: abre WI-GH-016 de estabilidad (process-safety sin error.message crudo, cierre de main.ts con tope de tiempo, pruebas de barrido de 200 claims, reclamo tras expulsión y main.ts). Sin contrato, sin push.» El número `WI-GH-016` ya estaba asignado al re-espejo de INTEROP-2.18 (aprobado después como WI activo), así que este WI toma el siguiente, `WI-GH-017`; el alcance es el aprobado.

## Alcance aprobado (y solo este)

1. `process-safety` sin `error.message` crudo en logs.
2. `main.ts` cierra con tope de tiempo.
3. Pruebas del barrido tras 200 claims del store de Checks, del reclamo tras expulsión y del cierre de `main.ts`.
4. Retoque textual `INTEROP-2.17` → `INTEROP-2.18` en comentarios de `app/src` (P3 de la revisión de `WI-GH-016`; sin comportamiento).

## Límites

Sin cambio de contrato, de rutas ni de respuestas públicas (`GH-INTEROP-1.8` intacto), sin otro P3, sin push, PR, merge ni infraestructura externa. Si hiciera falta una `DEC` o tocar contrato, el WI pasa a `W-DECISION_REQUIRED`.
