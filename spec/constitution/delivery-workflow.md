# Entrega y trazabilidad Git

**Estado:** adoptado para GitHub Integration junto a SDD 3.0 / Harness V3.

## Rama base

- `develop` es la base del trabajo.
- La rama acordada para desarrollo es `feature/jean`, derivada de `develop`.
- El bootstrap actual permanece sin commit en la rama local `develop`, que todavía no tiene historial. No se crea una rama de trabajo ni se publica nada en este corte.
- Un commit por corte lógico se realiza solo bajo la política vigente del repositorio; push/PR/merge o cambios de infraestructura externa necesitan solicitud explícita del usuario.

## Unidad de commit

- Un commit representa un cambio coherente, revisable y verificable; no equivale mecánicamente a una HU.
- Una HU puede requerir varios commits y un commit puede abarcar varias HU si el corte es transversal.
- Todo asunto sigue Conventional Commits y el cuerpo declara las HU afectadas:

```text
<type>(<scope>): <resultado observable>

Refs: HUxx[, HUyy...]
```

- Si el cambio no tiene HU identificable, asociarlo primero a un WI local; no inventar IDs.

## Revisión

- El usuario revisa el WI antes de declararlo terminado, salvo que solicite explícitamente delegar revisión independiente a un agente.
- Presentar diff, criterios de aceptación y evidencia reproducible; el implementer no se autoaprueba.
- La aprobación humana de alcance/arquitectura en `W-AWAITING_APPROVAL` es distinta del gate de revisión del WI.
- No hacer push/PR/merge o cambios de infraestructura externa sin solicitud explícita en cada ocasión.

## Alcance del componente

- Si una causa raíz está en Core, Console o Sandbox, no cambiar ese repositorio desde este WI; entregar diagnóstico compacto al responsable.
- Los cambios públicos Core↔Console pertenecen a sus contratos; GitHub Integration cambia su contrato interno con Core mediante decisión y Contract Sync.
- Los contratos compartidos `SYSTEM-*`, `INTEROP-*` y `GH-INTEROP-*` mantienen versionado independiente.
- La línea base común de Sandbox sigue pendiente; SDD 3.0 no implica homologación global ni despliegue.
