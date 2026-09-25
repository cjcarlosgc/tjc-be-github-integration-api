# CONTRACT_SYNC — GitHub Integration

Los eventos Contract Sync notifican necesidades/cambios entre `core`, `console`, `sandbox` y `github-integration`. Cada evento se origina en el WI del componente emisor y va a la bandeja del consumidor; no edita otros repositorios ni aprueba cambios.

```yaml
type: CONTRACT_SYNC
id: CS-GH-20260925-001
source: github-integration
sourceWorkItem: WI-GH-001
targets: [core]
scopePaths: [spec/contracts/github-integration-contract.md]
breaking: false
changed:
  - Example of a shared contract change.
requiredAction:
  - Review compatibility and create a local WI if implementation is required.
sourceRevision: 0123abc
status: C-PENDING
```

Desde el corte `2026-09-25`, todo evento nuevo usa un ID namespaced que debe coincidir con `source` (`CS-CORE-YYYYMMDD-NNN`, `CS-CONSOLE-...`, `CS-SANDBOX-...` o `CS-GH-...`) e incluye un `sourceWorkItem` registrado del componente emisor. `import` y `check` validan ambas correspondencias; `publish` exige el namespace local y siempre escribe `sourceWorkItem`. Los IDs simples `CS-YYYYMMDD-NNN` se aceptan únicamente como históricos anteriores al corte; no se deben crear ni renombrar eventos para adaptarlos. Estados: `C-PENDING → C-ACKNOWLEDGED → C-RESOLVED`; `C-REJECTED` explica incompatibilidad o rechazo. Los YAML históricos sin prefijo de estado se leen por compatibilidad.

```sh
node harness/contract-sync.mjs check --checkpoint start --work-item WI-GH-001 --record
node harness/contract-sync.mjs check --checkpoint implementation-delivery --work-item WI-GH-001 --record
node harness/contract-sync.mjs check --checkpoint before-review --work-item WI-GH-001 --record
node harness/contract-sync.mjs check --checkpoint before-done --work-item WI-GH-001 --record
node harness/contract-sync.mjs import --from /ruta/al/harness/contract-sync/outbox
# Plantilla: requiere un WI registrado con contractImpact=true y publishesContract=true.
node harness/contract-sync.mjs publish --id CS-GH-YYYYMMDD-NNN --work-item WI-GH-NNN --targets core --scope-paths spec/contracts/github-integration-contract.md --breaking false --changed 'approved contract change' --required-action 'review compatibility' --source-revision abc1234
```

`check` exige un WI activo registrado; `--record` guarda checkpoints una vez y en orden si no hay pendientes relevantes. `scopePaths` admite `*` o rutas compartidas `spec/contracts/...`. Los eventos históricos sin ese campo se consideran globales. Todo evento relevante no `C-RESOLVED` impide el gate de interoperabilidad salvo una clasificación `NOT_RELEVANT` por WI con motivo, hash estable y reporte existente; esa clasificación no cambia estado ni acciones del evento. Una notificación no autoriza implementar un endpoint nuevo sin contrato aprobado.

`publish` exige un WI local registrado con `contractImpact` y `publishesContract` habilitados; el ID debe usar el namespace del emisor y el evento registra ese WI en `sourceWorkItem`. Publicar Contract Sync no actualiza el espejo local ni a Core automáticamente: requiere import/revisión del consumidor y sus WIs propios.
