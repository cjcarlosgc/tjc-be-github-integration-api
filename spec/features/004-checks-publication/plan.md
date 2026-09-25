# Plan — Checks y publicación

## Corte

1. Reutilizar el cliente App/instalación y la lectura de HEAD acordados por los cortes previos.
2. Trasladar Checks y la publicación Git Data con preflight, subida individual de blobs y finalización.
3. Probar contra stubs que los casos `STALE` o PR cerrado no mueven refs ni crean commits/PRs; revisar el estado final antes de cualquier escritura visible.
4. Publicar Contract Sync namespaced ligado a `WI-GH-004`.

## Dependencias y restricciones

`WI-GH-003` debe estar `W-DONE`. Core conserva los límites actuales de producto y envía un archivo por llamada interna. No modificar rutas públicas Core→Console, proveedor OAuth, Sandbox ni infraestructura externa.
