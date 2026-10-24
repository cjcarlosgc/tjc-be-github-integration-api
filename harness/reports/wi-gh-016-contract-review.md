Modelo: contract-reviewer · configurado sonnet · atendido unknown · esfuerzo low

# WI-GH-016 - Revision contractual

Veredicto: APPROVED

## Evidencia
- (a) Espejos vs Core (`tjc-be-rag-core-api/spec/contracts`; la ruta `system/interoperability/github-integration` no existe, se uso `spec/contracts`): `cmp` identico en interoperability-contract.md (22b880d1...e311), github-integration-contract.md (6c553ee8...565a) y system-contract.md (b70f9358...0444). `diff -r` de `schemas/` sin diferencias; hash del arbol a1ba9a199d0035de85b807fa9ae26b9afb09f8af340a22f1cb34096547dc9091 en ambos lados (coincide con lo esperado y con CS-CORE-20261021-002).
- (b) `pnpm contracts:check` sin error. Cambios en `app/`: solo `app/src/contracts/generated/contract-schemas.ts` y `contract-types.ts` (generados; +689/-6). Sin otros cambios en `app/src` ni `package.json`.
- (c) INTEROP-2.18 §4.1 y linea 112 de interoperability-contract.md: "GitHub Integration conserva su politica propia para 4xx no previstos (INVALID_REQUEST)". GH-INTEROP-1.8 (sin cambio) mantiene `INVALID_REQUEST` 400/413. Sin conflicto: los genericos de §4.1 son de Core. `github-ui-core-client.ts`: `knownCoreErrorCode`/`mapCoreError` usan allowlist cerrada (codigo + status); cualquier codigo desconocido o generico de §4.1 (UNAUTHORIZED, NOT_FOUND, HTTP_ERROR, INTERNAL_ERROR...) o con status distinto cae en `coreAuthorizationUnavailable()` (falla cerrado); `code` no string se trata como ''. Sin cambio de codigo requerido.
- (d) grep de `socket.io|websocket|ws` en `app/src` y `app/package.json`: sin coincidencias. §6.6 no aplica.
- CS-CORE-20261021-002: `status: C-RESOLVED`, evidencias referenciadas existen.

## Handoff
- status: APPROVED
- findings: P0 ninguno; P1 ninguno; P2 ninguno; P3 (informativo) la ruta `system/interoperability/github-integration` del encargo no existe en Core, la verificacion se hizo sobre `spec/contracts`.
- blockers: ninguno
- filesAffected: spec/contracts/interoperability-contract.md, spec/contracts/schemas/** (espejo); app/src/contracts/generated/contract-schemas.ts, contract-types.ts (generados); harness/contract-sync/inbox/CS-CORE-20261021-00{1,2,3}.yaml
- evidence: cmp/sha256/diff -r/hash de arbol, pnpm contracts:check, grep WebSocket, lectura de github-ui-core-client.ts (arriba)
- recommendedNextStep: el leader puede continuar con el cierre del WI (reviewer independiente/Human Reviewer segun WORKFLOW); no se ejecutaron lint/build/test (fuera del alcance contractual pedido).
