# Contexto operativo del proyecto

**Estado:** topología y contrato `GH-INTEROP-1.1` aprobados; WI-GH-006 en implementación fuente, revisión personal y cutover pendientes
**Alcance:** especificación, implementación y revisión del cuarto componente de RAG Test Studio.

## Identidad

`tjc-be-github-integration-api` es el adaptador backend autorizado para toda interacción directa con GitHub. Extrae y reutiliza SDK/código GitHub de Core por cortes contractuales. El código productivo vive exclusivamente en `app/`.

## Topología

```text
Developer Console ──API pública de dominio──> RAG Core API ──GH-INTEROP-1.1──> GitHub Integration ──> GitHub
       └──rutas UI autenticadas──────────────────────────────────> GitHub Integration
GitHub ──webhook firmado──> GitHub Integration ──evento verificado──> RAG Core API
GitHub Integration ──sesión + hechos allowlisted──> autorización síncrona Core
```

- Core mantiene identidad de dominio, autorización de Projects, persistencia, jobs, RAG y decisiones del pipeline.
- Console llama a GitHub Integration solo para App info, discovery, verificación GitHub y ramas; consume Core para dominio, persistencia, RAG y análisis.
- GitHub Integration mantiene App JWTs, installation tokens, API/SDK de GitHub, webhooks y publicación.
- Supabase Auth mantiene la identidad de personas. El provider token de discovery es efímero, no se persiste ni registra.
- Core conserva snapshot ZIP interno, Storage y URLs firmadas que consume Docker/Sandbox. No se reintroducen carga manual de ZIP ni descarga agrupada de artefactos.
- Sandbox permanece neutral respecto de GitHub, usuarios y dominio.

## Invariantes

- Las operaciones internas son HTTPS/JSON bajo `/internal/v1/github` con bearer de servicio; no aceptar JWT de usuario como autenticación interservicio.
- La entrada de webhook se verifica con HMAC sobre body crudo antes de parsear o enviar un evento normalizado a Core.
- Ninguna credencial GitHub App, webhook o bearer interno se expone a Core, Console o al contenedor Sandbox.
- Distinguir `NOT_FOUND`, `NOT_INSTALLED` y `UNVERIFIABLE`; errores de red/límites no se convierten en ausencia.
- No aplicar lógica de autorización de Project ni reglas de negocio del pipeline.
- No hacer health/readiness dependiente de una llamada remota a GitHub.
- No persistir datos de dominio Core ni guardar el provider token OAuth.

## Autoridad

- Contratos compartidos: `spec/contracts/system-contract.md` y `spec/contracts/interoperability-contract.md`.
- Límite privado con Core: espejo de `spec/contracts/github-integration-contract.md`; Core es dueño canónico.
- Planificación global: `spec/backlog.md`, `spec/operational-cases.md`, `spec/constitution/planning-model.md` y `harness/work-items.json`.
- Historia de este repositorio: `CHANGELOG.md` y Git.
