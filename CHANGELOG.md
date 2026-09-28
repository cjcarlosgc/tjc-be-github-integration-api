# Changelog

Los cambios relevantes de comportamiento, contratos y línea base se registran aquí. El detalle de cambios previos permanece en Git.

## Unreleased

- **Fecha original del PR (2026-09-27):** `WI-GH-007` normaliza `created_at` de GitHub como `createdAt` UTC o `null` en el webhook y exige una fecha verificable para devolver `OK` en `pull-request-head`. Lint, 136 pruebas y build pasan; el WI espera revisión humana antes del cierre. No hay deploy, cutover ni push.
- **Cierre local de la migración GitHub (2026-09-26):** `WI-GH-006` quedó revisado y `W-DONE`; Core y Console también cerraron sus WIs consumidores. La fecha original de PR quedó planificada en `WI-GH-007`.
- **Evidencia del perímetro HTTP de usuario (2026-09-26):** se añadieron pruebas de sesión obligatoria, validación estricta de DTOs, `no-store`, separación de bearer servicio/JWT y fail-closed ante timeout, redirect, respuesta malformada o denegación. El cliente GH→Core rechaza campos ajenos al contrato. INTEROP-2.5 aclara que Core autoriza el owner scope y este componente filtra los resultados GitHub. `WI-GH-006` sigue abierto para revisión y visto bueno personal.
- **CORS de Console en producción:** se rechazan orígenes HTTP de loopback cuando `NODE_ENV=production`; HTTPS sigue permitido y HTTP loopback queda para entornos no productivos. `WI-GH-006` permanece abierto para revisión y visto bueno personal.
- **Ciclo Contract Sync del Harness (2026-09-26):** importaciones idempotentes llevan timestamp local, acknowledge/resolve preservan evidencia y validación de completions respeta el cierre histórico. El Contract Sync emitido para Core/Console sigue pendiente en los consumidores; el WI GH continúa abierto.
- **API autenticada para Console (2026-09-26):** `GH-INTEROP-1.1` amplía el servicio con App info, discovery, verificación GitHub y ramas bajo rutas de usuario autenticadas; cada autorización consulta Core sincrónicamente y el binding durable se escribe en Core con evidencia firmada. Contratos compartidos alineados; WI-GH-006 sigue abierto y la revisión humana/cutover no se han realizado. Sin Sandbox, deploy ni cambio de secretos externos.
- **Actualización de integración:** el consumidor/receptor Core de `GH-INTEROP-1.0` existe en código fuente y el flujo GH→Core está conectado en ambos repositorios. Los checkpoints pasaron; `WI-CORE-003` continúa abierto para visto bueno humano. No se ha desplegado ni hecho cutover. Las notas de diseño posteriores describían el estado anterior a la migración.

- Inicializado el SDD 3.0 y Harness V3 local para el componente GitHub Integration; no se ha desplegado.
- `WI-GH-001` implementa health/config local en `feature/jean`; lint, 9 tests, build, HTTP 200/503, Contract Sync y contract-reviewer pasan. El usuario revisó y aprobó el corte; quedó `W-DONE`, sin modificar consumidores ni infraestructura externa.
- La validación posterior al cierre detectó que el test de dependencia GH-002 no simulaba el estado pre-cierre de GH-001; se corrigió únicamente el fixture para reproducir WI-GH-001 pendiente y copiar las specs requeridas. `validate-harness` y el pipeline local volvieron a pasar; sin cambios de producto.
- Dividida la extracción funcional en `WI-GH-002` (discovery/acceso), `WI-GH-003` (lecturas PR), `WI-GH-004` (Checks/publicación) y `WI-GH-005` (webhooks), con subtareas locales, dependencias y Contract Sync.
- Aclarado en `WI-GH-002` que sí extrae discovery OAuth existente sin cambiar login, flujo, scope, DTO ni respuestas exitosas; GH clasifica `401` como token inválido y `403`/`429` ambiguos como upstream reintentable. El `403 → 503` es una decisión interna no literal en GH-INTEROP-1.0 y Contract Sync solicitará ratificación a Core; el Core público no cambia porque el consumidor no se migra en este WI. Antes de cutover se acordará la traducción pública.
- La readiness de GH-002 ahora exige configuración local válida de GitHub App además del bearer Core→GH; sigue sin consultar GitHub y no devuelve ni registra claves.
- La implementación de GH-002 limita el listado de ramas a 10 páginas y 30 segundos; un listado que no pueda completarse devuelve `UNVERIFIABLE`, nunca un resultado parcial.
- `WI-GH-002` quedó `W-DONE` con aprobación humana: extracción acotada completada, Contract Sync `CS-GH-20260925-001` publicado y pendiente de Core. Sin cutover, despliegue ni push.
- El espejo local `GH-INTEROP-1.0` se sincroniza byte a byte con Core tras revisión independiente aprobada. Se especifican OAuth/provider-token transitorio, errores neutrales y publicación por archivo sin añadir límite de producto.
