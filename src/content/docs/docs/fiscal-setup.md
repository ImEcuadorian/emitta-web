---
title: Configura tu emisor y certificado
description: Registra tu RUC y punto de emisión mediante la API y carga tu certificado por HTTPS.
---

Si Emitta ya te entregó un `pointOfIssueId` y preparó tu certificado, puedes ir directamente a [crear facturas](/docs/invoices/). Si prepararás tus propios datos, solicita **gestión fiscal propia** para tu aplicación. No necesitas acceso al panel del dueño ni sus credenciales.

## 1. Registra tu emisor y punto

Obtén un token con tu `clientId` y `clientSecret` siguiendo [autenticación](/docs/authentication/). Tu cuenta se identifica con ese token; no envíes un UUID de tenant.

```bash
curl --request POST 'https://api.example.invalid/api/v1/fiscal-configuration' \
  --header 'Authorization: Bearer TOKEN_DE_ACCESO' \
  --header 'Content-Type: application/json' \
  --data '{
    "taxpayer": {
      "ruc": "1790000000001",
      "legalName": "EMISOR FICTICIO DE EJEMPLO",
      "tradeName": "Negocio de ejemplo",
      "mainAddress": "Dirección ficticia de matriz"
    },
    "establishment": {"code": "001", "address": "Dirección ficticia del establecimiento"},
    "pointOfIssue": {"code": "001"}
  }'
```

Todos los datos del ejemplo son ficticios. Usa datos oficiales revisados de tu RUC. Emitta no consulta automáticamente el registro del SRI ni acredita su veracidad por guardarlos. Los códigos tienen **tres dígitos**: `001`, no `0001`.

La respuesta HTTP `200` contiene:

```json
{
  "taxpayerId": "00000000-0000-4000-8000-000000000001",
  "establishmentId": "00000000-0000-4000-8000-000000000002",
  "pointOfIssueId": "00000000-0000-4000-8000-000000000003",
  "environment": "TEST"
}
```

Conserva `pointOfIssueId` para facturar y `taxpayerId` para importar el certificado. Una repetición con los mismos datos identifica los registros existentes; no crea otro punto ni consume un secuencial. Si los datos enviados difieren o están inactivos, responde `409` y no los modifica. Una operación fallida revierte las creaciones de esa solicitud.

También puedes recuperar tu configuración con `GET /api/v1/fiscal-configuration?limit=25&offset=0`.

## 2. Importa tu certificado por HTTPS

Envía un multipart al endpoint `POST /api/v1/taxpayers/{taxpayerId}/certificates`. Necesitas estos campos:

| Campo | Contenido |
| --- | --- |
| `certificate` | Archivo `.p12` o `.pfx`, máximo 1 MiB. |
| `password` | Contraseña del certificado; nunca se devuelve. |
| `alias` | Opcional, para seleccionar una clave cuando corresponde. |
| `authorizationEvidence` | Evidencia revisada de identidad y autorización por el RUC, máximo 256 KiB. Conserva el original de forma privada. |
| `authorizationReviewed` | `true` sólo después de una revisión independiente de la autoridad del titular. La declaración por sí sola no prueba autorización jurídica. |

Haz la carga desde tu servidor por HTTPS. No pongas contraseñas en comandos, URLs, historial, logs o código fuente. Usa la entrada oculta de tu aplicación o un gestor de secretos para construir el multipart. No envíes tu certificado al chat ni al repositorio.

Emitta comprueba contraseña, integridad de clave, vigencia, cadena de confianza, revocación con CRL e identidad certificada por el RUC. Las CA y CRL las configura el operador; quien sube el certificado no puede imponer su propia confianza. No basta con que el nombre del titular coincida.

HTTP `201` devuelve sólo `id`, `fingerprint` y `validUntil`. El PKCS#12 y su contraseña se almacenan cifrados con AES-GCM. `GET /api/v1/taxpayers/{taxpayerId}/certificates` devuelve exclusivamente metadatos. Puedes registrar un certificado renovado mediante el mismo endpoint; los documentos anteriores conservan su certificado de firma.

| Respuesta | Qué revisar |
| --- | --- |
| `403` | Tu acceso no tiene gestión fiscal propia o el contribuyente pertenece a otra cuenta. |
| `422` | Contraseña, clave, vigencia, identidad, cadena o revocación no pudieron validarse. |
| `503` | Falta configuración de confianza o disponibilidad del servicio; contacta al operador. |

## 3. Integra la facturación

Utiliza el `pointOfIssueId` devuelto en [la solicitud de factura](/docs/invoices/). **Registrar los datos o importar el certificado no activa envíos al SRI.** El procesamiento automático permanece apagado en staging; guardar una factura no acredita firma ni autorización. El XML contiene la firma digital y el PDF es su representación RIDE.
