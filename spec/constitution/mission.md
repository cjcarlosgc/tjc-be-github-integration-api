# Misión

**Estado:** frontera y contrato `GH-INTEROP-1.0` aprobados; implementación y despliegue pendientes

Implementar el servicio backend que concentra toda interacción GitHub de RAG Test Studio y ofrece a Core operaciones internas autenticadas, normalizadas, trazables y seguras.

## Usuario/consumidor principal

RAG Core API es el único consumidor backend de las operaciones privadas de GitHub Integration. GitHub es el emisor de webhooks públicos.

## Principios

- GitHub Integration hace de adaptador; Core decide autorización, dominio, persistencia y efectos de negocio.
- Validar firma del webhook con bytes crudos y entregar a Core solo eventos normalizados.
- Redactar credenciales y provider tokens; nunca almacenarlos, exponer installation tokens ni devolver payloads crudos.
- Preservar resultado verificable y distinguir ausencia de permisos o fallo no verificable.
- No provocar llamadas remotas desde liveness/readiness.
- Reutilizar código GitHub ya existente en Core por traslado revisado y rastreable; no crear una segunda implementación independiente por conveniencia.
- No publicar ni desplegar infraestructura sin solicitud humana explícita.
