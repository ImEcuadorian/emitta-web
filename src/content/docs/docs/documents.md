---
title: Documentos y descargas
description: Consulta estados y descarga XML autorizado y RIDE con permisos por tenant.
---
Estas operaciones están publicadas en staging y requieren tu token de acceso. Sólo devuelven recursos existentes del tenant. El staging nuevo no contiene comprobantes ni artefactos del piloto; firma, RIDE y transmisión SRI permanecen apagados.

## Consultar estado
`GET /api/v1/documents/{documentId}` requiere el acceso de consulta de tu aplicación. Devuelve UUID, estado, clave de acceso, secuencial, ambiente, fecha de emisión y fecha de autorización cuando existe. Un documento ausente o ajeno responde `404` sin exponer su existencia.

## Descargar artefactos
`GET /api/v1/documents/{documentId}/artifacts/authorized-xml`

`GET /api/v1/documents/{documentId}/artifacts/ride-pdf`

Sólo puedes descargar archivos de tu organización, cuando el documento esté `AUTHORIZED` y el archivo exista. Se verifica el SHA-256 almacenado antes de entregar el contenido. Las respuestas usan `Cache-Control: no-store`, `Content-Disposition: attachment` y `ETag` con el digest. No contienen claves de almacenamiento ni enlaces públicos.

El RIDE se genera desde el XML autorizado persistido y conserva sus importes. Para TEST incorpora la leyenda correspondiente. La descarga no genera documentos ni realiza llamadas al SRI.

| Respuesta | Significado |
| --- | --- |
| `401` | JWT ausente o inválido |
| `403` | Tu aplicación no tiene acceso a esta operación |
| `404` | Documento o artefacto no disponible para este tenant |
| `409` | Documento todavía no autorizado |
| `503` | Lectura de almacenamiento desactivada |

No hay listado, filtros ni historial de eventos REST todavía. La generación del RIDE está desactivada por defecto; una autorización fiscal se conserva aunque falle el PDF. No hay reenvío fiscal como consecuencia de una descarga fallida.

## Recuperación del RIDE

`GET /api/v1/documents/{documentId}/ride-job` requiere el permiso de descarga y un documento de tu organización. Devuelve `state`, `attempts`, `nextAttemptAt` y `failureCategory`; responde `404` si no hay un trabajo accesible. No devuelve XML, certificados ni claves de almacenamiento.

Con la generación durable habilitada por el operador, los trabajos pueden quedar `PENDING`, `RUNNING`, `COMPLETED`, `DEAD` o `BLOCKED`. Un fallo del PDF conserva el estado fiscal `AUTHORIZED`. La recuperación administrativa solo permite reprogramar errores temporales de infraestructura; nunca retransmite al SRI.

Las peticiones API pueden responder `429` con `Retry-After` por control de tráfico, o `503` si Redis no permite verificar los límites. El procesamiento previamente persistido no depende de Redis. Al repetir una creación de factura, conserva su `Idempotency-Key`.
