# 006 — API de GitHub para la interfaz Console

**Estado:** aprobada para implementación como extensión de `GH-INTEROP-1.1`; no desplegada.
**HU relacionadas:** HU01, HU02, HU14, HU16. No se abre HU ni épica nueva.

## Valor

La persona autenticada puede conectar un repositorio desde Console usando capacidades GitHub de este componente, sin exponer credenciales de servicio ni trasladar a Core SDK o llamadas de GitHub. Core conserva su autoridad sobre Project/workspace, rol y binding persistido.

## Requisitos

1. La API ofrece rutas distintas de `/internal/v1/github/*` para App info, discovery, verificación de acceso y ramas.
2. Las rutas requieren JWT de sesión Supabase. Integration no valida la sesión por su cuenta: la envía a Core junto con la acción y los hechos GitHub allowlisted que verificó.
3. Core responde permitir/denegar aplicando reglas locales de identidad, Project/workspace y rol; no vuelve a consultar GitHub durante la misma decisión.
4. El binding se persiste solo en Core. Para esa escritura, Integration obtiene una evidencia Core-firmada, opaca, reciente (máximo 60 s) y ligada a usuario, acción, Project, repositorio e integration branch. El navegador no puede enviar `installationId` ni un rol como autoridad.
5. El provider token solo se usa en memoria para discovery/verificación que necesite identidad y permisos del usuario; nunca se envía a Core, guarda o registra.
6. CORS permite solo orígenes Console configurados. No se exponen rutas internas ni credenciales de servicio al navegador.
7. Las rutas Core existentes de discovery/verificación/ramas se mantienen hasta validar el consumidor directo; este feature no las retira ni hace cutover.
8. El límite JSON grande de 136 MB aplica solo a carga de blobs privados; finalización de publicación vuelve al body parser general de 100 KB.
9. El Harness admite importaciones Contract Sync idempotentes con marca local de tiempo, transiciones `acknowledge`/`resolve` con evidencia y preserva snapshots cerrados frente a eventos importados después.

## Rutas públicas

- `GET /v1/github/app`
- `GET /v1/github/repositories?projectId&cursor&limit` con `X-GitHub-Provider-Token`
- `POST /v1/github/repositories/verify-access` con `{ projectId, repositoryId, repositoryName, integrationBranch? }`
- `GET /v1/github/repositories/{owner}/{repo}/branches?projectId`

Todas requieren `Authorization: Bearer <Supabase access token>`. Cada decisión se realiza mediante `POST /internal/v1/github/authorization-decisions` Integration→Core con bearer de servicio y `X-Platform-User-Token`; sus detalles normativos están en `GH-INTEROP-1.1` y `INTEROP-2.5` §6.14. Para discovery, Core devuelve el owner ID/tipo permitido del workspace del Project; Integration filtra por ese owner los repositorios visibles vía OAuth.

La ruta de verify-access omite evidencia en la comprobación inicial de repositorio. La Console vuelve a llamarla después de elegir rama; solo entonces Integration verifica que esa rama existe y Core emite evidencia de binding.
