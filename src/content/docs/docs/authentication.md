---
title: Autenticación
description: Cómo identificar tu aplicación y usar su token de acceso.
---
Tu aplicación recibe un **identificador** (`clientId`) y un **secreto** (`clientSecret`). El responsable de Emitta te los entrega por un canal privado. No hay registro público y ningún cliente puede concederse permisos administrativos.

## Solicita el token

Envía tus credenciales a `POST /api/v1/auth/token`:

```json
{
  "clientId": "demo-client",
  "clientSecret": "EXAMPLE_ONLY_NOT_A_SECRET"
}
```

La respuesta contiene `accessToken`, `tokenType` y `expiresIn`. Usa el token en las solicitudes protegidas:

```http
Authorization: Bearer TOKEN_DE_ACCESO
```

## Renueva el acceso

Cuando el token expire, solicita otro con las mismas credenciales. Si recibes `401`, revisa si ha caducado o si el responsable revocó tu acceso. Si recibes `403`, tu aplicación no tiene permiso para esa operación: pide una revisión al responsable.

## Qué acceso recibes

El perfil de integración permite crear facturas, consultar sus resultados y descargar los archivos disponibles. No necesitas elegir permisos técnicos para empezar ni enviar el identificador de la organización: Emitta lo obtiene del token y comprueba que los recursos le pertenecen.

<details>
<summary>Detalle técnico para integraciones avanzadas</summary>

Los permisos se llaman scopes: `invoices:write`, `documents:read` y `artifacts:read`. Los asigna el responsable. El token es un JWT firmado con RS256; la API verifica firma, emisor, audiencia, vigencia y acceso activo. La rotación del secreto no invalida los tokens ya emitidos; revocar la aplicación bloquea su validación posterior.

</details>

## Guarda las credenciales de forma segura

Utiliza HTTPS y conserva el secreto en tu servidor o gestor de secretos. No lo incluyas en URLs, repositorios, capturas ni código enviado al navegador. No compartas credenciales administrativas con una integración.

Si recibes `429`, respeta `Retry-After`. Los límites protegen el servicio frente a exceso de tráfico; no son cuotas comerciales. Un fallo del control de tráfico puede responder `503`.
