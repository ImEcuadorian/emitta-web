# Emitta Web — frontend del proyecto de APIs

**Emitta** es la web pública, documentación para integradores y panel restringido del proyecto académico de facturación electrónica para Ecuador.

- Sitio STAGING: https://emitta.nexorf.dev
- API STAGING: https://api-emitta.nexorf.dev
- Backend: https://github.com/ImEcuadorian/emitta
- Entregables UPS RA1–RA4: https://github.com/ImEcuadorian/emitta/tree/main/docs/academic

## Tecnologías

Astro 7 + TypeScript, Starlight, Scalar y Nginx estático. El contrato publicado para **integradores** es una selección de operaciones; el backend contiene además un contrato administrativo completo y protegido.

## Comandos locales

~~~powershell
npm ci
npm run check
npm run build
npm run check:links
npm run test:admin
npm run dev
~~~

Dev: http://localhost:4321; salida de build: dist/. No ejecutar solicitudes fiscales reales desde las pruebas del frontend.

## Características demostrables

- Landing orientada a POS/ERP/SaaS.
- Guía para token JWT de aplicaciones, POST de factura TEST y GET de estado/descargas.
- Documentación OpenAPI navegable con operaciones interactivas desactivadas.
- Panel reservado al operador (la separación y autenticación vigente deben verificarse en el despliegue de demostración).
- Integración web con API staging mediante HTTPS.
- Flujo fiscal TEST ejecutado en una prueba manual y autorizada según informe de operación; los automatismos continúan apagados. No es un servicio comercial ni se garantiza autorización ante cualquier POST.

## Límites importantes

La aplicación cliente no es lo mismo que una persona que recibe una factura. Un HTTP 202 significa persistencia, no autorización SRI. No hay producción fiscal, autoservicio comercial, planes cobrados, webhooks ni envío automático de correo.

**Versionado:** rama académica creada a partir de codex/ride-consolidation publicada hasta el 14-10-2026. Antes de enviar la entrega del 29-10, sincronizar cualquier trabajo local y verificar que lo ejecutado en staging coincide con un commit de GitHub. No subir credenciales, P12, tokens ni comprobantes privados.

## Despliegue

La publicación del sitio estático en el servidor Nexorf/Cloudflare Tunnel fue documentada en el backend. El build por GitHub Actions verifica el frontend, **no despliega automáticamente**. El destino staging se actualiza únicamente mediante el procedimiento autorizado del operador.

No habilitar SRI PRODUCCIÓN.
