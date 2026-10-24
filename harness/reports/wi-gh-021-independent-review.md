Modelo: reviewer · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

# WI-GH-021 — Revisión independiente

**Veredicto: APPROVED** (sin P0/P1/P2; dos observaciones P3 no bloqueantes).

## Verificación del diff
1. **Retornos y motivos.** Los siete retornos `UNVERIFIABLE` de `listOrganizationInstallations()` pasan por `warnUnverifiable()` con el motivo correcto: JWT (`JWT_NO_FIRMABLE`), `api.request` lanzado (`GITHUB_SIN_RESPUESTA`), `!response.ok` (`GITHUB_HTTP_<n>`), no-arreglo (`RESPUESTA_NO_ES_LISTA`), `account` ausente (`AUSENTE`), tipo distinto de Organization/User (`OTRO`), ids/login inválidos de Organization (`Organization`) y agotamiento de páginas (`DEMASIADAS_PAGINAS`). Las condiciones son equivalentes a las originales (mismo orden y mismos predicados); el helper devuelve el mismo literal `{status:'UNVERIFIABLE'}`. Constructor, firma, wire y `readJson` sin cambios; el `Logger` es un campo propio, no inyectado.
2. **Fugas.** El mensaje solo contiene motivo, `duracionMs` (entero) y `errorName()` (validado por `SAFE_NAME`, 64 chars alfanuméricos, si no `Error`). No hay `error.message`/stack, cuerpos, JWT, clave, ids ni logins. El estatus solo se interpola si es entero 100..599 (si no, `GITHUB_HTTP_DESCONOCIDO`); el tipo de `INSTALACION_INVALIDA` es un conjunto cerrado y nunca el valor crudo.
3. **Pruebas.** Una por motivo real (JWT, sin respuesta con regex de duración sin depender del reloj, 401/403/404/429, no lista, tres tipos de inválida, 10 páginas) y OK sin WARN. La de no fuga serializa todos los argumentos de cada llamada a `warn` y cubre respuesta 500 con cuerpo, id y login sentinela, tipo Bot y clave inválida.
4. **Ruido y rendimiento.** Una línea WARN por llamada UNVERIFIABLE (a lo sumo una por llamada de `ACCESS_REVERIFY`); `Date.now()` por página es despreciable. Volumen acotado por la frecuencia de reintentos de Core.
5. **Harness / secretos.** `work-items.json` y `state.json` registran WI-GH-021 (STANDARD, `contractImpact=false`, `ST-GH-023`, HU02/HU14, gates coherentes, `independentReviewPassed` aún `G-NOT_RUN` como corresponde antes de este veredicto). `tasks.md` añade ST-GH-023 enlazada. `git grep` de patrones de token/clave/host sin coincidencias en los archivos del WI.

## Comandos ejecutados (salida real)
| Comando | Resultado |
|---|---|
| `node scripts/sdd-check.mjs` | `SDD check OK` |
| `node harness/validate-work-items.mjs` | `Work item validation passed (GH, 21 WI).` |
| `node harness/validate-harness.mjs` | `Harness V3 validation passed.` |
| `node harness/validate-completions.mjs` | `Completion validation passed (20 completed WI).` |
| `git diff --check` | sin salida, exit 0 |
| `pnpm lint` | `oxlint src`, exit 0 |
| `pnpm test` | `Test Files 21 passed (21)`, `Tests 265 passed (265)` |
| `pnpm build` | `nest build`, exit 0 |
| `pnpm contracts:check` | exit 0 |

## Hallazgos
- **P3-1.** La prueba de no fuga no ejercita realmente el camino `GITHUB_SIN_RESPUESTA` con un error cuyo mensaje contiene token/clave: su segunda llamada usa la clave inválida, así que el JWT falla antes de invocar `api.request` y el `mockRejectedValue(new Error('fallo ghs_… …'))` nunca se ejecuta. Los sentinelas `token` y `'fallo'` pasan por vacuidad en ese camino. La garantía sigue sustentada por el diseño (`errorName`) y por la prueba de `GITHUB_SIN_RESPUESTA` con `TypeError`, pero conviene usar la clave válida en esa llamada. No bloquea.
- **P3-2.** El miembro `INSTALACION_INVALIDA:User` del tipo `UnverifiableReason` es inalcanzable (los User se saltan antes) y ninguna prueba lo cubre; inofensivo, puede retirarse en una limpieza futura.

## Handoff
```
status: APPROVED
findings: [P3-1 prueba de no fuga no ejecuta el camino de error con mensaje sensible; P3-2 miembro de tipo inalcanzable]
blockers: []
filesAffected:
  - app/src/github/github-app-auth.service.ts
  - app/src/github/github-app-auth.service.spec.ts
  - harness/state.json
  - harness/work-items.json
  - spec/features/006-console-github-api/tasks.md
  - harness/reports/wi-gh-021-*.md
evidence: tabla de comandos de este reporte (todos en verde); harness/reports/wi-gh-021-implementation.md
recommendedNextStep: el leader registra independentReviewPassed, cierra el WI (W-DONE, ST-GH-023 [x]) y commitea en feature/jean; P3 opcionales.
```

## Ciclo 2

**Veredicto final: APPROVED.**

- **P3-1 resuelto.** La prueba de no fuga usa ahora la clave válida; `api.request` rechaza con un `Error` cuyo mensaje contiene token, clave, login e id sentinelas, y se afirma una sola llamada a `request`, resultado `UNVERIFIABLE`, un WARN con `motivo=GITHUB_SIN_RESPUESTA` y que ningún argumento de `warn` contiene los sentinelas. Mutación real temporal (añadir `error.message` al mensaje del WARN): la prueba falló (`Tests 1 failed | 15 passed`); código restaurado (sin rastro de la mutación, diff de producción igual al revisado en el ciclo 1).
- **P3-2 resuelto.** `INSTALACION_INVALIDA:User` retirado del tipo; quedan `AUSENTE | Organization | OTRO`.
- **Re-ejecución:** sdd-check `SDD check OK`; validate-work-items passed (GH, 21 WI); validate-harness passed; validate-completions passed (20); `git diff --check` limpio; `pnpm lint` ok; `pnpm test` 21 archivos / 265 tests en verde; `pnpm build` ok; `pnpm contracts:check` ok.

```
status: APPROVED
findings: []
blockers: []
filesAffected: [app/src/github/github-app-auth.service.ts, app/src/github/github-app-auth.service.spec.ts, harness/reports/wi-gh-021-independent-review.md]
evidence: mutación temporal detectada por la prueba + comandos arriba
recommendedNextStep: el leader registra independentReviewPassed, cierra WI-GH-021 y commitea en feature/jean.
```
