# WI-GH-013 — Verificación SDD

Modelo: sdd-analyst · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo low

Estado: `SUFFICIENT`.

- Alcance: sincronizar byte a byte `SYSTEM-2.12` e `INTEROP-2.15` desde Core (`17642e0d554bc0cefad8a0d438eb9c5263f00c0d`), verificar `GH-INTEROP-1.7` sin cambios, actualizar referencias documentales vigentes y resolver `CS-CORE-20261012-006` y `-008`. Autorizado en `harness/reports/fase2-scope-approval.md`. HARNESS, documental; sin cambios en `app/` ni en `GH-INTEROP`.
- IDs: `HU02`, `HU14` y `ST-GH-015` (T-READY, WI-GH-013) coinciden con `spec/features/006-console-github-api/tasks.md`; `component: GH` y `activeWorkItem` en `harness/state.json` coherentes con el WI.
- Hashes de Core verificados (coinciden con `externalDependencyGate`): SYSTEM-2.12 `d180d4b1...f507`, INTEROP-2.15 `1c793c6f...dfd9`, GH-INTEROP-1.7 `584839c9...1b34`. `github-integration-contract.md` local ya es idéntico (`cmp`); los otros dos difieren y requieren la copia.
- Decisiones: `DEC-VAL-001` sigue `PENDING` (Blocks: ingestión/despliegue con código empresarial y evidencia empresarial) y no alcanza este WI. `DEC-INF-001`/`DEC-INF-002` están aprobadas (Blocks NONE) y `DEC-VAL-002` aprobada en SYSTEM-2.10. No hay `PROPOSED` abiertas aplicables. Ninguna decisión bloquea `W-SPEC_VERIFIED`.
- Impacto 2.8 -> 2.15: INTEROP-2.9 (404 `FUNCTIONAL_QUESTION_NOT_FOUND`, `functionalBehaviorValidated`, `resultSummary` OC11), 2.10 (`DEC-VAL-002`; Check `neutral` por `INFRASTRUCTURE_FAILURE`, ya mapeo vigente), 2.13-2.15 (experimentos, traza RAG `dependencyContext`/`final`), SYSTEM-2.12 (`DEC-INF-002`, E2E de producción). Todo es de Core/Sandbox; ninguna ruta, DTO o regla de `GH-INTEROP-1.7` ni de `app/` cambia. No se detecta `DECISION_REQUIRED`. Nota menor del `requiredAction` de -006: la descripción del límite de 300 archivos del compare es propiedad de Integration y ya está recogida en `GH-INTEROP-1.7`; solo se revisa, sin cambio.
- Referencias documentales vigentes a actualizar a SYSTEM-2.12 / INTEROP-2.15 (GH-INTEROP-1.7 se mantiene):
  1. `AGENTS.md:19` («Actualmente rigen `SYSTEM-2.8`, `INTEROP-2.8` y `GH-INTEROP-1.7`»).
  2. `spec/README.md:5` (línea «Espejos locales de GH», incluido el texto de revisión `CS-CORE-20261011-006` / `313f560d...`).
  3. `spec/README.md:13` (viñeta de contratos y sincronización, con `CS-CORE-20261011-006`).
  4. `CHANGELOG.md`: añadir entrada WI-GH-013 al inicio; no tocar las entradas WI-GH-012 (líneas 7-8).
  5. `spec/contracts/system-contract.md` e `interoperability-contract.md`: se reemplazan por copia completa (no editar a mano).
  - Revisados y sin cambio: `spec/contracts/github-integration-contract.md:9` (cita Core, byte-idéntico), `spec/features/004-checks-publication/tasks.md:4` (histórico, solo GH-INTEROP-1.7), `harness/work-items.json:482` (WI-GH-012 histórico), y todo `harness/reports` y `harness/contract-sync`. Sandbox mantiene su línea base; no se toca.
- Contract Sync: `-006` y `-008` ya están `C-ACKNOWLEDGED` (`wi-gh-013-contract-sync-acknowledgement.md`); pasan a `C-RESOLVED` con la evidencia de los `cmp`/SHA tras la copia. No se emite Contract Sync.
- Puerta externa: `G-PASSED` (`wi-gh-013-external-dependency-gate.md`).
- Cierre: Modo fuera de casa activo; la revisión independiente la hace el agente `reviewer` (máximo 2 ciclos) y, si se agotan, queda pendiente para el usuario.
