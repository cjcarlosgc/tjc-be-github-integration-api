Modelo: contract-reviewer · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo low

# Revisión contractual — WI-GH-019

**Fecha:** 2026-10-24. **Veredicto: APPROVED.**

## (a) Espejos vs Core (solo lectura)
- `cmp` idéntico en los tres contratos; `diff -r` de `spec/contracts/schemas` sin diferencias.
- sha256 coincidentes con lo esperado: system `d0a492b4…3ea77`, interoperability `7f946d55…d29d`, github-integration `dedf00fa…c6e4e`, árbol schemas `8079ab73…9718`.

## (b) Impacto en rutas/DTO/enums/códigos/wire
- GH-INTEROP-1.8→1.9: sección «Estado» documental, cita del esquema CT-01 y ejemplos, y párrafo de brechas entre esquema y parser de Core. Declara sin cambio de wire ni de rutas. Integration ya es más estricto (deliveryId 128, control chars) y el documento lo reconoce como informativo.
- INTEROP 2.19→2.21 / SYSTEM 2.14→2.16: prosa (targetId en ExperimentResultsResponse, neutralización de OpenAI/reasoning_effort, §6.9, lista de schemas, frase neutral). Sin rutas, DTO, enums ni códigos nuevos. Ninguno exige cambio en Integration. `sandbox-result.failed.json` (DEPENDENCY_INSTALL_FAILED) es ejemplo ilustrativo que Integration no consume.
- CS-001 declara INTEROP-2.20 sha f0b39…; CS-004 lo supera con 2.21 (sha esperado). Salto directo a 2.21/2.16 correcto y documentado en el ajuste de versión.

## (c) Tipos generados
- `pnpm contracts:check` limpio. Único cambio en `app/`: `contract-schemas.ts` y `contract-types.ts` (solo adiciones: +760 / +196, 0 eliminaciones; el nuevo esquema webhook).

## (d) Citas vigentes
- Actualizadas a SYSTEM-2.16 / INTEROP-2.21 / GH-INTEROP-1.9 en AGENTS.md, README.md, spec/README.md y project-context.md. CHANGELOG (+2) y tasks.md (+1) solo con adiciones, historia no reescrita. Eventos CS-001 y CS-004 en C-RESOLVED con evidencia.

## Handoff
- status: APPROVED
- findings:
  - P3: comentarios en `app/src/error-envelope.ts`, `error-envelope.contract.spec.ts` y `github/check-coordination.store.ts` citan `GH-INTEROP-1.8` / `INTEROP-2.18` como cita histórica del origen de la regla; no son referencias vigentes, no requieren cambio (modificarlos excedería el alcance «solo dos generados»).
  - P0-P2: ninguno.
- blockers: ninguno
- filesAffected (revisados): spec/contracts/{system,interoperability,github-integration}-contract.md, spec/contracts/schemas/**, app/src/contracts/generated/*, AGENTS.md, README.md, spec/README.md, spec/constitution/project-context.md, CHANGELOG.md, tasks.md, inbox CS-CORE-20261024-001/004
- evidence: cmp/diff -r/sha256 arriba; `pnpm contracts:check` limpio; `git status app` solo dos generados
- recommendedNextStep: continuar con reviewer independiente de WI-GH-019 (lint/build/test fuera de mi alcance) y luego WI-GH-020; no se requiere Contract Sync adicional.
