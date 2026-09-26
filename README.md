# GitHub Integration API

Servicio backend de RAG Test Studio responsable de toda la interacción directa con GitHub: GitHub App, discovery, repositorios, ramas, contenido por commit, Checks, Git Data API, companion PRs y webhooks. Console lo consume directamente solo para App info, discovery, verificación GitHub y ramas; Core conserva dominio y pipeline.

## Línea base

- SDD 3.0 / Harness V3; este repositorio implementa el cuarto componente (`GH`).
- `develop` es la rama base. La rama de trabajo acordada es `feature/jean`, derivada de `develop`; el usuario ya autorizó iniciar ese trabajo.
- El bootstrap documental sirve como baseline local. No se publica nada al remoto sin autorización expresa para ese push.
- Sandbox permanece fuera de este corte y su homologación SDD sigue pendiente. No se declara una línea base común desplegada.
- Core mantiene la versión canónica de `GH-INTEROP-1.1`; Console y GitHub Integration conservan copias espejo. WI-GH-006 añade rutas autenticadas de usuario y autorización síncrona con Core. La revisión personal de los WIs, configuración externa y cutover siguen pendientes; no se declara integración desplegada.

## Desarrollo

```sh
node scripts/sdd-check.mjs
node harness/validate-work-items.mjs
node harness/validate-harness.mjs
cd app
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
```

`WI-GH-001` establece el paquete NestJS mínimo con health/config local, sin operaciones de GitHub. Después, los WIs `WI-GH-002`–`WI-GH-005` cubren por separado discovery/repositorios, lecturas de PR, Checks/publicación y webhooks. Los secretos se suministran por entorno; no se guardan en Git.

Para usar el API completo configura `CORE_TO_GITHUB_INTEGRATION_TOKEN`, `GITHUB_APP_ID` y `GITHUB_APP_PRIVATE_KEY_BASE64` (PEM RSA de la App codificada en Base64), además de `GITHUB_WEBHOOK_SECRET`, `CORE_API_BASE_URL` y el bearer independiente `GITHUB_INTEGRATION_TO_CORE_TOKEN` para webhooks salientes. Core URL debe ser HTTPS (HTTP solo para loopback local). `PORT` tiene default. Si falta configuración, el proceso conserva liveness pero `/health` queda `503`; la readiness no realiza llamadas de red. `app/.env.example` solo contiene nombres vacíos, nunca credenciales reales.

Consulta `AGENTS.md`, `spec/README.md` y `harness/WORKFLOW.md` antes de trabajar.
