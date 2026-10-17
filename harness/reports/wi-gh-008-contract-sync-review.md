# WI-GH-008 — Revisión de Contract Sync

Se importó y resolvió `CS-CORE-20260927-004` desde Core. El evento identifica `WI-CORE-015`, fuente `606006b44c23c0515c73dc21518102bb49edcb8c`, targets `github-integration` y `console`, y autoriza sincronizar byte por byte los tres contratos espejados. El archivo del evento existe en el outbox de Core y la revisión de ese commit confirma que corresponde a la fuente publicada.

El corte recibido no altera semántica ni versiones: mantiene SYSTEM-2.5 y GH-INTEROP-1.2, y actualiza el espejo local INTEROP-2.5 a INTEROP-2.6. Antes de copiar, se validó que cada archivo del checkout Core coincidiera con `git show <sourceRevision>:<path>`. Tras copiar y comparar, quedaron estos SHA-256 idénticos en Core y GH:

| Espejo | SHA-256 |
| --- | --- |
| `system-contract.md` | `e0423375f15d0e4c29feac96475292e530902f60742fbd07238a50b3f9f9e13d` |
| `interoperability-contract.md` | `1f5cc04a7fc73388a49d1c1de4f79f873d0e95edec7db6e102b5f828f6a2f852` |
| `github-integration-contract.md` | `8a80c056359af74dc8b3b704f47efb232eaafb250bd4efb1d923450435a9e9f9` |

El evento se acusó antes de copiar y resolvió después de validar las tres copias. No se editan los originales Core, no se reabre WI-GH-007 y no se declaran deploy/cutover.

## Contract Sync final CS-CORE-20260927-005

Core publicó un segundo evento bajo `WI-CORE-015`, source revision `383e23c3260d585510a3060b32c38534ef8f7d44`, dirigido a GitHub Integration y Console. Su scope contiene SYSTEM y GH-INTEROP; elimina únicamente la referencia temporal al envío de CS-CORE-20260927-004, sin cambio de semántica ni versión. GH reabrió WI-GH-008 a `W-IN_PROGRESS`, importó y acusó este evento antes de copiar los dos contratos exactos. El evento quedó `C-RESOLVED` después de comparar ambas copias con `git show` del source revision.

| Espejo actualizado por CS-CORE-20260927-005 | SHA-256 |
| --- | --- |
| `system-contract.md` | `97069ee6022bd3477d4091389e5805fc6a15e78679eb7de986ca006dc5ec0736` |
| `github-integration-contract.md` | `1092ef36979f4fac7f17d6ee73c5b73723d0aaf1999b24d6098b095af5d62c45` |

`interoperability-contract.md` no estaba en el scope de CS-CORE-20260927-005 y se mantiene idéntico al source de CS-CORE-20260927-004 (`1f5cc04a7fc73388a49d1c1de4f79f873d0e95edec7db6e102b5f828f6a2f852`); el commit 383e23c no lo modifica.

La comparación post-sync de 005 confirmó hashes SYSTEM `97069ee6022bd3477d4091389e5805fc6a15e78679eb7de986ca006dc5ec0736` y GH `1092ef36979f4fac7f17d6ee73c5b73723d0aaf1999b24d6098b095af5d62c45` en Core y GH. Se eliminó la referencia explícita al envío de CS-CORE-20260927-004, sin cambios de versión/semántica. Una revisión posterior detectó otra frase temporal en SYSTEM §Regla de compatibilidad, incluida en la revisión Core `383e23c`; WI-GH-008 sigue en `W-IN_PROGRESS` y espera el evento final que la quite. Los checkpoints se reiniciaron para documentar esa última importación.

## Contract Sync final CS-CORE-20260927-006 (resuelto)

Core publicó `CS-CORE-20260927-006` bajo WI-CORE-015, source revision `c96e9ad3c58a65914e234974f342b83415a50286`, dirigido a GitHub Integration y Console, scope `spec/contracts/system-contract.md`. El evento elimina la referencia transitoria restante al proceso de distribución documental, sin cambiar comportamiento ni versión. GH importó y acusó el evento antes de copiar SYSTEM desde la revisión indicada. Las tres copias se compararon con `git show` del commit final; el evento quedó resuelto después.

| Espejo en sourceRevision c96e9ad3 | SHA-256 |
| --- | --- |
| `system-contract.md` | `879bce741d4cf5246dd30db62759cd3100804019e608e62a9028bc2e33fa487c` |
| `interoperability-contract.md` | `1f5cc04a7fc73388a49d1c1de4f79f873d0e95edec7db6e102b5f828f6a2f852` |
| `github-integration-contract.md` | `1092ef36979f4fac7f17d6ee73c5b73723d0aaf1999b24d6098b095af5d62c45` |

La revisión contractual final aprobó este corte y confirmó la eliminación de la frase temporal detectada previamente. El checkpoint `before-review` del 2026-09-28 registró cero sincronizaciones relevantes pendientes; CS-CORE-20260927-002/004/005/006 aparecen como resueltas. WI-GH-008 queda listo para la revisión independiente del usuario, sin cierre automático.
