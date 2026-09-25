# Roadmap de GitHub Integration

Las épicas, 18 HU y 15 OC se conservan sin ampliarlas. Los sprints de la tesis son referencias de planificación; los WIs técnicos se seleccionan localmente.

| Corte | Prioridad | Alcance | Relación |
| --- | --- | --- | --- |
| WI-GH-001 | P1 | Bootstrap NestJS, health/readiness y configuración validada; no cambia el contrato ni conecta operaciones de GitHub. | HU02/HU14/HU16 como capacidades habilitadas. |
| WI-GH-002 | P1 | Extraer operaciones de instalación, lectura de metadatos/permisos y ramas requeridas para vincular repositorios. | HU02; `W-PLANNED`, depende de `WI-GH-001`, no seleccionable antes de que ese WI termine. |
| Cortes de extracción | P1 | Trasladar y adaptar GitHub App, autenticación interna, discovery, APIs de repositorio/Check/publicación y webhooks por operaciones contractuales. | HU02/HU14/HU16, más HU01/HU03/HU06 cuando apliquen. |
| Formalización de OC | P2 | Aportar happy paths y subcasos verificables de OC01–OC15 cuando se apruebe cada caso. | HU relacionadas en `operational-cases.md`. |

La secuencia exacta de extracción debe decidirse en features/WIs posteriores. Este roadmap no autoriza desplegar App, cambiar secrets/DNS, introducir persistencia, ni cambiar la API pública Core↔Console.
