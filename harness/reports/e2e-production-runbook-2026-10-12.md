# Runbook E2E en producción — GitHub → Integration → Core → Sandbox → Check

Modelo: leader · configurado claude-sonnet-5-5 · atendido unknown · esfuerzo medium

**Fecha:** 2026-10-12. **Estado:** verificado en producción con la PR #3 de `rag-tesis-org/tjc-piloto-ventas` (Check `success`, `neutral` ante fallo de plataforma, `success` tras recuperar). Sin secretos: los valores viven en Render y en archivos `0600` de la VM.

## Qué se verificó (commits)
| Servicio | Commit | Plataforma |
|---|---|---|
| Core | `0069652` | Render, rama `develop` |
| GitHub Integration | `8012bd2` | Render, rama `develop` |
| Console | `1a295c4` | Render (sitio estático), rama `develop` |
| Sandbox | `9e2d1b0` (código) | VM `rag-test-execution-sandbox`, `feature/jean`, proxy Caddy 2.11.7 + `caddy-ratelimit` |

## Precondiciones
1. **Calentar Core e Integration** (plan Free, se duermen a los ~15 min; GitHub espera 10 s sin reintento):
   `curl -s -o /dev/null -w '%{http_code}\n' https://tjc-be-rag-core-api.onrender.com/health` y lo mismo con `tjc-be-github-integration-api`.
2. Core en Render con: `SANDBOX_URL=https://<SANDBOX_HOST>.sslip.io`, `SANDBOX_SERVICE_TOKEN` (igual al de la VM; huella sha256 corta `baa55dd8`), `LLM_SUPPORTED_COMBINATIONS`, `GITHUB_INTEGRATION_API_BASE_URL`, tokens GH↔Core iguales a los de Integration, `CORE_API_BASE_URL` de Integration apuntando al Core de Render. Tras cambiar una variable usar «Save, rebuild and deploy» (no «Save only»).
3. VM: `curl -s -o /dev/null -w '%{http_code}' -X POST https://<SANDBOX_HOST>.sslip.io/executions` debe dar `401`.
4. Project `PilotoDeVentas` ENABLED con binding a `rag-tesis-org/tjc-piloto-ventas` (rama de integración `develop`).

## Pasos
1. En una rama del piloto, cambiar código de producción (p. ej. añadir un método en `app/Domain/OrderLine.php`). Un commit vacío o ya analizado produce `NO_TEST_RELEVANT_CHANGES`.
2. Abrir PR contra `develop` (la primera vez dispara BOOTSTRAP; los siguientes commits `synchronize`).
3. Esperar el Check `RAG Core Analysis` (≈45–60 s con repo pequeño).
4. Resultado esperado: `SUCCESS` con propuestas disponibles; en Console, publicar el companion PR y seguirlo hasta `PUBLISHED`.

## Prueba de fallo de plataforma (OC08)
1. `gcloud compute firewall-rules update rag-sandbox-https-allow --disabled`
2. Push de un cambio de producción en la rama de la PR → Check `neutral`, «INFRASTRUCTURE_FAILURE… fallo de plataforma sin veredicto».
3. **Restaurar**: `gcloud compute firewall-rules update rag-sandbox-https-allow --no-disabled` y repetir con otro cambio → `success`.

## Reversión a IAP-only (3 comandos)
1. `gcloud compute firewall-rules delete rag-sandbox-https-allow`
2. En la VM: `sudo systemctl disable --now caddy`
3. Core: `SANDBOX_URL` al túnel (`gcloud compute start-iap-tunnel rag-test-execution-sandbox 3001 --local-host-port=127.0.0.1:3101 --zone us-central1-a`) con Core ejecutándose en local.

## Limitaciones conocidas
- Core e Integration en plan Free: el primer webhook tras inactividad se pierde si el servicio estaba dormido; calentar antes.
- Los repos son públicos y SYSTEM-2.12 contiene hostname, IP y nombres de reglas de firewall de la VM (sin secretos).
- Cualquier host de Internet alcanza 80/443; solo bearer de 64 hex y el rate limit (POST 60/min, GET 600/min por IP, 10/min sin bearer) frenan abuso. Un `429` en un experimento invalida la repetición.
- Las métricas de duración incluyen red y TLS sobre Internet: no comparables con corridas por túnel IAP sin declararlo.
- Rotación del `SANDBOX_SERVICE_TOKEN` cada 90 días o ante sospecha (dueño: Jean).

## Cierre de una sesión de pruebas
Cerrar la PR del piloto sin merge y borrar la rama de prueba y la rama `rag-tests/pr-*` si se publicó companion. Dejar `rag-sandbox-https-allow` habilitada.
