[merge-reviewer::GPT-6 Luna / xhigh] · WI-GH-012 · Revisión del corte local publicable origin/feature/jean..e9de71d

Modelo: merge-reviewer · configurado gpt-6-luna · atendido unknown · esfuerzo xhigh

# Revisión de fusión/publicación — WI-GH-012 / e9de71d

status: CHANGES_REQUESTED

## findings

- **[P1] Proveniencia inválida en Contract Sync saliente.** `harness/contract-sync/outbox/CS-GH-20261011-002.yaml:12` declara `sourceRevision: feature/jean@working-tree`, que no resuelve a un commit (`git rev-parse --verify 'feature/jean@working-tree^{commit}'` falla). El mismo evento aparece en el inbox de Core como `C-RESOLVED`, con evidencia de ACK y resolución. El protocolo del productor exige que todo `sourceRevision` exista en el historial y prohíbe reescribir eventos ya citados (`../tjc-be-rag-core-api/harness/contract-sync/README.md:48`). Así, el consumidor ya resolvió un evento cuya procedencia no puede verificarse; el rango no queda listo para publicación.

## blockers

- Resolver la procedencia de `CS-GH-20261011-002` sin cambiar silenciosamente el evento ya importado/resuelto. Se requiere una reparación trazable acordada con Core; un nuevo evento de corrección debe usar un SHA completo existente y preservar el histórico del ID original.

## filesAffected

- `harness/contract-sync/outbox/CS-GH-20261011-002.yaml`
- `../tjc-be-rag-core-api/harness/contract-sync/inbox/CS-GH-20261011-002.yaml` (copia consumidora ya resuelta; fuera del rango local)

## evidence

- **Rango y hunks:** `origin/feature/jean` (`15233cc9edfe30c668740d13ea5b1d8de7dd2edc`) es ancestro de `e9de71dd51c15b84d004b7f4ebb84f49213604c7`; el rango tiene 12 commits lineales y no contiene commits de merge. `git show --check e9de71d` y `git diff --check origin/feature/jean..e9de71d` pasan; no hay marcadores de conflicto. Los commits incluyen su línea `Refs:`. El `fast-forward` es posible respecto de los refs locales revisados; antes de publicar debe comprobarse que el remoto no avanzó.
- **Contrato espejo:** SYSTEM-2.8, INTEROP-2.8 y GH-INTEROP-1.7 coinciden byte a byte con Core y Console. SHA-256 respectivamente: `a00666f612d803725857b8256a8141a6955e2123044d8a1c588aa6f3e3ec1194`, `755c3357ca047ede9fb318a40a594cc68a63fc63f2b9f4c58af93c28f51a8d90`, `584839c91a088918028bbe80cbf209d8d341246bcf3536288cff1ad0b02c1b34`. `CS-CORE-20261011-006` usa `sourceRevision` `313f560d405a582cd549255e27d5630bd668ad7e`, presente en el historial de Core; su estado local y evidencia de resolución son coherentes.
- **Eventos de entrada:** las diferencias de los eventos históricos ya versionados cambian estados/evidencias locales de Contract Sync; no reescriben sus campos de contrato. Los eventos de Core nuevos tienen IDs distintos y los dos eventos salientes no colisionan entre sí.
- **Harness y cierre:** `harness/work-items.json` y `state.completedWorkItems` muestran WI-GH-012 en `W-DONE`, con `HU14`, `HU16`, `ST-GH-014`, todos los gates requeridos aprobados y handoff `human-reviewer` respaldado por `wi-gh-012-user-review.md`. `activeWorkItem` es `null`. El snapshot archivado conserva el estado previo a la aprobación humana; no reemplaza el registro completado. `validate-work-items`, `validate-harness` y `validate-completions` pasan. El chequeo interactivo de Contract Sync ya no acepta este WI porque no hay WI activo; el checkpoint `before-done` consta en el snapshot completado.
- **Contrato de Checks y datos:** el código usa store/mutex efímero en proceso; el diff no introduce una migración ni configuración PostgreSQL de coordinación. `rg` no encuentra configuración o referencias PostgreSQL de coordinación en `app/`; el scope conserva la restricción de una instancia activa de GH-INTEROP-1.7. No se observan cambios a Core/Supabase ni a infraestructura.
- **Gates sobre el HEAD revisado:** dos ejecuciones de `pnpm test` aprobaron cada una 17 archivos y 183 pruebas; `pnpm lint`, `pnpm build`, los tres validadores Harness y `git diff --check` aprobaron.
- **Secretos:** barrido de patrones de clave privada, GitHub token, AWS key, Google API key y JWT en el diff: 0 coincidencias. No hay rutas `.env` ni archivos de clave en el rango.
- **Cambios fuera de rango:** las modificaciones sin stage en `harness/WORKFLOW.md`, `harness/agent-profiles.yaml`, `harness/roles/leader.md`, `harness/roles/merge-reviewer.md` y los inbox históricos permanecieron intactos y no forman parte de esta revisión.
- **Publicación:** no se hizo merge, push, PR ni despliegue durante la revisión.

## recommendedNextStep

Coordinar con Core la reparación monotónica de la proveniencia ya consumida, sin editar `CS-GH-20261011-002` en silencio. Después de registrar evidencia válida en ambos repositorios, repetir la revisión de publicación contra el rango actualizado y confirmar que `origin/feature/jean` no avanzó.
