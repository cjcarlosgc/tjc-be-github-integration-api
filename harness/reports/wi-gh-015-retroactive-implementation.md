# WI-GH-015 — Implementación retroactiva

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

**Este WI es retroactivo.** Cuatro de sus cortes ya estaban commiteados en `feature/jean` cuando se abrió: los ejecutó la sesión **cross** (`implementationAgent: cross`) por orden expresa del usuario (excepción puntual «desde cross»), sin WI, sin sdd-analyst y sin revisión independiente. Este WI los regulariza: documenta qué hicieron, los somete a `reviewer` y `contract-reviewer` y cierra la brecha de contrato que se detectó. Ninguno de los cuatro se reescribe ni se revierte aquí.

## Cortes ejecutados desde cross (base `6a3ef5c`)

| Commit | Qué hizo | Tipo | Revisión |
| --- | --- | --- | --- |
| `e6beb06` | Redacta host/IP de la VM de Sandbox del runbook E2E (repos públicos). | Texto, sin comportamiento | reviewer |
| `b457533` | SDD 3.1: elimina `awayMode`, reviewer IA estándar, vía rápida `lane: FAST`, coordinación por cross, quita `archivedActiveWorkItem` huérfano; toca roles, validadores, `state.json` (19 archivos). | Proceso SDD/Harness | reviewer |
| `ffc890b` | `ErrorEnvelope` completo (`statusCode`, `details`, `timestamp`, `path` sin query, `retryable`) en el filtro y los parsers de body; esquemas JSON, tipos generados, validador y test de contrato; espejos GH-INTEROP-1.8 / INTEROP-2.17 / SYSTEM-2.13. | Comportamiento + contrato | reviewer + contract-reviewer |
| `a3ebecf` | 4xx no previstos pasan de 503 reintentable a `INVALID_REQUEST` no reintentable; el store de Checks descarta entradas `ACTIVE` ociosas; red de seguridad de proceso; `engines`, `.nvmrc`, Prettier y CI. | Comportamiento | reviewer + contract-reviewer |

Reportes de cross: `cross-fase2-esquemas-contratos-2026-10-18.md` y `cross-fase3-estabilidad-2026-10-18.md`.

## Corte propio de este WI

- **Brecha detectada:** cross afirmó que los espejos coincidían con Core. Para `interoperability-contract.md` era falso: la copia local llevaba cabecera INTEROP-2.17 pero tenía `4bab54e8…` y Core tiene `b9ed40dc…`; diferían las líneas 87 (nota sobre `pollAfterMs` del Sandbox) y 1539 (tolerancia transitoria de Core ante desvío del esquema). Las otras dos copias y el árbol `schemas` sí coincidían.
- **Corrección:** `interoperability-contract.md` copiado completo desde Core (`67519a2`, sin ediciones), verificado con `cmp` y SHA-256.
- **Contract Sync:** `CS-CORE-20261018-001` importado, acusado (`wi-gh-015-contract-sync-acknowledgement.md`) y, tras la implementación, resuelto. El `import` trajo además 16 eventos antiguos del outbox de Core que no apuntan a `github-integration`; no se acusan.
- `CHANGELOG.md`, `spec/README.md` y `tasks.md` (ST-GH-017) actualizados. Sin cambios en `app/`.

## Verificación (2026-10-18)

| Comprobación | Resultado |
| --- | --- |
| `cmp` / SHA-256 `system`, `interoperability`, `github-integration` y árbol `schemas` frente a Core | idénticos: `b70f9358…`, `b9ed40dc…`, `6c553ee8…`, `c45e4513…` |
| `pnpm contracts:check` | pasa (tipos generados sin cambios) |
| `pnpm lint` | pasa |
| `pnpm test` | 19 archivos, 201 pruebas, todas pasan |
| `pnpm build` | pasa |
| `sdd-check`, `validate-work-items`, `validate-harness` | pasan |

## Límites respetados

Sin INTEROP-2.18, sin tiempo real, sin tag `arch-v1.0`, sin push, PR, merge ni cambios externos. Los cuatro cortes de cross quedan sujetos a lo que determinen `reviewer` y `contract-reviewer` (máximo 2 ciclos); si alguno exige una `DEC`, el WI pasa a `W-DECISION_REQUIRED` y esa parte queda aparcada.
