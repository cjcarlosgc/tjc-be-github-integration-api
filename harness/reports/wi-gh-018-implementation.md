# WI-GH-018 — Implementación

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

Cambio documental del leader; sin cambios en `app/` ni en `spec/contracts/schemas/`.

- `system-contract.md` (SYSTEM-2.14) e `interoperability-contract.md` (INTEROP-2.19) copiados completos desde Core (`3d2383e`, sin ediciones). El diff es documental: cabeceras, nota de enmienda y sección `DEC-EXP-005` (configuración única del LLM de Core) y §1/§6.5.1 de INTEROP; no toca GH-INTEROP, error envelope, rutas ni Checks.
- Citas vigentes actualizadas en `AGENTS.md`, `spec/README.md` (líneas 5 y 13, primera mención) y `CHANGELOG.md` (entrada nueva). La historia (`CHANGELOG` previo, `tasks.md`, segunda mención de `spec/README.md:13`) no se reescribe. Comentarios `INTEROP-2.18` de `app/src` no cambian: citan §4/§10, que 2.19 no modifica.
- `CS-CORE-20261021-004` resuelto con este reporte.

## Verificación (2026-10-21)

| Comprobación | Resultado |
| --- | --- |
| `cmp` de `system`, `interoperability`, `github-integration` y `diff -r` de `schemas` frente a Core | idénticos |
| SHA-256 | `f60d6c4b…`, `f9866d16…`, `6c553ee8…`, árbol `a1ba9a19…` |
| `pnpm contracts:check`, `lint`, `test` (218), `build` | pasan |
