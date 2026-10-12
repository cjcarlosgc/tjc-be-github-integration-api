[reviewer::GPT-6 Luna / xhigh] · WI-GH-012 · revisión independiente GH-INTEROP-1.7

# Revisión independiente G — WI-GH-012

Modelo: reviewer · configurado GPT-6 Luna (`gpt-6-luna`) · atendido unknown · esfuerzo xhigh

Fecha: 2026-10-11
Ciclo: quinto y último ciclo autorizado por el usuario para este WI.

## Veredicto

**CHANGES_REQUESTED para WI-GH-012.** La suite completa y los gates locales pasan, y la remediación del P2 de la revisión F queda acreditada. Sin embargo, el flujo con estado local `ACTIVE` puede omitir la búsqueda completa requerida y mutar un candidato aunque ya haya más de uno para la identidad.

## Alcance

Revisar de forma independiente el corte GH-INTEROP-1.7 / SYSTEM-2.8, la remediación del P2 de la revisión F, la implementación, contratos, especificación, Harness y evidencia de pruebas. Este informe no aprueba arquitectura ni decisiones DEC fuera de las aprobaciones ya registradas.

## Hallazgos

### [P1] El estado `ACTIVE` evita la búsqueda completa y puede actualizar pese a una identidad ambigua

En `app/src/github/github-publication.service.ts:83-89, 92-107, 167-175`, cuando `claim()` devuelve `ACTIVE` con `checkId`, el flujo no entra al bloque que ejecuta `findCheckCandidates()`. Pasa directamente a `UPDATE_UNKNOWN` y envía PATCH al id retenido. La búsqueda completa y el 409 solo ocurren en estados `RESERVED`, `CREATE_UNKNOWN` o `RECONCILIATION_REQUIRED`, o después de un 404 del PATCH.

GH-INTEROP-1.7 § «Coordinación de Check Runs con instancia única» exige paginar la búsqueda completa para cada POST y responder `409 GITHUB_CHECK_IDENTITY_AMBIGUOUS` sin mutación cuando encuentra más de un candidato. Un Check remoto previo que aún no fuera visible puede aparecer después de que el proceso ya haya guardado `ACTIVE`; en ese escenario una solicitud posterior parchea el id guardado sin descubrir el duplicado. Las pruebas cubren duplicados desde `RESERVED` y al reconciliar un `ACTIVE` cuyo id responde 404 (`github-publication.service.spec.ts:343-360`), pero no el caso en que el id guardado sigue respondiendo y la búsqueda actual encontraría varios.

Solicito que cada solicitud, incluso desde `ACTIVE`, haga la búsqueda completa bajo el mutex; que varios candidatos terminen en 409 antes de PATCH; y que una prueba de regresión cubra un `ACTIVE` cuyo id existe junto a otro candidato de identidad exacta.

## Evidencia

- `cd app && pnpm test`: **17 archivos aprobados; 182 pruebas aprobadas** (ejecutado en el directorio `app`; 2026-10-11 22:22 hora Lima). Esto reproduce el comando de suite completa declarado por `wi-gh-012-review-f-p2-remediation.md`; confirma que el selector histórico de dos casos de PostgreSQL no se atribuyó a la corrida actual.
- `cd app && pnpm lint`: aprobado.
- `cd app && pnpm build`: aprobado.
- `node scripts/sdd-check.mjs`: aprobado.
- `node harness/validate-work-items.mjs`: aprobado (12 WIs).
- `node harness/validate-harness.mjs`: aprobado.
- `git diff --check`: aprobado.
- `node harness/contract-sync.mjs check --checkpoint before-review --work-item WI-GH-012`: aprobado sin eventos relevantes pendientes; `CS-CORE-20261011-006` aparece resuelto. Se ejecutó sin `--record`, por lo que no se modificó `harness/state.json`.
- SHA-256 de los espejos locales y contratos de Core idénticos: SYSTEM-2.8 `a00666f612d803725857b8256a8141a6955e2123044d8a1c588aa6f3e3ec1194`; INTEROP-2.8 `755c3357ca047ede9fb318a40a594cc68a63fc63f2b9f4c58af93c28f51a8d90`; GH-INTEROP-1.7 `584839c91a088918028bbe80cbf209d8d341246bcf3536288cff1ad0b02c1b34`.
- Inspección de `app/`: coordinación es una estructura `Map` y mutex en proceso; el paquete no declara dependencia PostgreSQL, y no queda migración SQL de coordinación en `app/migrations/`. La prueba de store confirma serialización, identidad sensible a mayúsculas, replay terminal y memoria vacía al crear una instancia nueva.
- `harness/state.json` mantiene WI-GH-012 en `W-IN_PROGRESS`, con revisión independiente y retry limit aún `G-NOT_RUN`; DEC-CHECK-003 figura como no bloqueante y el Harness refleja la excepción autorizada para el quinto ciclo.

## Recomendación

Corregir el bypass del estado `ACTIVE`, añadir la regresión indicada y volver a ejecutar los gates pertinentes. La evidencia del P2 de la revisión F sí quedó remediada por la suite actual completa. Este ciclo queda consumido; no recomiendo `W-DONE` con el hallazgo abierto.

Esta revisión escribió solo este informe; no modificó producto, contratos ni estado Harness, y no realizó push, PR, despliegue o provisión externa.
