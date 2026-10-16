---
title: Tu primera integración
description: Configura tu negocio y conecta el recorrido de facturación desde tu servidor.
---
## Antes de empezar

Solicita al responsable de Emitta tu identificador y secreto, junto con el ambiente habilitado:

| Dato | Para qué sirve |
| --- | --- |
| URL de la API | Dirección a la que enviará solicitudes tu servidor. |
| `clientId` | Identificador de tu aplicación. |
| `clientSecret` | Contraseña de tu aplicación. Consérvala en un gestor de secretos. |

**Tu cliente API es tu aplicación; el comprador de una factura es otra cosa.** No necesitas enviar un tenant ni crear una cuenta por cada comprador.

Los siguientes comandos usan un dominio y credenciales ficticios. Sustituye la URL por la del entorno concedido. Ejecuta la integración desde tu servidor, nunca exponiendo el secreto en una página web.

El acceso completo permite que tu aplicación configure el negocio y su certificado. El alta de la cuenta la realiza Emitta; el cliente no crea tenants. Sigue los pasos en orden.

## 1. Obtén un token de acceso

```bash
curl --request POST 'https://api.example.invalid/api/v1/auth/token' \
  --header 'Content-Type: application/json' \
  --data '{"clientId":"demo-client","clientSecret":"EXAMPLE_ONLY_NOT_A_SECRET"}'
```

Copia el valor de `accessToken` recibido. En los siguientes comandos sustituye `TOKEN_DE_ACCESO` por ese valor. El token vence; utiliza `expiresIn` para saber cuándo obtener uno nuevo.

## 2. Configura el negocio — una vez

Con el token, envía RUC, razón social, domicilio, establecimiento y punto a `POST /api/v1/fiscal-configuration`. Usa el [JSON completo de configuración](/docs/fiscal-setup/#1-registra-tu-emisor-y-punto).

Guarda `taxpayerId` para gestionar el certificado y `pointOfIssueId` para facturar. Después, `GET /api/v1/fiscal-configuration` permite elegir el punto por sus códigos: por ejemplo, local `001`, caja `002`. Tu sistema muestra esos códigos al usuario y conserva el UUID internamente.

## 3. Carga el certificado — al iniciar o sustituirlo

Desde tu servidor, envía el archivo PKCS#12, su contraseña y la evidencia requerida a `POST /api/v1/taxpayers/{taxpayerId}/certificates`. Sigue los [campos y validaciones de la importación](/docs/fiscal-setup/#2-importa-tu-certificado-por-https). La API devuelve metadatos, nunca la contraseña. El dueño de Emitta no necesita subirlo por ti.

## 4. Envía una factura — por cada venta

Copia el [JSON completo de factura](/docs/invoices/) en un archivo `invoice.json`. Sustituye `pointOfIssueId` por el identificador obtenido al configurar o consultar tus puntos y actualiza la fecha y los datos de la operación.

```bash
curl --request POST 'https://api.example.invalid/api/v1/invoices' \
  --header 'Authorization: Bearer TOKEN_DE_ACCESO' \
  --header 'Content-Type: application/json' \
  --header 'Idempotency-Key: pedido-ejemplo-001' \
  --data-binary '@invoice.json'
```

Una respuesta `202` confirma que la solicitud se guardó. Conserva el campo `id` devuelto: ese es el `documentId`. No es el `pointOfIssueId`. Vincúlalo con la venta de tu sistema.

**Evita duplicados:** usa una clave `Idempotency-Key` distinta para cada factura. Si pierdes la respuesta, repite con la misma clave y exactamente los mismos datos; no crees una clave nueva para recuperar la misma operación.

## 5. Consulta su estado y descarga el resultado

Sustituye `ID_DEL_DOCUMENTO` por el identificador que recibiste:

```bash
curl 'https://api.example.invalid/api/v1/documents/ID_DEL_DOCUMENTO' \
  --header 'Authorization: Bearer TOKEN_DE_ACCESO'
```

En staging, el procesamiento automático permanece apagado: el documento puede quedarse en `QUEUED`. `SIGNED` significa firmado y `AUTHORIZED` significa autorizado por el SRI; son resultados diferentes.

Cuando esté `AUTHORIZED`, descarga los archivos disponibles usando el mismo token:

```http
GET /api/v1/documents/ID_DEL_DOCUMENTO/artifacts/authorized-xml
GET /api/v1/documents/ID_DEL_DOCUMENTO/artifacts/ride-pdf
Authorization: Bearer TOKEN_DE_ACCESO
```

Guarda las respuestas como archivos en tu aplicación. No son enlaces públicos para abrir sin autenticación. El PDF puede estar pendiente aunque el XML ya esté autorizado; consulta [documentos y descargas](/docs/documents/). No reenvíes la factura para obtener el PDF.

## Qué debe recordar tu aplicación

| Valor | De dónde sale | Cuándo reutilizarlo |
| --- | --- | --- |
| `accessToken` | Autenticación | Hasta que venza. |
| `taxpayerId` | Configuración fiscal | Para el certificado de ese emisor. |
| `pointOfIssueId` | Configuración o listado de puntos | En las ventas de esa caja. |
| `Idempotency-Key` | La genera tu aplicación | Misma clave y cuerpo al recuperar la misma operación. |
| `documentId` | Campo `id` al crear la factura | Estado, XML y PDF de esa factura. |

## Si algo falla

| Respuesta | Qué hacer |
| --- | --- |
| `401` | Obtén un token válido y revisa tus credenciales. |
| `403` | Pide al responsable que revise el acceso de tu aplicación. |
| `400` / `422` | Revisa los campos y el mensaje de validación. |
| `409` al crear | Comprueba que no hayas cambiado los datos de una clave ya utilizada. |
| `429` | Espera los segundos indicados en `Retry-After`. |
| `503` | El servicio no está disponible temporalmente; conserva la clave de la operación. |

[Ver todos los campos de una factura →](/docs/invoices/)
