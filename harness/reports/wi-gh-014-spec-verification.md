# WI-GH-014 — Verificación SDD

Modelo: sdd-analyst · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo low

Estado: `SUFFICIENT`.

- Alcance: re-sincronizar byte a byte `interoperability-contract.md` a `INTEROP-2.16` desde Core (`bfbaa04ae4f9caafb4f26d55ab12849bb389451f`, solo lectura), verificar `SYSTEM-2.12` y `GH-INTEROP-1.7` sin cambios y actualizar referencias vigentes. HARNESS, documental; autorizado en `wi-gh-014-scope-approval.md` (delegación de Jean a Cross). Sin cambios en `app/` ni en `GH-INTEROP`.
- IDs: `HU02`, `HU14` y `ST-GH-016` (T-READY, WI-GH-014) coinciden con `spec/features/006-console-github-api/tasks.md:8`; `activeWorkItem` en `harness/state.json` apunta a WI-GH-014 (component GH).
- Hashes y `cmp` frente a Core (HEAD `bfbaa04a...`): `system-contract.md` `d180d4b1...f507` idéntico; `github-integration-contract.md` `584839c9...1b34` idéntico; `interoperability-contract.md` local `1c793c6f...dfd9` (INTEROP-2.15) difiere de Core `411bd549...db789` (INTEROP-2.16) y requiere copia completa. Coinciden con `externalDependencyGate`.
- Decisiones: `DEC-VAL-001` sigue `PENDING` pero su `Blocks` (ingestión/despliegue con código empresarial) no alcanza este WI; las `DEC-INF-*`/`DEC-VAL-002` están aprobadas. Ninguna bloquea `W-SPEC_VERIFIED`.
- Impacto INTEROP-2.16: `StageDuration` (§7.3, Core<->Sandbox) agrega `startedAt?`/`completedAt?` opcionales; Core los conserva solo en evidencia interna. Es ajeno a Integration: `grep` en `app/` no encuentra `StageDuration` (los `startedAt` existentes son temporizadores locales de logging en `github-user-api.service` y `github-ui-core-client`, sin relación). No cambia `GH-INTEROP-1.7` ni `app/`. No se detecta `DECISION_REQUIRED`.
- Referencias documentales VIGENTES a pasar de INTEROP-2.15 a 2.16:
  1. `AGENTS.md:19` (`SYSTEM-2.12`, `INTEROP-2.15` y `GH-INTEROP-1.7`).
  2. `spec/README.md:5` (línea «Espejos locales de GH»; actualizar también la revisión Core a `bfbaa04a...`/WI-GH-014, manteniendo la frase de homologación pendiente).
  3. `spec/README.md:13` (viñeta de copias espejo; INTEROP-2.16 sincronizado con `WI-GH-014`).
  4. `CHANGELOG.md`: entrada nueva WI-GH-014 al inicio; no tocar la entrada WI-GH-013 ni anteriores.
  5. `spec/contracts/interoperability-contract.md`: reemplazo por copia completa (no editar a mano).
  - Excluidas (historia/no vigentes): `spec/features/006-console-github-api/tasks.md:7` (ST-GH-015 T-DONE), `harness/work-items.json` (WI-GH-013 histórico y WI-GH-014 que ya lo describe), `harness/reports/*` previos, `harness/state.json`, y menciones internas a 2.15 dentro del propio contrato (se reemplaza completo).
- Contract Sync: ninguno nuevo para `github-integration`; `CS-CORE-20261014-001` (destino console) no se importa ni se acusa.
- Puerta externa: `G-PASSED` (`wi-gh-014-external-dependency-gate.md`).
- Cierre: tras implementar, validadores SDD/Harness, tests del harness y `git diff --check`; revisión independiente según AGENTS.md (usuario o `reviewer` si Modo fuera de casa activo).
