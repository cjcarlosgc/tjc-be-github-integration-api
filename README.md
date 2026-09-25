# GitHub Integration API

Servicio backend de RAG Test Studio responsable de toda la interacción directa con GitHub para RAG Core: GitHub App, discovery, repositorios, ramas, contenido por commit, Checks, Git Data API, companion PRs y webhooks.

## Línea base

- SDD 3.0 / Harness V3; este repositorio implementa el cuarto componente (`GH`).
- `develop` es la rama base. La rama de trabajo acordada es `feature/jean`, derivada de `develop`; el usuario ya autorizó iniciar ese trabajo.
- El bootstrap documental sirve como baseline local. No se publica nada al remoto sin autorización expresa para ese push.
- Sandbox permanece fuera de este corte y su homologación SDD sigue pendiente. No se declara una línea base común desplegada.
- Core mantiene la versión canónica de `GH-INTEROP-1.0`; su revisión independiente está aprobada y esta copia está sincronizada byte a byte. Eso no declara integración implementada ni desplegada.

## Desarrollo

```sh
node scripts/sdd-check.mjs
node harness/validate-work-items.mjs
node harness/validate-harness.mjs
```

El primer WI (`WI-GH-001`) establece el paquete NestJS mínimo con health/config local, sin operaciones de GitHub. Después, los WIs `WI-GH-002`–`WI-GH-005` cubren por separado discovery/repositorios, lecturas de PR, Checks/publicación y webhooks. Los secretos se suministran por entorno; no se guardan en Git.

Consulta `AGENTS.md`, `spec/README.md` y `harness/WORKFLOW.md` antes de trabajar.
