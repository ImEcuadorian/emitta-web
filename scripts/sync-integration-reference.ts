import { readFileSync, writeFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';

const specification = parse(readFileSync('specifications/emitta-v1.yaml', 'utf8'));
const allowed = [
  '/api/v1/auth/token', '/api/v1/invoices', '/api/v1/documents/{documentId}',
  '/api/v1/documents/{documentId}/artifacts/{type}', '/api/v1/documents/{documentId}/ride-job',
  '/api/v1/fiscal-configuration', '/api/v1/taxpayers/{taxpayerId}/certificates',
];
for (const path of allowed) if (!specification.paths[path]) throw new Error(`Missing backend path: ${path}`);
specification.paths = Object.fromEntries(allowed.map(path => [path, specification.paths[path]]));
specification.tags = specification.tags.filter((tag: {name:string}) => tag.name !== 'Administration');
// Presentation only: preserve paths, parameters, schemas, security and responses from the backend.
specification.info.title = 'Emitta · API para integrar tu aplicación';
specification.info.description = `Empieza por la [guía paso a paso](https://emitta.nexorf.dev/docs/quickstart/). Esta referencia es un catálogo de campos y respuestas, no un panel para clientes.

Base TEST: https://api-emitta.nexorf.dev. Obtén un token con clientId/clientSecret; usa Authorization: Bearer en las operaciones protegidas. No envíes el UUID de tenant.

Orden: autenticación → negocio y puntos → certificado → factura → estado → XML/PDF. Los UUID los devuelve la API. Conserva el id de la factura como documentId.

El procesamiento fiscal automático está apagado en staging. HTTP 202 sólo confirma persistencia. No hay webhooks ni registro público. Las solicitudes interactivas están deshabilitadas para evitar operaciones accidentales.`;
const groups: Record<string,string> = {
 '/api/v1/auth/token':'1. Obtener acceso',
 '/api/v1/fiscal-configuration':'2. Configurar negocio y puntos',
 '/api/v1/taxpayers/{taxpayerId}/certificates':'3. Gestionar el certificado',
 '/api/v1/invoices':'4. Crear una factura',
 '/api/v1/documents/{documentId}':'5. Consultar y descargar',
 '/api/v1/documents/{documentId}/artifacts/{type}':'5. Consultar y descargar',
 '/api/v1/documents/{documentId}/ride-job':'5. Consultar y descargar',
};
const titles: Record<string,string> = {
 'post /api/v1/auth/token':'Obtener un token',
 'post /api/v1/fiscal-configuration':'Registrar emisor, local y punto',
 'get /api/v1/fiscal-configuration':'Consultar códigos y UUID de mis puntos',
 'post /api/v1/taxpayers/{taxpayerId}/certificates':'Importar el certificado del negocio',
 'get /api/v1/taxpayers/{taxpayerId}/certificates':'Consultar estado y vigencia del certificado',
 'post /api/v1/invoices':'Crear una factura y obtener su documentId',
 'get /api/v1/documents/{documentId}':'Consultar el estado de una factura',
 'get /api/v1/documents/{documentId}/artifacts/{type}':'Descargar XML autorizado o PDF RIDE',
 'get /api/v1/documents/{documentId}/ride-job':'Consultar la generación del PDF',
};
specification.paths = Object.fromEntries(Object.keys(groups).map(path=>[path,specification.paths[path]]));
specification.tags = [...new Set(Object.values(groups))].map(name=>({name}));
for(const [path, operations] of Object.entries(specification.paths)){
 for(const [method, operation] of Object.entries(operations as Record<string,unknown>)){
  if(!titles[method+' '+path])continue;
  const presentation=operation as Record<string,unknown>;
  presentation.tags=[groups[path]];presentation.summary=titles[method+' '+path];
 }
}
// Keep only schemas reachable from the integration operations; preserve their exact backend definitions.
const reachable = new Set<string>();
function visit(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key === '$ref' && typeof child === 'string' && child.startsWith('#/components/schemas/')) {
      const name = child.slice('#/components/schemas/'.length);
      if (!reachable.has(name)) { reachable.add(name); visit(specification.components.schemas[name]); }
    } else visit(child);
  }
}
visit(specification.paths);
specification.components.schemas = Object.fromEntries([...reachable].map(name => [name, specification.components.schemas[name]]));
writeFileSync('public/openapi/emitta-integration-v1.yaml', stringify(specification));
console.log(`Generated integration reference: ${allowed.length} existing backend routes.`);
