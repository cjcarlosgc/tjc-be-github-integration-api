# WI-GH-008 — Alcance aprobado

El usuario autorizó homologar las fuentes/documentación vigentes de Core, GitHub Integration y Console tras confirmar que la revisión anterior dejó frases de estado caducadas. Este WI local se limita a reflejar que `WI-GH-007` está `W-DONE`, mantener explícitos los límites de deploy/cutover y sincronizar en GH las copias canónicas recibidas de Core.

No se reabre `WI-GH-007`, no se altera la semántica/versionado de contratos ni se cambia código de producto. El espejo local de `INTEROP-2.5` está detrás de `INTEROP-2.6` en Core/Console; su actualización byte por byte queda pendiente de un Contract Sync de Core dirigido a `github-integration`. `SYSTEM-2.5` ya coincide con su fuente. Los contratos espejo no se editarán antes de recibir y resolver el evento autorizado.
