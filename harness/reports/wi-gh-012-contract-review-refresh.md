# [contract-reviewer::GPT-6 Luna / high] · WI-GH-012 · Revisión B

Modelo: contract-reviewer · configurado `gpt-6-luna` · atendido `unknown` · esfuerzo `high`

```yaml
executedBy:
  agent: contract-reviewer
  configuredModel: gpt-6-luna
  servedModel: unknown
  effort: high
```

**Veredicto:** `APPROVED` para implementación local del alcance aprobado por `DEC-CHECK-002` y `GH-INTEROP-1.5`.

## Hallazgos y blockers

No encontré blockers ni contradicciones contractuales entre `GH-INTEROP-1.5`, `DEC-CHECK-002`, la feature 004 y los criterios/enlaces actuales de `WI-GH-012`.

La decisión cubre el vacío de coordinación entre réplicas: fija PostgreSQL administrado, dedicado y de ownership exclusivo de GitHub Integration; unicidad exacta por `(repositoryId, appId, headSha, name)`; y claims/leases compartidos con fencing para crear y actualizar. Separa explícitamente esta persistencia técnica del dominio Core/Supabase.

El contrato también acota de forma segura la imposibilidad de una transacción atómica con GitHub: persiste `CREATE_UNKNOWN`/`UPDATE_UNKNOWN` antes de las mutaciones remotas, pagina y valida candidatos completos, adopta solo un candidato, rechaza varios con `409 GITHUB_CHECK_IDENTITY_AMBIGUOUS`, y no reintenta POST/PATCH a ciegas ante resultados inciertos. Los retries consultan la reserva; actualizaciones inciertas se verifican por `checkId`; las dependencias, esquema, claim o reconciliación no verificables fallan cerrados con `503 GITHUB_CHECK_COORDINATION_UNAVAILABLE` sin escribir en GitHub. La promesa es reserva durable y como máximo un intento automático mientras la creación siga incierta, no exactly-once remoto.

La cobertura de WI-GH-012 es consistente con el contrato: identidad y respuesta `200 { checkId }`; concurrencia de al menos dos instancias; migración aditiva; fallos antes/después de llamadas remotas; tombstones y retención; backup/PITR, alertas y runbook; y drenado de instancias antiguas antes de habilitar multi-réplica. `tech-stack.md` contiene solo la excepción de PostgreSQL técnico aprobada y prohíbe ampliar persistencia de dominio.

## Espejos contractuales

Comparé byte por byte los tres archivos locales contra Core en `/Users/jean/Tesis/workspaces/tjc-be-rag-core-api/spec/contracts/`; `cmp` devolvió igualdad para los tres. SHA-256:

| Contrato | Versión | SHA-256 |
| --- | --- | --- |
| `system-contract.md` | SYSTEM-2.7 | `50d9dcc03f2af0337c3b11824df8a2c9fdee4c189e8df84bccea3e85cc827f76` |
| `interoperability-contract.md` | INTEROP-2.8 | `755c3357ca047ede9fb318a40a594cc68a63fc63f2b9f4c58af93c28f51a8d90` |
| `github-integration-contract.md` | GH-INTEROP-1.5 | `fbbda9603c0ac4f881287a713603246e69c7518875b3d8a2e0631842cedf37bc` |

`CS-CORE-20261011-004` está importado con `consumerImportedAt` y en `C-ACKNOWLEDGED`, con este reporte como revisión independiente. Su resolución sigue condicionada a evidencia de implementación, no a este veredicto.

## Límite de autorización y seguimiento

`DEC-CHECK-002`, este veredicto y el Contract Sync **no autorizan** elegir/provisionar el proveedor de PostgreSQL, crear o modificar infraestructura externa, desplegar, habilitar multi-réplica, drenar instancias en un entorno, ni realizar cutover. Esos pasos conservan gates y autorizaciones operativas separados. El WI sí puede implementar y probar localmente la migración/código/runbook conforme al contrato.

Como seguimiento del Harness, al iniciar/continuar el corte el leader debe reflejar en `harness/state.json` el acuse y esta revisión, y reconciliar `W-DECISION_REQUIRED` con el estado de la decisión ya aprobada (`DEC-CHECK-002` aparece como no bloqueante en `decisionGate`). El estado y los gates de implementación no se aprueban por este informe.

recommendedNextStep: actualizar el estado local del WI conforme al Harness y continuar los gates de implementación de WI-GH-012; conservar separados los gates de proveedor, provisión, despliegue y cutover.
