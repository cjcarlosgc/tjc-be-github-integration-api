# WI-GH-007 — Alcance aprobado

El usuario aprobó en esta sesión la extensión contractual canónica de `createdAt` de PR y pidió continuar con el corte de GitHub Integration. WI-GH-007 implementa únicamente ese contrato en la normalización del webhook y la lectura histórica `pull-request-head`.

El corte acepta exclusivamente timestamps ISO con fecha de calendario válida, hora y zona explícitas e inequívocas. Devuelve ISO-8601 UTC; conserva `receivedAt` como hora de recepción; no rechaza el webhook por una fecha aislada ausente o inválida; y responde `UNVERIFIABLE` sin `value` para la lectura histórica cuando la fecha no puede verificarse. La revisión independiente del diff de implementación sigue pendiente del usuario antes del cierre.
