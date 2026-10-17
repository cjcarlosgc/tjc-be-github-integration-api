[merge-reviewer::GPT-6 Luna / xhigh] · WI-GH-012 · cierre de coordinación efímera de Checks y procedencia Contract Sync

Modelo: merge-reviewer · configurado gpt-6-luna · atendido unknown · esfuerzo xhigh

status: CHANGES_REQUESTED

## findings

- **[P1] Sigue sin corregirse la procedencia de un Contract Sync histórico del rango.** `harness/contract-sync/outbox/CS-GH-20260926-001.yaml` también declara `sourceRevision: feature/jean@working-tree`, que no resuelve a un commit. Core importó y dejó ese evento `C-RESOLVED` en `WI-CORE-003`. El correctivo `CS-GH-20261011-003` cubre expresamente solo `CS-GH-20261011-002`, así que no repara la procedencia de `20260926-001`. No reescribir el evento consumido: hace falta decidir si se publica otro correctivo inmutable con SHA verificable o si se acepta documentadamente una excepción histórica a este gate.
- **[P2] Falta registrar el cierre en el CHANGELOG.** `harness/state.json` registra `WI-GH-012` en `W-DONE`, todos sus gates en `G-PASSED`, la aprobación del Human Reviewer y el cierre a las `2026-10-12T03:32:00Z`. `spec/features/004-checks-publication/tasks.md` también marca `ST-GH-014` como terminado. Sin embargo, las entradas más recientes de `CHANGELOG.md` (líneas 7–9) mantienen el WI «en curso» y la última dice que el cierre espera revisión humana. Añadir una entrada terminal que refleje el cierre autorizado, la deuda `I-GH-001` y el límite de que no hubo despliegue/cutover; conservar las entradas anteriores como historia.

## blockers

- Aclarar/corregir la procedencia de `CS-GH-20260926-001` sin reescribirlo y actualizar el registro de cierre en `CHANGELOG.md`; luego repetir esta revisión sobre el rango actualizado. No hay hallazgos abiertos de código funcional ni de espejo contractual.

## filesAffected

- `CHANGELOG.md`
- `harness/contract-sync/outbox/CS-GH-20260926-001.yaml` (evento histórico; requiere conservarse sin edición)
- `../tjc-be-rag-core-api/harness/contract-sync/inbox/CS-GH-20260926-001.yaml` (copia consumidora ya resuelta, fuera del rango)
- `../tjc-fe-rag-developer-console/harness/contract-sync/inbox/CS-GH-20260926-001.yaml` (copia consumidora ya resuelta, fuera del rango)
- `harness/reports/merge-review-wi-gh-012-1c32c2c.md` (este informe)

## evidence

- **Rango e historia:** base `origin/feature/jean` = `15233cc9edfe30c668740d13ea5b1d8de7dd2edc`; target `1c32c2cc0653e3a3086e9ed17ab265472151737b`; el corte contiene 13 commits lineales y ningún merge commit. La base es ancestro del target. `git ls-remote origin refs/heads/feature/jean` también devuelve `15233cc9edfe30c668740d13ea5b1d8de7dd2edc`, así que el remoto observado no avanzó y el rango sería fast-forward. El commit funcional es `e9de71dd51c15b84d004b7f4ebb84f49213604c7`; `1c32c2c` añade `CS-GH-20261011-003` y dos reportes de Harness, sin cambios de app. Este informe de revisión no forma parte del rango.
- **Contract Sync correctivo:** `CS-GH-20261011-003` usa `sourceRevision: e9de71dd51c15b84d004b7f4ebb84f49213604c7`; `git cat-file` confirma que es un commit existente y ancestro del target. En Core, el inbox registra el evento como `C-ACKNOWLEDGED`, importado por `WI-CORE-040`, con evidencia `harness/reports/contract-sync-provenance-correction-cs-gh-20261011-003.md`. La copia del consumidor solo agrega sus datos de importación/acuse; el payload coincide con el outbox GH.
- **Eventos históricos y procedencia:** `CS-GH-20261011-002` no se reescribió. Core conserva su estado `C-RESOLVED`; el reporte Core del correctivo registra SHA-256 `649b9df83cf7f3fc1b93f7654f581a5badd9b6b23eb12b78062107a434b8a16f` antes y después de importar `003`. El sucesor `003` corrige monotónicamente la procedencia de `002`. Una revisión de los 27 eventos Contract Sync del target encontró dos sourceRevision no resolubles: `20261011-002` (corregido por `003`) y `20260926-001` (sin correctivo). Core y Console tienen este último en `C-RESOLVED`, con `sourceRevision: feature/jean@working-tree`; los reportes de Core lo vinculan a `WI-CORE-003`, y la referencia sigue sin identificar un commit. El estado `C-PENDING` de los outbox productores es consistente con el protocolo; el consumidor guarda sus transiciones en su propio inbox.
- **Espejos:** los contratos locales coinciden byte por byte con Core y Console: SYSTEM-2.8 `a00666f612d803725857b8256a8141a6955e2123044d8a1c588aa6f3e3ec1194`; INTEROP-2.8 `755c3357ca047ede9fb318a40a594cc68a63fc63f2b9f4c58af93c28f51a8d90`; GH-INTEROP-1.7 `584839c91a088918028bbe80cbf209d8d341246bcf3536288cff1ad0b02c1b34`.
- **Harness y aceptación:** `WI-GH-012` está `W-DONE`, `HU14`/`HU16` y `ST-GH-014` están enlazados; el registro conserva los diez gates requeridos en `G-PASSED`, `activeWorkItem` es `null` y el informe de revisión humana acepta el arreglo posterior al quinto ciclo, dejando `I-GH-001` como deuda de aseguramiento. `node harness/validate-work-items.mjs`, `node harness/validate-harness.mjs`, `node harness/validate-completions.mjs` y `node scripts/sdd-check.mjs` aprobaron. `node --test harness/*.test.mjs`: 25/25 aprobados.
- **Gates de app:** ejecuté `pnpm test` dos veces; cada corrida aprobó 17 archivos y 183 pruebas. `pnpm lint` y `pnpm build` aprobaron. `git diff --check origin/feature/jean..1c32c2c` aprobó.
- **Migraciones y datos:** el rango no añade ni modifica migraciones. La búsqueda en `app/` no encuentra configuración/base PostgreSQL de coordinación; no hay cambios a Core/Supabase ni a infraestructura.
- **Secretos:** barrido del target para claves privadas, tokens GitHub (`ghp/gho/ghu/ghs/ghr`), AWS `AKIA`, Google API keys y JWT: cero coincidencias; el rango no añade archivos `.env`, `.pem` o `.key`.
- **Cambios ajenos al rango:** el árbol ya contenía, y esta revisión dejó intactas, modificaciones a `harness/WORKFLOW.md`, `harness/agent-profiles.yaml`, `harness/roles/leader.md` y `harness/roles/merge-reviewer.md`, además de 25 inboxes sin seguimiento (`CS-20260920-002/-003`, `CS-20260921-001/-002/-003`, `CS-20260924-001`, `CS-CORE-20260926-001`, `CS-CORE-20260927-001/-003`, `CS-CORE-20261008-002/-003/-005`, `CS-CORE-20261009-008/-009/-010/-011/-013/-014/-015/-016/-017/-018`, `CS-CORE-20261010-003`, `CS-CORE-20261011-001/-002`). No forman parte del rango. No existe `progress/current.md` en el checkout.
- **Publicación:** no hice merge, push, PR ni despliegue. La referencia remota consultada permanece en el SHA base indicado.

## recommendedNextStep

Pedir dirección para tratar la procedencia histórica de `CS-GH-20260926-001` sin alterar el evento consumido; registrar el cierre de WI-GH-012 en `CHANGELOG.md`; después repetir la revisión sobre el rango actualizado. Si ambos puntos quedan resueltos y el resto permanece igual, el rango puede publicarse por fast-forward una vez que el usuario lo autorice.
