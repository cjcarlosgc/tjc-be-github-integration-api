# Roadmap de GitHub Integration

Las épicas, 18 HU y 15 OC se conservan sin ampliarlas. Los sprints de la tesis son referencias de planificación; los WIs técnicos se seleccionan localmente.

| Corte | Prioridad | Alcance | Relación |
| --- | --- | --- | --- |
| WI-GH-001 | P1 | Bootstrap NestJS, health/readiness y configuración validada; no cambia el contrato ni conecta operaciones de GitHub. | HU02/HU14/HU16 como capacidades habilitadas. |
| WI-GH-002 | P1 | Extraer operaciones de instalación, lectura de metadatos/permisos y ramas requeridas para vincular repositorios. | HU02; `W-DONE`, depende de `WI-GH-001`, que ya terminó. |
| WI-GH-003–005 | P1 | Extraer lecturas de PR, Checks/publicación y webhooks normalizados para el pipeline Core. | HU02/HU14/HU16, más HU03/HU06 cuando apliquen; WIs cerrados conservan su evidencia. |
| WI-GH-006 | P1 | Añadir API de usuario autenticada para Console y autorización síncrona Integration→Core. | HU01/HU02/HU14/HU16; `W-DONE` local, no desplegado ni cortado. |
| WI-GH-007 | P1 | Entregar la fecha original del PR para clasificar elegibilidad antes/después del binding. | HU02/HU14; `W-PLANNED`, depende de WI-GH-006 y publica Contract Sync a Core. |
| Formalización de OC | P2 | Aportar happy paths y subcasos verificables de OC01–OC15 cuando se apruebe cada caso. | HU relacionadas en `operational-cases.md`. |

Este roadmap no autoriza desplegar App, cambiar secrets/DNS, introducir persistencia, retirar rutas Core de compatibilidad ni cambiar Sandbox.
