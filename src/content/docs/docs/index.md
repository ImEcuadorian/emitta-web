---
title: Cómo integrar Emitta
description: El recorrido completo de tu aplicación, desde las credenciales hasta el XML y PDF.
---
Emitta es una API para conectar tu sistema de ventas con la facturación electrónica de Ecuador. **Tu desarrollador integra los endpoints una vez; la persona que vende utiliza tu sistema, no necesita conocer URLs ni UUID.**

## Qué recibes y qué construyes

Recibes de Emitta un `clientId` y un `clientSecret`, entregados de forma privada. Con ellos, el servidor de tu aplicación obtiene un token y realiza las operaciones de esta guía. No necesitas entrar al panel del dueño ni crear tenants.

Tu aplicación debe ofrecer dos recorridos:

- **Configuración del negocio:** registrar RUC, direcciones, locales y puntos; cargar el certificado y consultar su vigencia. Se hace al comenzar y cuando cambie el certificado o se añadan puntos.
- **Facturación diaria:** enviar una venta, consultar su estado y ofrecer la descarga del XML y PDF disponibles.

## Endpoints en el orden de integración

Base del ambiente de pruebas: `https://api-emitta.nexorf.dev`. Añade a esa base las rutas de esta tabla.

| Cuándo | Operación | Para qué sirve |
| --- | --- | --- |
| Al iniciar y al vencer el token | `POST /api/v1/auth/token` | Obtener acceso con tu identificador y secreto. |
| Configuración inicial | `POST /api/v1/fiscal-configuration` | Registrar emisor, establecimiento y punto. Devuelve sus UUID. |
| Al elegir local/caja | `GET /api/v1/fiscal-configuration` | Relacionar códigos como `001-002` con su `pointOfIssueId`. |
| Al cargar un certificado | `POST /api/v1/taxpayers/{taxpayerId}/certificates` | Validar e importar el archivo y su contraseña por HTTPS. |
| Para revisar vigencia | `GET /api/v1/taxpayers/{taxpayerId}/certificates` | Consultar metadatos, sin recuperar el archivo ni la contraseña. |
| Por cada venta | `POST /api/v1/invoices` | Guardar una factura y obtener su `id`. |
| Después de crearla | `GET /api/v1/documents/{documentId}` | Consultar firma y autorización. |
| Con autorización y archivo disponible | `GET /api/v1/documents/{documentId}/artifacts/{type}` | Descargar `authorized-xml` o `ride-pdf`. |
| Si el PDF sigue pendiente | `GET /api/v1/documents/{documentId}/ride-job` | Consultar el trabajo de generación, cuando existe. |

**No necesitas implementar endpoints administrativos.** Los permisos de tu aplicación se asignan al entregarte el acceso y sólo permiten trabajar con tus propios recursos.

[Empezar la integración paso a paso →](/docs/quickstart/)

## Qué hace Emitta

La API valida y guarda las solicitudes, asigna identificadores y secuenciales y controla duplicados. Cuando el procesamiento está habilitado, el backend genera y firma el XML, comunica con el SRI y genera el RIDE tras autorización verificada. Tu aplicación consulta el resultado; no llama directamente al SRI.

## Alcance actual de TEST

El procesamiento fiscal automático está apagado en staging. Puedes comprobar configuración, autenticación y aceptación de solicitudes, pero una factura nueva puede permanecer en `QUEUED`. **HTTP `202` significa guardada; no significa autorizada ni garantiza un PDF inmediato.** Coordina una prueba fiscal controlada con el responsable antes de esperar el recorrido completo.

No hay webhooks, envío de documentos por correo ni autorregistro. El PDF es la representación RIDE; la firma digital está en el XML.

## Consultar un tema

- [Autenticación y permisos](/docs/authentication/)
- [Configurar negocio y certificado](/docs/fiscal-setup/)
- [Campos y ejemplo de factura](/docs/invoices/)
- [Estados, XML y PDF](/docs/documents/)
- [Referencia exacta de la API](/docs/api-reference/)
