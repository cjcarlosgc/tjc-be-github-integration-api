# WI-GH-017 — Cierre

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

Cerrado tras 2 ciclos de revisión independiente (reviewer: ciclo 1 APPROVED con P2-1/P3 corregidos, ciclo 2 APPROVED). Sin contrato (`contractImpact=false`).

- `process-safety` ya no registra `error.message` ni stack (solo nombre sanitizado y `code` corto); `graceful-shutdown` cierra con tope `SHUTDOWN_TIMEOUT_MS` (default 10000, 1000–60000) y cubre `uncaughtException`, SIGTERM y SIGINT sin doble cierre; pruebas nuevas del barrido tras 200 claims y del reclamo tras expulsión del store de Checks; citas `INTEROP-2.18` en comentarios.
- Validadores, lint, 218 pruebas, build y `contracts:check` en verde.

## Pendientes fuera del WI

- P3-3: con el timer `unref` y un cierre colgado sin otras manijas, el proceso podría salir con 0 tras `uncaughtException` (caso borde).
- Falta una prueba directa del cableado de `main.ts`.
- Una segunda señal tras la primera vuelve al comportamiento por defecto de Node y termina el proceso (aceptado).
- Los tipos generados citan INTEROP-2.17 en comentarios generados; cambian cuando Core actualice el esquema.
