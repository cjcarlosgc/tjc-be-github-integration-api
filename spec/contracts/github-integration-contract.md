# GH-INTEROP-1.0 — Contrato Core ↔ GitHub Integration API

**Estado:** APROBADO por el usuario el 2026-09-25; el contrato define la frontera objetivo y no declara integración desplegada.
**Línea base:** propuesta asociada a SDD 3.0; no declara integración desplegada ni homologación con Sandbox.
**Autoridad:** RAG Core mantiene el original en este archivo. Las aclaraciones locales de publicación de WI-GH-004 (`CS-GH-20260925-003/004`) y de recepción/entrega de webhooks de WI-GH-005 (`CS-GH-20260925-005`) están pendientes de Core; este archivo completo no es actualmente un espejo byte a byte. Console no consume este contrato.

## Propósito y límites

Este es un contrato interno entre `tjc-be-rag-core-api` y `tjc-be-github-integration-api` (`component: GH`). No reemplaza `INTEROP-2.4`, que gobierna la API pública de Core usada por Console y la integración con Sandbox.

```text
Developer Console ──API pública actual──> RAG Core ──GH-INTEROP-1.0──> GitHub Integration ──> GitHub
GitHub ──webhook firmado──> GitHub Integration ──evento verificado──> RAG Core
```

- Core conserva `Project`, identidad/autorización de dominio, `AnalysisRun`, persistencia, jobs, RAG, freshness y decisiones de Checks/publicación.
- GitHub Integration conserva toda llamada GitHub App/REST, creación de JWT y installation tokens, discovery, consulta de repositorios, ramas, contenido por commit, Checks, Git Data API, companion PRs y recepción/verificación de webhooks. No decide acceso a Projects ni persiste dominio Core.
- Console sigue llamando únicamente a Core. Las rutas y DTOs públicos Core→Console permanecen compatibles.
- Supabase Auth continúa autenticando personas; GitHub Integration no es proveedor de identidad ni administra sesiones. Para discovery user-centric, Console envía el provider token a la ruta pública de Core y Core lo reenvía transitoriamente a GitHub Integration solo para listar repositorios visibles. El token no se almacena, registra ni usa para automatización GitHub App. La Admin API de Supabase y el vínculo `PlatformUser → githubUserId` siguen en Core.
- El scope OAuth actual `repo` se conserva en este corte para no alterar el descubrimiento de repositorios privados. Es un permiso amplio frente al uso de discovery y se trata como credencial sensible; reducirlo no es parte de la extracción. `IDEA-005` investigará una opción de menor privilegio y su impacto en la UX antes de proponer un cambio.
- Core materializa archivos recibidos del servicio y conserva el snapshot ZIP interno, Storage y URLs firmadas usados por Docker/Sandbox. No se reintroducen carga manual ZIP ni descarga agrupada de artefactos.

## Transporte y autenticación

- Los endpoints internos usan HTTPS y JSON bajo `/internal/v1/github`; no son accesibles desde Console/navegador ni aceptan el JWT de usuario como autenticación del servicio.
- Core→GitHub Integration usa `Authorization: Bearer <CORE_TO_GITHUB_INTEGRATION_TOKEN>`. GitHub Integration→Core usa una credencial independiente `Authorization: Bearer <GITHUB_INTEGRATION_TO_CORE_TOKEN>`.
- Se propagan `X-Correlation-ID` y un timeout acotado. Los logs redactan `Authorization`, `X-GitHub-Provider-Token`, cuerpos de webhooks, cuerpos de respuesta de GitHub y URLs firmadas. No se registran cuerpos crudos, mensajes crudos de upstream ni objetos de error que puedan contenerlos; se permite registrar operación, estado HTTP, código neutral y correlation id. Ninguna clave privada, token App o secreto webhook sale de GitHub Integration.
- No se devuelven installation tokens, App JWT ni errores crudos/payloads crudos de GitHub. Los fallos conservan códigos neutrales y `retryable` cuando aplica.
- Una consulta normalizada usa `GithubLookup<T> = { status: 'OK'; value: T } | { status: 'NOT_FOUND' } | { status: 'NOT_INSTALLED' } | { status: 'UNVERIFIABLE' }`. La diferencia entre ausencia, instalación revocada y fallo verificable se conserva exactamente; Core decide su traducción a errores públicos.

## Operaciones Core → GitHub Integration

Todas las operaciones internas requieren el bearer Core→GH. Discovery además recibe el token efímero de usuario en `X-GitHub-Provider-Token`. Los métodos/DTOs descritos son la propuesta para sustituir el acceso directo actual, no rutas públicas.

| Operación | Ruta propuesta | Resultado contractual |
| --- | --- | --- |
| Información pública de la App | `GET /internal/v1/github/app` | `{ displayName, slug, configureUrl }`; nunca credenciales. |
| Discovery | `POST /internal/v1/github/repositories/discovery` | `X-GitHub-Provider-Token` efímero; devuelve los repositorios visibles y sus permisos de presentación actuales. No decide workspace ni autorización de dominio. |
| Instalación de App por repo | `POST /internal/v1/github/repositories/installation` | `{ repositoryName }` → `{ installationId }` o `null`; GitHub confirma acceso de la App. |
| Propietario y metadatos | `POST /internal/v1/github/repositories/owner` | `{ installationId, repositoryName }` → `GithubLookup<RepositoryOwner>`. |
| Repo por id inmutable | `POST /internal/v1/github/repositories/by-id` | `{ installationId, repositoryId }` → `GithubLookup<RepositoryDetails>` con nombre/propietario vigentes. |
| Permiso efectivo de usuario | `POST /internal/v1/github/repositories/permission` | `{ installationId, repositoryName, githubUserId }` → `GithubLookup<RepositoryPermissionLevel>`; resuelve el login desde el id en GitHub, sin confiar en el login guardado por Core. |
| Instalaciones organizacionales | `POST /internal/v1/github/organizations/installations` | `GithubLookup<OrganizationInstallation[]>`, incluidas suspendidas y sin convertir una lista vacía en fallo. |
| Membresía organizacional | `POST /internal/v1/github/organizations/membership` | `{ installationId, organizationLogin, githubUserId }` → `GithubLookup<OrganizationMembership>`. |
| Owners organizacionales | `POST /internal/v1/github/organizations/owners` | `{ installationId, organizationLogin }` → `GithubLookup<OrganizationOwner[]>`; un `200` vacío se mantiene `UNVERIFIABLE`. |
| Ramas | `POST /internal/v1/github/repositories/branches` | `{ installationId, repositoryName }` → `GithubLookup<{ items: RepositoryBranch[] }>`, paginadas por el servicio. |
| Compare | `POST /internal/v1/github/repositories/compare` | `{ installationId, repositoryName, baseSha, headSha }` → `GithubLookup<{ files: CompareFile[] }>`. |
| Árbol | `POST /internal/v1/github/repositories/tree` | `{ installationId, repositoryName, commitSha }` → `GithubLookup<{ paths: string[], truncated: boolean }>`. |
| Contenido por lote | `POST /internal/v1/github/repositories/files:batch` | `{ installationId, repositoryName, commitSha, paths[] }` → `GithubLookup<{ files: [{ path, contentBase64 }] }>`, máximo 8 paths por llamada; todos los datos quedan ligados al SHA solicitado. |
| Head de PR | `POST /internal/v1/github/repositories/pull-request-head` | `{ installationId, repositoryName, pullRequestNumber }` → `GithubLookup<PullRequestHead>`, para que Core aplique freshness. |
| Check | `POST /internal/v1/github/checks` | `{ installationId, repositoryName, name, headSha, conclusion, title, summary, detailsUrl? }`; Core determina contenido, conclusión y vigencia; el servicio crea el Check y responde `204`. |
| Preflight de publicación | `POST /internal/v1/github/publications/companion-pull-request/preflight` | `{ installationId, repositoryName, pullRequestNumber, sourceHeadSha }` → `{ status: 'READY' }`, `{ status: 'STALE' }`, o `{ status: 'EXISTING_PR_CLOSED', number }`. Comprueba internamente branch/base, freshness y PR cerrado antes de iniciar escrituras; no añade branch/base a la respuesta `READY`. |
| Blob de propuesta | `POST /internal/v1/github/publications/companion-pull-request/proposal-blobs` | Una propuesta por llamada: `{ installationId, repositoryName, pullRequestNumber, sourceHeadSha, path, contentBase64 }` → `UPLOADED` con `blobSha`, `STALE`, o `EXISTING_PR_CLOSED`. El contenido admite hasta 100 MB por blob ([límite del endpoint de GitHub](https://docs.github.com/en/rest/git/blobs#create-a-blob)); solo la ruta privada autenticada acepta el cuerpo JSON/Base64 ampliado, y la operación usa un deadline extendido de hasta 180 s. No añade límite agregado de cantidad distinto al del proveedor. |
| Finalizar companion PR | `POST /internal/v1/github/publications/companion-pull-request` | `{ installationId, repositoryName, pullRequestNumber, sourceHeadSha, sourceHeadRef, analysisRunId, proposalFiles: [{ path, blobSha }] }`. Revalida freshness/cierre antes y después de cambiar refs, crea commit/branch/PR, reutiliza PR abierto, nunca reabre uno cerrado y nunca mergea. Si el PR se cierra durante el cambio de ref, restaura de mejor esfuerzo el SHA previo cuando la ref todavía apunta al commit de esta operación. |

`installationId` y `repositoryName` son valores ya autorizados/resueltos por Core, nunca entradas de Console. El servicio vuelve a validar la instalación contra GitHub antes de usarla; los permisos de dominio, de Project y el orden de errores públicos siguen siendo responsabilidad de Core.

### DTOs normativos del API interno

Estos DTOs son JSON camelCase. Todas las rutas anteriores son `POST` salvo `GET /internal/v1/github/app`; los cuerpos no admiten propiedades desconocidas. `repositoryName` es `owner/repo`; IDs GitHub y SHA son strings para evitar pérdida de precisión. Los listados reciben `page` desde 1 y `perPage` entre 1 y 100. El servicio pagina GitHub hasta completar el resultado; para los listados de instalaciones/owners, un límite interno de diez páginas alcanzado con página llena devuelve `UNVERIFIABLE`, nunca un `OK` parcial. Discovery reporta `hasNextPage` siguiendo el tamaño solicitado.

```ts
type GithubLookup<T> =
  | { status: 'OK'; value: T }
  | { status: 'NOT_FOUND' }
  | { status: 'NOT_INSTALLED' }
  | { status: 'UNVERIFIABLE' };

type RepositoryOwner = {
  repositoryId: string; ownerId: string; ownerLogin: string;
  ownerType: 'User' | 'Organization';
};
type RepositoryDetails = RepositoryOwner & { repositoryName: string };
type RepositoryPermissionLevel = 'admin' | 'maintain' | 'write' | 'triage' | 'read';
type OrganizationInstallation = {
  installationId: string; organizationId: string; organizationLogin: string;
  avatarUrl: string | null; suspended: boolean;
};
type OrganizationMembership = { role: 'admin' | 'member'; state: 'active' | 'pending' };
type OrganizationOwner = { githubUserId: string; login: string };
type RepositoryBranch = { name: string; protected: boolean };
type CompareFile = {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  previousFilename?: string;
};
type PullRequestHead = { headSha: string; state: 'open' | 'closed' };
type CompanionPullRequestRef = { number: number; url: string };
type PublicationPreflight =
  | { status: 'READY' }
  | { status: 'STALE' }
  | { status: 'EXISTING_PR_CLOSED'; number: number };
type ProposalBlobResult =
  | { status: 'UPLOADED'; path: string; blobSha: string }
  | { status: 'STALE' }
  | { status: 'EXISTING_PR_CLOSED'; number: number };
type CompanionPullRequestResult =
  | { status: 'PUBLISHED'; branchName: string; commitSha: string;
      pullRequest: CompanionPullRequestRef }
  | { status: 'STALE' }
  | { status: 'EXISTING_PR_CLOSED'; number: number };
```

Route request/response schemas:

| Route | Request JSON | Response JSON |
| --- | --- | --- |
| `GET /app` | none | `{ displayName: string, slug: string, configureUrl: string }` |
| `POST /repositories/discovery` | `{ page: integer, perPage: integer, personalOwnerId?: string, organizationOwnerId?: string }` | `{ items: [{ repositoryId: string, name: string, repositoryName: string, owner: { login: string, type: 'Organization' \| 'User', avatarUrl: string \| null }, private: boolean, defaultBranch: string, permissions: { admin: boolean, maintain: boolean, push: boolean, pull: boolean } }], hasNextPage: boolean }` |
| `POST /repositories/installation` | `{ repositoryName: string }` | `{ installationId: string \| null }` |
| `POST /repositories/owner` | `{ installationId: string, repositoryName: string }` | `GithubLookup<RepositoryOwner>` |
| `POST /repositories/by-id` | `{ installationId: string, repositoryId: string }` | `GithubLookup<RepositoryDetails>` |
| `POST /repositories/permission` | `{ installationId: string, repositoryName: string, githubUserId: string }` | `GithubLookup<RepositoryPermissionLevel>` |
| `POST /organizations/installations` | `{}` | `GithubLookup<OrganizationInstallation[]>` |
| `POST /organizations/membership` | `{ installationId: string, organizationLogin: string, githubUserId: string }` | `GithubLookup<OrganizationMembership>` |
| `POST /organizations/owners` | `{ installationId: string, organizationLogin: string }` | `GithubLookup<OrganizationOwner[]>` |
| `POST /repositories/branches` | `{ installationId: string, repositoryName: string }` | `GithubLookup<{ items: RepositoryBranch[] }>` |
| `POST /repositories/compare` | `{ installationId: string, repositoryName: string, baseSha: string, headSha: string }` | `GithubLookup<{ files: CompareFile[] }>`; all pages are combined before responding. |
| `POST /repositories/tree` | `{ installationId: string, repositoryName: string, commitSha: string }` | `GithubLookup<{ paths: string[], truncated: boolean }>`; `paths` contains blob paths only. |
| `POST /repositories/files:batch` | `{ installationId: string, repositoryName: string, commitSha: string, paths: string[] }` | `GithubLookup<{ files: [{ path: string, contentBase64: string }] }>`; max 8 paths per call, all pinned to `commitSha`, all-or-error. |
| `POST /repositories/pull-request-head` | `{ installationId: string, repositoryName: string, pullRequestNumber: integer }` | `GithubLookup<{ headSha: string, state: 'open' \| 'closed' }>` |
| `POST /checks` | `{ installationId: string, repositoryName: string, name: string, headSha: string, conclusion: 'success' \| 'failure' \| 'neutral' \| 'cancelled' \| 'action_required', title: string, summary: string, detailsUrl?: string }` | `204 No Content` |
| `POST /publications/companion-pull-request/preflight` | `{ installationId: string, repositoryName: string, pullRequestNumber: integer, sourceHeadSha: string }` | `PublicationPreflight` |
| `POST /publications/companion-pull-request/proposal-blobs` | `{ installationId: string, repositoryName: string, pullRequestNumber: integer, sourceHeadSha: string, path: string, contentBase64: string }` | `{ status: 'UPLOADED', path: string, blobSha: string } \| { status: 'STALE' } \| { status: 'EXISTING_PR_CLOSED', number: integer }`; one file per request, max 100 MB decoded UTF-8 content per GitHub's blob API; no app-defined aggregate file/count cap. |
| `POST /publications/companion-pull-request` | `{ installationId: string, repositoryName: string, pullRequestNumber: integer, sourceHeadSha: string, sourceHeadRef: string, analysisRunId: string, proposalFiles: [{ path: string, blobSha: string }] }` | `{ status: 'PUBLISHED', branchName: string, commitSha: string, pullRequest: { number: integer, url: string } } \| { status: 'STALE' } \| { status: 'EXISTING_PR_CLOSED', number: integer }` |

El cliente de Core llama `preflight` primero, luego envía una llamada `proposal-blobs` por archivo (puede limitar concurrencia localmente), y finalmente envía la lista `{path, blobSha}` para crear el commit/PR. Cada llamada de contenido se vuelve a comprobar contra el HEAD vivo y el estado del companion PR; finalización revalida ambos antes y después de cambiar una referencia. El servicio no necesita almacenar una sesión entre llamadas. No se fija un tope de producto nuevo para la cantidad de propuestas: se conserva el arreglo de IDs que acepta Core hoy; el límite práctico sigue siendo el que impongan las operaciones GitHub usadas para construir el árbol. Cada blob respeta el máximo de 100 MB del endpoint de GitHub. Los cuerpos grandes se aceptan solo después de autenticar el bearer interno y solo en las rutas privadas de publicación. Un preflight fallido o un stale/PR cerrado detectado antes de escribir no crea ni mueve ramas, referencias, commits ni PRs; blobs ya cargados pero no referenciados quedan inalcanzables. La finalización revalida y compensa de mejor esfuerzo antes de crear el PR; la API de GitHub no ofrece una transacción atómica que abarque PR fuente y ref, así que un resultado ambiguo no se reporta como éxito ni habilita rollback ciego. El namespace `rag-tests/` es de escritura exclusiva del servicio; si se observa un SHA distinto al esperado, se devuelve 503 sin rollback. Permanece una carrera TOCTOU entre la lectura SHA y el `force` restore que la API de GitHub no permite eliminar con compare-and-swap.

El discovery envía además `X-GitHub-Provider-Token`; esta credencial solo autoriza la consulta `/user/repos`, se usa en memoria durante esa petición y nunca aparece en respuesta, almacenamiento, logs o errores. Cuando se envía `personalOwnerId` se filtra `affiliation=owner`; con `organizationOwnerId`, `affiliation=organization_member`; el filtro final compara el id numérico del owner. No se aceptan ambos filtros a la vez. Cada propuesta de publicación se envía por separado como UTF-8 codificado en Base64; el servicio rechaza paths absolutos, `..`, duplicados o archivos vacíos. Core conserva el arreglo de IDs aceptado hoy y no se incorpora un límite de producto nuevo; los límites propios de GitHub siguen aplicando. El servicio vuelve a verificar freshness y que no exista un companion PR cerrado antes de crear un blob y otra vez antes/después de actualizar referencias. Un companion PR ya cerrado detectado antes del write no modifica la rama ni se reabre; si se cierra durante un write, la compensación puede actualizar la ref para restaurar el SHA previo y no deja la propuesta publicada. `EXISTING_PR_CLOSED` nunca crea ni reabre el PR. La compensación es de mejor esfuerzo y no es transaccional.

Los errores internos no exponen la respuesta ni el cuerpo de GitHub y usan esta forma: `{ code, message, retryable, correlationId }`. `message` es neutral y no incluye tokens, secretos, bodies, URLs firmadas ni texto crudo de GitHub. Los códigos y traducciones HTTP son:

| Código | HTTP | Uso |
| --- | --- | --- |
| `INVALID_REQUEST` | 400, 413 | DTO/path inválido; 413 indica body sobredimensionado. |
| `SERVICE_UNAUTHORIZED` | 401 | Bearer servicio faltante o inválido en cualquier ruta privada. Es distinto de OAuth de usuario. |
| `GITHUB_USER_TOKEN_INVALID` | 401 | Solo discovery: token OAuth GitHub de usuario rechazado/expirado. Core conserva su error público vigente. |
| `GITHUB_RESOURCE_NOT_FOUND` | 404 | Recurso requerido por una operación directa no disponible; lecturas que usan `GithubLookup` devuelven su estado en vez de este error. |
| `GITHUB_APP_CONFIGURATION_UNAVAILABLE` | 503 | Configuración local de GitHub App incompleta/incorrecta; `retryable: false`. |
| `GITHUB_UPSTREAM_UNAVAILABLE` | 503 | Timeout, red, límite de tasa o fallo upstream de GitHub; `retryable: true`. |
| `INVALID_WEBHOOK_SIGNATURE` | 401 | HMAC-SHA256 del webhook ausente o no válido; `retryable: false`. |
| `GITHUB_WEBHOOK_UNAVAILABLE` | 503 | Secreto local del webhook no configurado; `retryable: false`. |
| `CORE_WEBHOOK_UNAVAILABLE` | 503 | Core no confirmó el delivery dentro de 8 s o su respuesta no cumple el contrato; `retryable: true` para solicitar reintento a GitHub. |

En respuestas `GithubLookup`, `NOT_FOUND` significa 404 confirmado bajo el recurso/instalación consultados; `NOT_INSTALLED` significa que GitHub confirma que la App no tiene instalación/acceso vigente; `UNVERIFIABLE` incluye permiso insuficiente, instalación suspendida o respuesta ambigua, 403 no clasificable, 429, 5xx y errores de red. `GITHUB_USER_TOKEN_INVALID` nunca se usa para un fallo del bearer de servicio. Los fallos directos de Checks/publicación usan el error envelope; las lecturas devuelven `GithubLookup`, con este mapeo por operación:

| Operación | 404/recurso ausente | Instalación revocada/no disponible | Upstream/permiso no verificable |
| --- | --- | --- | --- |
| owner, by-id, permission, branches, compare, tree, files:batch, pull-request-head | `NOT_FOUND` | `NOT_INSTALLED` solo cuando la respuesta identifica explícitamente instalación revocada/sin acceso; un 404 de recurso bajo installation token es `NOT_FOUND` | `UNVERIFIABLE` |
| organizations/installations | Nunca: incluso un 404 en `/app/installations` es `UNVERIFIABLE`, no `OK []` | No aplica (se consulta con App JWT) | `UNVERIFIABLE` |
| membership, owners | `NOT_FOUND` si la identidad/recurso consultado no existe; lista vacía confirmada es `OK []` salvo owners, cuyo `200 []` es `UNVERIFIABLE` | `NOT_INSTALLED` cuando aplica installation token | `UNVERIFIABLE` |

Para `POST /repositories/installation`, la ausencia confirmada de una instalación devuelve `200 { installationId: null }`; un fallo upstream produce el error envelope. Para discovery, el bearer interno se autentica primero como `SERVICE_UNAUTHORIZED`; solo después un rechazo del provider token se traduce a `GITHUB_USER_TOKEN_INVALID`.

## Webhooks y entrega a Core

- GitHub envía `POST /integrations/github/webhooks` al host público de GitHub Integration con body crudo de hasta 25 MB y `x-github-delivery`, `x-github-event`, `x-hub-signature-256`. El servicio verifica HMAC-SHA256 antes de parsear; firma inválida responde `401 INVALID_WEBHOOK_SIGNATURE`, configuración ausente `503 GITHUB_WEBHOOK_UNAVAILABLE`, metadata requerida o payload malformados `400 INVALID_REQUEST`, y body excedido `413 INVALID_REQUEST`.
- Tras verificar, el servicio envía `POST /internal/v1/github/webhook-events` a Core con bearer GH→Core y el esquema normalizado siguiente; no reenvía headers de firma ni el body crudo. Todos los eventos llevan `schemaVersion: 1`, `deliveryId`, `eventName`, `action` (string o `null`), `receivedAt` ISO-8601 y `data`. Los IDs numéricos de GitHub se serializan como strings salvo `pullRequestNumber`, que es integer.

```ts
type NormalizedWebhookEvent = {
  schemaVersion: 1;
  deliveryId: string;
  eventName: string;
  action: string | null;
  receivedAt: string;
  data:
    | { kind: 'PULL_REQUEST'; repository: { id: string; fullName: string }; installationId: string | null;
        pullRequestNumber: number; pullRequest: { title: string; draft: boolean; merged: boolean;
          base: { ref: string; sha: string }; head: { ref: string; sha: string }; userLogin: string | null } }
    | { kind: 'INSTALLATION'; installationId: string; account: { id: string | null; type: string | null } }
    | { kind: 'INSTALLATION_REPOSITORIES'; installationId: string;
        added: Array<{ id: string; fullName: string }>; removed: Array<{ id: string; fullName: string }> }
    | { kind: 'REPOSITORY'; repository: { id: string; fullName: string;
        owner: { id: string; login: string | null; type: string | null } | null }; installationId: string | null }
    | { kind: 'MEMBER'; memberId: string | null; repositoryId: string | null }
    | { kind: 'MEMBERSHIP'; memberId: string | null; organizationId: string | null }
    | { kind: 'ORGANIZATION'; organizationId: string | null; organizationLogin: string | null; membershipUserId: string | null }
    | { kind: 'TEAM'; repositoryId: string | null; organizationId: string | null }
    | { kind: 'IGNORED' };
};
```

Para `pull_request`, el servicio solo normaliza los campos enumerados. `installation` conserva `id` y `account.id/type`; `installation_repositories` conserva installation id y los arrays `repositories_added/removed`; `repository` conserva id, `full_name`, `owner.id/login/type` e installation id si existe. `member` usa `member.id` + `repository.id`; `membership` usa `member.id` + `organization.id`; `organization` usa `organization.id/login` + `membership.user.id`; `team` usa `repository.id` y `organization.id`. Campos ausentes se convierten a `null`; el evento no se descarta solo por carecer de un id opcional, pues Core conserva la política vigente de ignorar/reconciliar lo que no pueda verificar. Para eventos no listados, `data.kind` es `IGNORED`; no se comparte ningún campo raw.

- Core valida bearer, versión, forma y `deliveryId` antes de procesar; responde con el `GitHubWebhookAcceptedResponse` actual `{ deliveryId, accepted, duplicate, analysisRunId }`. PR duplicado ya persistido responde `200` y `duplicate: true`; toda aceptación nueva/no-op responde `202`. La integración devuelve ese resultado a GitHub solo tras la confirmación de Core dentro de 8 s; timeout, respuesta inválida o fallo de Core produce `503 CORE_WEBHOOK_UNAVAILABLE` para habilitar el reintento.
- Core ejecuta la lógica actual: crea/cierra AnalysisRuns y jobs, actualiza/revoca bindings, renombra/oculta organizaciones y encola reverificación. El rol nunca se deriva del payload. Core conserva la idempotencia durable de PR por delivery id y el dedupe de jobs; handlers de acceso/repositorio/instalación conservan su semántica idempotente.
- Core devuelve `202` cuando termina el efecto correspondiente: PR guarda delivery/AnalysisRun y encola su job; eventos de acceso encolan el job deduplicado; eventos de instalación/repositorio aplican el efecto idempotente; eventos no soportados se aceptan como no-op. Solo deliveries PR ya guardados devuelven `200` como duplicados; el resto puede repetirse con `202`. La respuesta conserva `GitHubWebhookAcceptedResponse`. Solo después GitHub Integration responde al emisor con ese resultado. Si Core no confirma por fallo o timeout, GitHub Integration responde `503` para que GitHub reintente. Un duplicado puede repetir efectos idempotentes; un error parcial de lifecycle conserva la política vigente de registrar el fallo y completar con reconciliación. No se agrega una segunda base de datos de dominio ni se confirma éxito antes de la aceptación de Core.

## Operación, compatibilidad y migración

- `GET /health` expone liveness/readiness; readiness valida configuración local requerida, no depende de que GitHub esté disponible.
- El servicio mapea límites de tasa, fallos de red y errores GitHub no verificables sin convertirlos en `NOT_FOUND`. Core traduce esos resultados a la conducta pública ya establecida (`GITHUB_VERIFICATION_UNAVAILABLE`, `NOT_AUTHORIZED`, etc.).
- La migración debe conservar las respuestas y reglas de `INTEROP-2.4` para rutas Core públicas. Una futura revisión puede actualizar `SYSTEM-*` e `INTEROP-*` para reflejar la nueva topología sin cambiar rutas/DTOs de Console; esos cambios requieren Contract Sync.
- Los nuevos IDs de Contract Sync usan un namespace de origen inequívoco (`CORE`, `CONSOLE`, `SANDBOX`, `GH`) y `sourceWorkItem` antes de que el servicio importe/publique eventos. Los IDs simples anteriores al corte 2026-09-25 siguen siendo legibles; no se reescriben. Esto no modifica el Harness local de Sandbox.
- Ninguna actualización de URL/configuración de la GitHub App, secretos externos, deploy, DNS, Supabase o Sandbox está autorizada por este contrato. Esas acciones requieren solicitud explícita.
