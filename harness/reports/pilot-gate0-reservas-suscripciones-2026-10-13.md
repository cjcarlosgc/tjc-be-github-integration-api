# Gate 0 del piloto — reservas y suscripciones (borrador para decisión de Jean)

**Fecha:** 2026-10-13. **Estado:** BORRADOR; nada congelado. Fuente: paper (`paper-actual.docx`, Tabla de escenarios), `SDD.md` y código de `main` de cada repo, informe de Core `exp-rag-vs-ga-observaciones-2026-10-13.md`. Sin secretos.

## Hechos verificados
| Hecho | Evidencia |
|---|---|
| Repos públicos, App `rag-tesis-github-app` instalada en todos los repos de la organización | `gh api orgs/rag-tesis-org/installations` |
| Ambos repos tienen solo `main` con un commit baseline (`979d89b` reservas, `b3a8c45` suscripciones); sin `develop`, sin PRs, sin parches de casos | `gh api …/branches`, clones locales idénticos a `origin/main` |
| Baseline instala desde cero (`composer install`, sin `vendor`) y pasa PHPUnit 3/3 en `php:8.3-cli`, ~20–26 s | ejecución local 2026-10-13 |
| En Core no existen Project, binding, versión ni targets de estos repos | informe de Core, §5 |

## Discrepancias paper ↔ repo que Jean debe resolver
| Caso paper | Regla del paper | Target en repo (SDD) | Comportamiento actual del código | Decisión necesaria |
|---|---|---|---|---|
| RES-1 | Solapamiento: rechazar | `ReservationPeriod::durationMinutes()` (Local) | Calcula minutos; no hay regla de solapamiento aquí | ¿RES-1 pasa a ser el solapamiento sobre `canReserve()` y se elige otro target Local, o se redefine el oráculo de `durationMinutes()`? |
| RES-2 | Adyacencia: aceptar | `AvailabilityService::canReserve()` (Structural) | Delega solapamiento al repositorio (`hasConfirmedOverlap`) | El mismo target cubre RES-1 y RES-2: ¿un oráculo multi-escenario o dos casos sobre el mismo target con parches distintos? |
| RES-3 | Cancelación <24 h: S/100 → S/50 | `CancellationPolicy::refundAmount()` (Functional) | ≥48 h reembolso total, si no 0 (no hay 50 %) | Definir el parche y el input (p. ej. 23 h) y la fuente `ORACLE-RES-3` |
| SUB-1 | Activa: cobra S/60 | `PlanPriceCalculator::monthlyAmount()` (Local) | `round(licenses × unitPrice, 2)` | ¿Oráculo = 1 × 60.00 = 60.00 (cálculo) o cobro de renovación? |
| SUB-2 | Cancelada: no cobra | `RenewalService::renew()` (Structural) | No revisa estado: **cobraría** | ¿Es el oráculo de `renew()` con suscripción CANCELLED? Entonces SUB-2 deja de ser «renovación activa» |
| SUB-3 | Pending S/90: efectivo en renovación | `Subscription::handleFailedPayment()` (Functional) | Pasa a `PAST_DUE`; **`PENDING` no existe** en `SubscriptionStatus` | Mapeo no demostrado: redefinir el caso, o el target, o introducir el estado en el baseline |

Regla del protocolo: el oráculo se congela **antes** de observar tests generados; no vive en los repos ni entra en ninguno de los dos contextos. Hasta resolver lo anterior no se crean registros de trial con oráculo placeholder.

## Preparación técnica (no depende de Gate 0, salvo el contenido de los parches)
1. Crear `develop` desde `main` en cada repo (rama de integración del binding).
2. Crear una rama + PR por caso (parche independiente sobre el baseline): 6 PRs.
3. En Console: crear Project y binding para cada repo (`develop`), con `projectRoot` raíz.
4. Esperar análisis de PR y verificar que cada target tenga `TestTarget` y que `snapshotKey` quede persistido (WI-051).
5. Registrar la configuración oficial (modelo, versión, esfuerzo, presupuestos) y la semilla de aleatorización **antes** de la primera corrida.
6. Los 54 trials (9 × 2 × 3) se ejecutan con ese modelo; los experimentos de verificación previos no cuentan.

## Pendiente de WIs (Core)
Persistir test generado y salida de Sandbox, exponer VT separado, normalizar `inspect_symbol` PHP y decidir ajustes de ranking del contexto de RAG; todo antes de congelar.
