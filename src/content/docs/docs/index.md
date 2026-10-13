---
title: Integra Emitta en tu aplicación
description: Una guía para autenticar tu aplicación, crear facturas y consultar sus resultados.
---
Emitta conecta tu sistema con la facturación electrónica de Ecuador mediante una API REST. Esta documentación está dirigida a quienes integran la API en su software.

## Empieza por aquí

1. **Recibe tu acceso:** el responsable de Emitta prepara tu cuenta y te entrega las credenciales y el identificador de tu punto de emisión. No necesitas crear tenants ni configurar certificados desde tu integración.
2. **Obtén un token:** usa tus credenciales para identificar tu aplicación.
3. **Crea una factura:** envía el comprador, los productos, impuestos y pagos.
4. **Consulta el resultado:** guarda el identificador recibido y consulta su estado. Descarga XML y PDF cuando estén disponibles.

[Seguir la guía paso a paso →](/docs/quickstart/)

## Qué guía necesitas

| Quiero… | Ir a… |
| --- | --- |
| Hacer mi primera integración | [Primeros pasos](/docs/quickstart/) |
| Obtener y renovar un token | [Autenticación](/docs/authentication/) |
| Entender todos los datos de una factura | [Crear facturas](/docs/invoices/) |
| Consultar el estado y descargar archivos | [Documentos y descargas](/docs/documents/) |
| Revisar modelos y respuestas exactas | [Referencia API](/docs/api-reference/) |

## Entorno disponible

La API de pruebas está en `https://api-emitta.nexorf.dev`. El acceso se entrega de forma privada; no hay autorregistro público.

**En este staging, la firma y el procesamiento fiscal automático están apagados.** Crear una factura permite comprobar su aceptación y persistencia, pero no produce por sí solo una factura autorizada por el SRI. Una respuesta `202` significa «solicitud guardada», no «factura autorizada».

Todavía no hay webhooks ni envío de facturas por correo. Consulta el estado con la API. Las tareas de alta y certificados corresponden al responsable de Emitta y están separadas de esta guía.
