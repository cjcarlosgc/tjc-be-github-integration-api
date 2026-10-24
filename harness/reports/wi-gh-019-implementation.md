# WI-GH-019 — Implementación

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

Cambio contractual/documental del leader; en `app/` solo cambian los archivos generados.

- Los tres contratos y `spec/contracts/schemas/` copiados completos desde Core (`2318b9d`, sin ediciones; `rsync --delete` del árbol de esquemas): SYSTEM-2.16, INTEROP-2.21, GH-INTEROP-1.9. Entran `github-webhook-event.schema.json`, 15 ejemplos y entradas en `examples/manifest.json`; el ejemplo `sandbox-result.failed.json` cambia su `code` (ejemplo del Sandbox, no afecta a Integration).
- `pnpm contracts:generate` regeneró `app/src/contracts/generated/contract-types.ts` y `contract-schemas.ts` (5 esquemas); antes de regenerar `contracts:check` fallaba, como se esperaba. El validador Ajv strict carga el esquema nuevo sin errores (218 pruebas pasan).
- Citas vigentes a SYSTEM-2.16 / INTEROP-2.21 / GH-INTEROP-1.9 en `AGENTS.md`, `spec/README.md`, `README.md`, `spec/constitution/project-context.md` y `CHANGELOG.md` (entrada nueva); la historia no se reescribe. Los comentarios `INTEROP-2.18`/`GH-INTEROP-1.8` de `app/src` citan secciones o versiones históricas y no se tocan.
- `CS-CORE-20261024-001` y `-004` resueltos con este reporte. Sin cambio de wire.

## Verificación (2026-10-24)

| Comprobación | Resultado |
| --- | --- |
| `cmp` de los tres contratos y `diff -r` de `schemas` frente a Core | idénticos |
| SHA-256 | `d0a492b4…`, `7f946d55…`, `dedf00fa…`, árbol `8079ab73…` |
| `pnpm contracts:generate` + `contracts:check` | pasa tras regenerar |
| `pnpm lint` / `test` (218) / `build` | pasan |
