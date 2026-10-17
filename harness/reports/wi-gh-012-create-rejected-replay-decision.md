# Decisión aplicada — WI-GH-012 `CREATE_REJECTED` replay

**Autorización del usuario:** `GITHUB_CHECK_CREATE_REJECTED`, HTTP `422`, `retryable: false`.

Solo un rechazo remoto que GitHub confirme inequívocamente sin haber creado el Check se persiste como `CREATE_REJECTED`. La reserva guarda la clase neutral, no el body/error crudo. El mismo hash reproduce exactamente ese resultado sin repetir `POST`; una request corregida con hash distinto solo puede reservar una creación después de buscar completamente y confirmar cero candidatos. Un cambio de configuración con el mismo hash exige transición operativa auditable. Todo resultado no inequívoco se conserva como `CREATE_UNKNOWN`.

Esta decisión desbloquea el comportamiento de replay local. La publicación canónica del nuevo código en el espejo byte-a-byte de `GH-INTEROP` y la evidencia PostgreSQL multi-instancia siguen separadas: no se resuelven ni se declara cerrado el WI por este registro.
