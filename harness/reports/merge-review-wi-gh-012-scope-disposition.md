# Disposición de alcance — revisión de fusión WI-GH-012

Fecha: 2026-10-11

El hallazgo de procedencia sobre `CS-GH-20260926-001` no pertenece al rango candidato `origin/feature/jean..HEAD`:

- el archivo está presente con el mismo contenido en `origin/feature/jean` y `HEAD`;
- `git log` y `git diff origin/feature/jean..HEAD -- harness/contract-sync/outbox/CS-GH-20260926-001.yaml` no muestran cambios del evento;
- la autorización correctiva vigente cubre únicamente `CS-GH-20261011-002`, reparado monotónicamente por `CS-GH-20261011-003` con el SHA verificable de `e9de71d`.

Por ello el evento de 2026-09-26 se conserva intacto y se excluye de la decisión de publicación del rango actual. Esta disposición no valida ni modifica su procedencia histórica; su reparación requeriría autorización y coordinación separadas con Core y Console.
