# WI-GH-012 — Importación GH-INTEROP-1.6

Se importó `CS-CORE-20261011-005` desde `WI-CORE-039`. Los espejos locales se compararon byte a byte contra Core: SYSTEM-2.7 SHA-256 `4d14f5b2204287bdff88060a51578cc97443e93b34a729059a5427cff67b3f5d`, INTEROP-2.8 SHA-256 `755c3357ca047ede9fb318a40a594cc68a63fc63f2b9f4c58af93c28f51a8d90` y GH-INTEROP-1.6 SHA-256 `dd02c32f89efc463c06165ce9ead785b8afeee782e464c4e6f7b1d4a532a167e`.

El código ya cubre la conducta canónica: reserva `CREATE_UNKNOWN` antes de POST, HTTP 422 más búsqueda paginada completa y cero candidatos para persistir `CREATE_REJECTED`, replay neutral terminal para la misma huella, adopción/actualización de un candidato único, 409 ante varios y 503 fail-closed ante reconciliación no verificable. Las pruebas unitarias e integración multiinstancia están registradas en los reportes de implementación y PostgreSQL del WI.

No se provisionó infraestructura ni se realizó despliegue/cutover. Esta evidencia habilita el acuse y resolución local del evento entrante; no cambia los límites de revisión ni declara `W-DONE`.
