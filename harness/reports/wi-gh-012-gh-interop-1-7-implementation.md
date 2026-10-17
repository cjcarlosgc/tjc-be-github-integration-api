# Implementación y evidencia — WI-GH-012 / GH-INTEROP-1.7

Fecha: 2026-10-11

## Alcance entregado

- Se reemplazó la coordinación PostgreSQL por un mutex y estado efímero por proceso, indexado por `(repositoryId, appId, headSha, name)` con comparación exacta de `name`.
- Se eliminaron configuración, readiness/health, dependencias, migración y pruebas de integración exclusivos de PostgreSQL de coordinación.
- La publicación conserva búsqueda completa previa, adopción de candidato único y actualización, `409 GITHUB_CHECK_IDENTITY_AMBIGUOUS` sin mutación ante varios, y `422 GITHUB_CHECK_CREATE_REJECTED` solo tras HTTP 422 inequívoco y búsqueda completa sin candidatos.
- Las incertidumbres de create/PATCH se conservan y bloquean el reintento ciego mientras vive el proceso; una instancia nueva pierde ese estado como exige el contrato.

## Cobertura específica

- Serialización de solicitudes concurrentes en el mismo proceso.
- Clave sensible a mayúsculas/minúsculas.
- Replay terminal de rechazo en memoria.
- Reinicio simulado mediante una instancia nueva con memoria vacía.
- Reconciliación de candidatos, búsqueda incompleta e incertidumbre remota.

## Verificación ejecutada

- `app/pnpm test`: 17 archivos, 182 pruebas aprobadas.
- `app/pnpm lint`: aprobado.
- `app/pnpm build`: aprobado.
- `git diff --check`: aprobado.
- `node harness/validate-work-items.mjs`: aprobado.
- `node harness/validate-harness.mjs`: aprobado.
- Espejos canónicos comprobados con `cmp -s` y SHA-256: SYSTEM `a00666f612d803725857b8256a8141a6955e2123044d8a1c588aa6f3e3ec1194`, INTEROP `755c3357ca047ede9fb318a40a594cc68a63fc63f2b9f4c58af93c28f51a8d90`, GH `584839c91a088918028bbe80cbf209d8d341246bcf3536288cff1ad0b02c1b34`.

No se provisionó base, no se desplegó, no se habilitaron réplicas y no se modificó Core/Supabase.
