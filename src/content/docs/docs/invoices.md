---
title: Facturas
description: Creación asíncrona e idempotente de facturas TEST.
---
## Crear una factura
Envía los datos a `POST /api/v1/invoices` con tu token de acceso y una clave `Idempotency-Key` para evitar duplicados.

Este ejemplo muestra una venta sin plazo de pago. Los campos opcionales que no se utilizan se omiten: no necesitas rellenarlos con null. Todos los datos de contacto son ficticios. El UUID del punto de emisión es un marcador: debes sustituirlo por el que devuelve la consulta de tus puntos de emisión. Actualiza también la fecha de emisión; copiar este JSON no crea un punto de emisión ni un cliente API.

```json
{
  "pointOfIssueId": "00000000-0000-4000-8000-000000000001",
  "environment": "TEST",
  "issuedAt": "2026-10-09T15:00:00Z",
  "buyer": {
    "identificationType": "07",
    "identification": "9999999999999",
    "name": "CONSUMIDOR FINAL",
    "email": "comprador@example.invalid",
    "address": "Calle Ejemplo 123, Ciudad de Prueba"
  },
  "items": [{
    "sku": "DEMO-01", "description": "Producto ficticio",
    "quantity": 2, "unitPrice": 10.00, "discount": 2.00,
    "taxes": [{"taxCode": "2", "percentageCode": "4", "rate": 15}]
  }],
  "payments": [{
    "paymentMethod": "01",
    "total": 20.70
  }],
  "expectedTotal": 20.70
}
```
El subtotal del ejemplo es `2 × 10.00 − 2.00 = 18.00`; el impuesto ilustrativo es `18.00 × 15% = 2.70`, y el total `20.70`. `discount` es el descuento total de esa línea. Los códigos y tasas son datos ilustrativos del contrato, no una selección automática de impuestos: tu integración debe enviar los que correspondan a la operación.

## Qué significan los códigos del ejemplo

Los códigos se envían como texto para conservar el cero inicial. Tu sistema puede mostrar «Consumidor final» o «Pago en efectivo» en un selector y enviar el código correspondiente: el vendedor no tiene que memorizarlo.

| Campo | Valor | Significado |
| --- | --- | --- |
| `buyer.identificationType` | `"07"` | Venta a consumidor final. Se acompaña de identificación `9999999999999`. |
| `buyer.identificationType` | `"04"` | Comprador identificado con RUC. |
| `buyer.identificationType` | `"05"` | Comprador identificado con cédula. |
| `buyer.identificationType` | `"06"` | Comprador identificado con pasaporte. |
| `payments[].paymentMethod` | `"01"` | Sin utilización del sistema financiero, por ejemplo efectivo. No significa «pago número uno» ni indica el plazo. |

Fuente: [ficha técnica oficial SRI 2.34, tablas 6 y 24](https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/f8d9bb36-5632-4f96-b463-b9265b55338c/FICHA%20TE%CC%81CNICA%20COMPROBANTES%20ELECTRO%CC%81NICOS%20ESQUEMA%20OFFLINE%20Versio%CC%81n%202.34.pdf). Esta tabla explica los códigos mostrados, no es el catálogo completo. Selecciona los que correspondan a tu operación; consumidor final no sustituye siempre la identificación del comprador.

## Qué significa null y cuándo omitir campos

`null` significa «sin valor». Lo incluíamos para mostrar campos opcionales, pero no es necesario enviarlo en esta venta.

- `customerId`: referencia opcional a un comprador previamente registrado. No es tu `clientId` de acceso ni su RUC. Si no tienes ese registro, omite el campo; el comprador se describe en `buyer`.
- `term`: número que indica el plazo de pago.
- `unitTime`: texto que indica la unidad de ese plazo. Por ejemplo, `term: 30` y `unitTime: "dias"` significan **30 días**.

Para un pago sin plazo, basta con:

```json
{"paymentMethod": "01", "total": 20.70}
```

Si la operación tiene un plazo de 30 días, añade estos dos campos al objeto de pago, conservando la forma de pago que realmente corresponda:

```json
{"term": 30, "unitTime": "dias"}
```

El segundo fragmento no es un pago completo: también requiere `paymentMethod` y `total`. La API exige que plazo y unidad aparezcan juntos; no acepta unidad sin plazo ni plazo sin unidad. El plazo no puede ser negativo y la unidad debe tener entre 1 y 10 caracteres. El nombre exacto del campo es **`unitTime`**, no `unitTerm`.

## Dirección, correo y teléfono

Puedes incluir dirección y correo del comprador cuando los tengas. El teléfono **no es un campo del request actual**: no envíes `phone` ni `telefono`, porque no forman parte del contrato y no se conservarían como un dato de contacto admitido. Un ejemplo completo no debe inventar campos que el backend no soporta.

| Campo | ¿Obligatorio en la API? | Uso actual |
|---|---|---|
| `buyer.identificationType` | Sí | Código de tipo de identificación del comprador. |
| `buyer.identification` | Sí | Identificación correspondiente al tipo enviado. |
| `buyer.name` | Sí | Nombre o razón social del comprador. |
| `buyer.email` | No | Correo con formato válido, hasta 320 caracteres. Se recibe en la factura; no activa envío de correo ni notificaciones. |
| `buyer.address` | No | Dirección del comprador, hasta 500 caracteres. Se incorpora como `direccionComprador` al XML cuando está presente. |
| `customerId` | No | Referencia a un comprador registrado cuando corresponda. Usa `null` u omítelo si no existe; no inventes UUID. No es el cliente API de autenticación. |
| `payments[].term` | No | Plazo del pago cuando corresponda. |
| `payments[].unitTime` | No | Unidad del plazo, hasta 10 caracteres; debe ser coherente con el plazo. Si no hay plazo, omite tanto `term` como `unitTime`. |
| `expectedTotal` | No | Total esperado para contrastarlo con el cálculo del backend; se recomienda enviarlo. |

`07` y `9999999999999` representan el caso ilustrativo de consumidor final; no sustituyen los datos de un comprador identificado. El correo y la dirección ficticios de arriba sirven para mostrar la estructura: para una factura real, envía únicamente datos reales disponibles o omite esos campos opcionales. La obligatoriedad en este contrato no sustituye las reglas fiscales aplicables a cada operación.

## Datos del emisor y acceso

No incluyas el RUC del emisor, su domicilio, establecimiento, certificado o contraseña dentro de `buyer`. El emisor se obtiene del contribuyente asociado al `pointOfIssueId`; el domicilio de matriz y establecimiento se registran previamente mediante la configuración fiscal. El JWT identifica al tenant y Emitta comprueba que el punto de emisión le pertenece.

Hay tres conceptos distintos: **tenant** es la cuenta aislada de una organización; **cliente API** es la aplicación que recibe `clientId`/`clientSecret`; **buyer** es quien compra y figura en esta factura. No existe autorregistro público: el operador prepara el acceso y entrega las credenciales del cliente API.

## Enviar la solicitud desde tu integración

Guarda el JSON como `invoice.json`. Este comando usa un dominio ficticio; sustituye el dominio, token, punto de emisión y fecha sólo en una integración autorizada. No pongas secretos reales en ejemplos compartidos.

```bash
curl --request POST 'https://api.example.invalid/api/v1/invoices' \
  --header 'Authorization: Bearer EXAMPLE_JWT_NOT_A_REAL_TOKEN' \
  --header 'Content-Type: application/json' \
  --header 'Idempotency-Key: example-invoice-001' \
  --data-binary '@invoice.json'
```

El UUID del documento llega en la respuesta; úsalo para [consultar el estado](/docs/documents/). Conserva la misma clave y el mismo cuerpo cuando recuperes el resultado de una solicitud incierta; para una factura diferente, utiliza otra clave.

## Idempotencia y errores
- `202`: factura nueva persistida y encolada.
- `200`: repetición idéntica con la misma clave, devuelve el recurso existente.
- `409`: misma clave con contenido diferente o conflicto fiscal.
- `400`: solicitud inválida; no envíes campos desconocidos como `tenantId`.
- `422`: valores fiscales inválidos.

La clave es independiente por tenant. No reutilices una clave para una operación distinta.

## Qué significa el estado de tu factura
`QUEUED → GENERATING → SIGNED`: creación del XML 2.1.0, validación XSD, firma XAdES-BES y almacenamiento de artefactos en MinIO. El backend dispone de recepción y consulta de autorización SRI, sujetas a configuración y controles del operador. `SIGNED` tampoco implica autorización.

La aceptación HTTP no activa automáticamente este flujo: worker, outbox y SRI están apagados por defecto. Consulta el estado y los artefactos mediante las [operaciones de documentos](/docs/documents/). No hay webhook ni endpoint REST de transmisión al SRI.

[Ver modelos completos y respuestas](/docs/api-reference/).
