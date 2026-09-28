# WI-GH-009 — Verificación SDD

- Alcance: logs de fallos en discovery de repositorios en GitHub Integration.
- Aprobación: el usuario confirmó conservar la arquitectura Core/Integration y continuar con instrumentación diagnóstica.
- Límite: Core conserva autorización de Project/workspace/rol; no cambian API, decisión, DTO ni respuesta pública.
- Datos permitidos: correlationId, etapa, resultado/categoría segura y duración.
- Datos excluidos: tokens, headers, cuerpos, nombres/IDs de repositorio y texto/stack de excepciones.
- Decisiones bloqueantes aplicables: ninguna. DEC-INF-001, DEC-VAL-001 y DEC-EXP-FK-001 no bloquean este alcance.
- Contract Sync inicial: sin eventos relevantes pendientes.
- Validación previa a implementación: SDD check, work-item validation y Harness V3 pasaron.
