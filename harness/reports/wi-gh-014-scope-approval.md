# Autorización de alcance — WI-GH-014, re-sincronización de INTEROP-2.16 (GitHub Integration)

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

**Fecha:** 2026-10-14 (America/Lima)
**Origen:** sesión Cross de este repositorio; Cross informó al usuario (Jean) que el espejo local quedó en `INTEROP-2.15` mientras el canónico de Core pasó a `INTEROP-2.16` (documental y aditiva, `WI-CORE-062`) y que `AGENTS.md` exige espejo byte por byte.

## Respuesta del usuario

Jean respondió literalmente: «Veo que ya se usa en Com y en Console. No sé si será importante. Pero tú puedes tomar esas decisiones.»

## Quién decidió

La decisión concreta de aplicar la sincronización documental la tomó **Cross, por delegación expresa de Jean** en la frase citada. Jean no eligió la opción ni el alcance; delegó la decisión. Este informe no atribuye a Jean más alcance que esa delegación.

## Alcance decidido (y solo este)

`WI-GH-014` (HARNESS, documental): copiar `interoperability-contract.md` desde Core a la versión `INTEROP-2.16` (y verificar con `cmp` que `system-contract.md` y `github-integration-contract.md` siguen idénticos), actualizar las referencias documentales vigentes (`AGENTS.md`, `spec/README.md`), añadir una entrada nueva en `CHANGELOG.md` sin reescribir historia y registrar el WI y `ST-GH-016`.

## Límites

Sin cambios en `app/`, `GH-INTEROP-1.7` ni decisiones `PENDING`/`PROPOSED`; sin editar otros repositorios; sin push, PR, merge, despliegue ni infraestructura externa (el push lo hará Cross). Si el análisis exigiera cambiar `app/` o `GH-INTEROP`, el WI pasa a `W-DECISION_REQUIRED` sin implementarlo. `CS-CORE-20261014-001` tiene destino `console`, no `github-integration`: no se importa ni se acusa.
