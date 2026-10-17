Modelo: contract-reviewer · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo low

# WI-GH-013 · Revisión contractual (documental)

Veredicto: CONTRACT_OK (sin DECISION_REQUIRED). Revisado commit 88bb881 contra Core `17642e0d554bc0cefad8a0d438eb9c5263f00c0d` (solo lectura).

## Espejos byte a byte (cmp + sha256)
- system-contract.md (SYSTEM-2.12): cmp OK, d180d4b1...f94f507
- interoperability-contract.md (INTEROP-2.15): cmp OK, 1c793c6f...fa0dfd9
- github-integration-contract.md (GH-INTEROP-1.7): cmp OK, 584839c9...b1b02c1b34; sin cambios en el commit.

## Alcance del diff (HEAD~1)
- 0 archivos bajo `app/`; GH-INTEROP no tocado. En spec/contracts solo cambian system e interoperability.
- Otros cambios: AGENTS.md, CHANGELOG.md, spec/README.md, 2 eventos inbox, reportes, state.json, work-items.json (W-SELECTED a W-IN_PROGRESS), tasks.md (ST-GH-015 a T-IN_PROGRESS).

## Contract Sync
- CS-CORE-20261012-006 y -008: C-RESOLVED, con resolutionEvidence apuntando a wi-gh-013-implementation.md.
- Eventos del outbox de Core con target github-integration: 18; los 18 existen en el inbox local (ninguno falta).
- WI-GH-013 tiene publishesContract=false; harness/contract-sync/outbox sin eventos nuevos (el último es CS-GH-20261011-003).

## Impacto 2.8 a 2.15 sobre app/ y GH-INTEROP
No exige cambios. Los cambios son: INTEROP-2.9 (aclaración de errores de answers, continuationAttemptId, resultSummary OC11), 2.13 (technicallyValidRate/assertionFailureCount de experimentos), 2.14/2.15 (dependencyContext y `final?` en traza RAG, solo PHP), DEC-VAL-002 (precedencia de estado del Run en Core) y DEC-INF-002 (Core-Sandbox por HTTPS). Todos son de Core, Console o Sandbox. El límite de 300 archivos del compare sigue declarado propiedad de GitHub Integration y el contrato no lo fija; el Check neutral por INFRASTRUCTURE_FAILURE ya era el mapeo vigente. Ninguna ruta, DTO ni enum de GH-INTEROP-1.7 cambia.

## Referencias documentales
- AGENTS.md: "SYSTEM-2.12, INTEROP-2.15 y GH-INTEROP-1.7": exacto.
- spec/README.md: versiones y hash de Core `17642e0d...` exactos; la mención "contratos sin cambios desde 4b0f34a3..." no se verificó contra el historial de Core (no es verificable solo con este repo); resto exacto.
- CHANGELOG.md: entrada WI-GH-013 coherente con los hechos verificados.

## Observaciones no bloqueantes
- Quedan 25 eventos antiguos en inbox con estado C-PENDING/PENDING (anteriores a este WI, no modificados por él ni dentro de su alcance -006/-008). Conviene una pasada de conciliación aparte.
- Cutover y homologación con Sandbox siguen pendientes, como declara la documentación.
