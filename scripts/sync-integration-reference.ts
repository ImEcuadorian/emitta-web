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
